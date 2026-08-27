const Order = require('../models/Order')
const Quote = require('../models/Quote')
const Product = require('../models/Product')
const Payment = require('../models/Payment')
const Basket = require('../models/Basket')
const mongoose = require('mongoose')
const { resolveSeasonalSelections } = require('../services/fruitSeasonService')

const ORDER_STATUS_TRANSITIONS = {
    draft: ['quote_requested', 'cancelled'],
    quote_requested: ['quote_sent', 'cancelled'],
    quote_sent: ['quote_accepted', 'quote_rejected', 'cancelled'],
    quote_accepted: ['payment_pending', 'cancelled'],
    quote_rejected: ['quote_requested', 'cancelled'],
    payment_pending: ['paid', 'cancelled'],
    paid: ['confirmed'],
    confirmed: ['preparing'],
    preparing: ['ready_for_delivery'],
    ready_for_delivery: ['in_delivery'],
    in_delivery: ['completed'],
    completed: [],
    cancelled: []
}

const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase()
    const entropy = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `ORD-${timestamp}-${entropy}`
}

const resolveSelectedOptions = (product, selectedOptions = {}) => {
    const normalized = {}
    let adjustment = 0
    for (const option of product.customizationOptions || []) {
        const selected = Array.isArray(selectedOptions[option.name]) ? selectedOptions[option.name] : (selectedOptions[option.name] ? [selectedOptions[option.name]] : [])
        if (option.required && selected.length === 0) throw new Error(`יש לבחור ${option.name}`)
        if (option.selectionType === 'single' && selected.length > 1) throw new Error(`ניתן לבחור ערך אחד בלבד ב-${option.name}`)
        if (option.maxSelections && selected.length > option.maxSelections) throw new Error(`ניתן לבחור עד ${option.maxSelections} אפשרויות ב-${option.name}`)
        const values = selected.map((value) => option.values.find((item) => item.value === value && item.active !== false))
        if (values.some((value) => !value)) throw new Error(`בחירה לא זמינה ב-${option.name}`)
        normalized[option.name] = option.selectionType === 'single' ? (selected[0] || '') : selected
        adjustment += values.reduce((sum, value) => sum + Number(value?.priceAdjustment || 0), 0)
        if (option.selectionType === 'multiple' && selected.length > 1) adjustment += (selected.length - 1) * Number(option.additionalSelectionPrice || 0)
    }
    return { selectedOptions: normalized, adjustment }
}

const createOrder = async (req, res) => {
    try {
        const { deliveryDate, deliveryAddress, notes } = req.body

        const address = deliveryAddress || {}
        if (!address || typeof address !== 'object' || !String(address.city || '').trim() || !String(address.street || '').trim()) {
            return res.status(400).json({ message: 'Delivery city and street are required.' })
        }
        if (deliveryDate !== undefined && deliveryDate !== null) {
            const parsedDeliveryDate = new Date(deliveryDate)
            if (Number.isNaN(parsedDeliveryDate.getTime())) {
                return res.status(400).json({ message: 'Delivery date is invalid.' })
            }
        }
        if (notes !== undefined && String(notes).length > 2000) {
            return res.status(400).json({ message: 'Order notes are too long.' })
        }

        const basket = await Basket.findOne({ userId: req.user._id }).populate('Products.type').lean()
        if (!basket || !Array.isArray(basket.Products) || basket.Products.length === 0) {
            return res.status(400).json({ message: 'At least one item is required.' })
        }
        if (basket.Products.length > 50 || basket.Products.some((item) => !item?.type)) {
            return res.status(400).json({ message: 'Order items are invalid.' })
        }

        const normalizedItems = await Promise.all(basket.Products.map(async (basketItem) => {
            const product = basketItem.type
            const quantity = Number(basketItem.quantity || 1)
            if (product && (product.inventoryStatus === 'OUTOFSTOCK' || product.productExist === 'OUTOFSTOCK')) throw new Error(`${product.name} is out of stock.`)
            if (product && quantity > product.quantity) throw new Error(`${product.name} does not have enough stock.`)
            let selectedOptions = basketItem.selectedOptions || {}
            let optionAdjustment = 0
            if (product) {
                const resolved = resolveSelectedOptions(product, selectedOptions)
                selectedOptions = resolved.selectedOptions
                optionAdjustment = resolved.adjustment
                const seasonal = await resolveSeasonalSelections(product, selectedOptions, deliveryDate || new Date())
                optionAdjustment += seasonal.adjustment
                var seasonalSnapshot = seasonal.snapshots
            }
            const unitPrice = Number(product.price) + optionAdjustment
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                throw new Error('Quantity must be a whole number between 1 and 100.')
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) {
                throw new Error('Unit price must be a valid non-negative amount.')
            }
            const totalPrice = unitPrice * quantity

            return {
                productId: product._id,
                productName: product.name,
                quantity,
                selectedOptions,
                seasonalSnapshot: seasonalSnapshot || [],
                customNotes: '',
                unitPrice,
                totalPrice
            }
        }))

        const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
        const fee = 0
        const totalPrice = subtotal + fee

        const session = await mongoose.startSession()
        let createdOrder
        try {
            await session.withTransaction(async () => {
                for (const item of normalizedItems.filter((entry) => mongoose.isValidObjectId(entry.productId))) {
                    const reserved = await Product.findOneAndUpdate(
                        { _id: item.productId, quantity: { $gte: item.quantity }, inventoryStatus: { $ne: 'OUTOFSTOCK' }, productExist: { $ne: 'OUTOFSTOCK' } },
                        { $inc: { quantity: -item.quantity } },
                        { new: true, session }
                    )
                    if (!reserved) throw new Error(`${item.productName} does not have enough stock.`)
                    if (reserved.quantity === 0) {
                        await Product.findByIdAndUpdate(item.productId, { inventoryStatus: 'OUTOFSTOCK', productExist: 'OUTOFSTOCK' }, { session })
                    }
                }

                const [order] = await Order.create([{
                    userId: req.user._id,
                    orderNumber: generateOrderNumber(),
                    status: 'quote_requested',
                    subtotal,
                    deliveryFee: fee,
                    totalPrice,
                    finalPrice: totalPrice,
                    deliveryDate: deliveryDate || null,
                    deliveryAddress: {
                        city: String(address.city).trim(),
                        street: String(address.street).trim(),
                        zipCode: String(address.zipCode || '').trim(),
                        phone: String(address.phone || '').trim()
                    },
                    notes: String(notes || '').trim(),
                    items: normalizedItems
                }], { session })
                await Basket.updateOne({ _id: basket._id }, { $set: { Products: [] } }, { session })
                createdOrder = order
            })
        } finally {
            await session.endSession()
        }

        return res.status(201).json({ message: 'Order created successfully', order: createdOrder })
    } catch (error) {
        console.error('Error creating order:', error)
        if (error.message.includes('Quantity must') || error.message.includes('Unit price must') || error.message.includes('Product no longer') || error.message.includes('out of stock') || error.message.includes('does not have enough stock') || error.message.includes('יש לבחור') || error.message.includes('בחירה לא זמינה') || error.message.includes('ניתן לבחור ערך')) {
            return res.status(400).json({ message: error.message })
        }
        return res.status(500).json({ message: 'Server error creating order' })
    }
}

const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('quote')

        return res.json(orders)
    } catch (error) {
        console.error('Error fetching user orders:', error)
        return res.status(500).json({ message: 'Server error fetching user orders' })
    }
}

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('quote')
            .populate('userId', 'name email phone')

        return res.json(orders)
    } catch (error) {
        console.error('Error fetching all orders:', error)
        return res.status(500).json({ message: 'Server error fetching all orders' })
    }
}

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid order ID' })
        }
        const order = await Order.findById(id).populate('quote').populate('userId', 'name email phone')

        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (req.user.role !== 'Admin' && order.userId?._id?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: you cannot access this order' })
        }

        return res.json(order)
    } catch (error) {
        console.error('Error fetching order by ID:', error)
        return res.status(500).json({ message: 'Server error fetching order' })
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid order ID' })
        }

        const allowedStatuses = [
            'draft',
            'quote_requested',
            'quote_sent',
            'quote_accepted',
            'quote_rejected',
            'payment_pending',
            'paid',
            'confirmed',
            'preparing',
            'ready_for_delivery',
            'in_delivery',
            'completed',
            'cancelled'
        ]

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid order status' })
        }

        const order = await Order.findById(id).populate('quote')
        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (!ORDER_STATUS_TRANSITIONS[order.status]?.includes(status)) {
            return res.status(400).json({ message: `Invalid status transition from ${order.status} to ${status}.` })
        }
        if (status === 'quote_accepted' && (!order.quote || order.quote.status !== 'accepted')) {
            return res.status(400).json({ message: 'An accepted quote is required before this status.' })
        }
        if (status === 'paid') {
            const paidPayment = await Payment.exists({ orderId: order._id, status: 'paid' })
            if (!paidPayment) return res.status(400).json({ message: 'A confirmed payment is required before this status.' })
        }

        order.status = status
        await order.save()

        return res.json({ message: 'Order status updated', order })
    } catch (error) {
        console.error('Error updating order status:', error)
        return res.status(500).json({ message: 'Server error updating order status' })
    }
}

const acceptQuote = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid order ID' })
        }
        const order = await Order.findById(id).populate('quote')

        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot approve this order' })
        }

        const quote = await Quote.findById(order.quote?._id || order.quote)
        if (!quote) {
            return res.status(404).json({ message: 'No quote exists for this order' })
        }
        if (quote.status !== 'sent' || (quote.validUntil && quote.validUntil < new Date())) {
            return res.status(400).json({ message: 'This quote is no longer available.' })
        }

        quote.status = 'accepted'
        order.status = 'quote_accepted'

        await quote.save()
        await order.save()

        return res.json({ message: 'Quote accepted successfully', order, quote })
    } catch (error) {
        console.error('Error accepting quote:', error)
        return res.status(500).json({ message: 'Server error accepting quote' })
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    acceptQuote
}
