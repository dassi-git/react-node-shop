const Order = require('../models/Order')
const Quote = require('../models/Quote')
const Product = require('../models/Product')
const mongoose = require('mongoose')

const generateOrderNumber = () => {
    const date = new Date()
    const stamp = date.getTime().toString().slice(-8)
    return `ORD-${stamp}`
}

const createOrder = async (req, res) => {
    try {
        const { items, deliveryDate, deliveryAddress, notes, deliveryFee } = req.body

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'At least one item is required.' })
        }

        const normalizedItems = await Promise.all(items.map(async (item) => {
            const quantity = Number(item.quantity || 1)
            const isProductId = mongoose.isValidObjectId(item.productId)
            const product = isProductId ? await Product.findById(item.productId).lean() : null
            if (isProductId && !product) throw new Error('Product no longer exists.')
            if (product && product.inventoryStatus === 'OUTOFSTOCK') throw new Error(`${product.name} is out of stock.`)
            if (product && quantity > product.quantity) throw new Error(`${product.name} does not have enough stock.`)
            const unitPrice = product ? Number(product.price) : Number(item.unitPrice || 0)
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                throw new Error('Quantity must be a whole number between 1 and 100.')
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) {
                throw new Error('Unit price must be a valid non-negative amount.')
            }
            const totalPrice = unitPrice * quantity

            return {
                productId: item.productId,
                productName: product?.name || item.productName || 'Custom fruit arrangement',
                quantity,
                selectedOptions: item.selectedOptions || {},
                customNotes: item.customNotes || '',
                unitPrice,
                totalPrice
            }
        }))

        const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
        const fee = Number(deliveryFee || 0)
        if (!Number.isFinite(fee) || fee < 0 || fee > 100000) {
            return res.status(400).json({ message: 'Delivery fee must be a valid non-negative amount.' })
        }
        const totalPrice = subtotal + fee

        const productItems = normalizedItems.filter((item) => mongoose.isValidObjectId(item.productId))
        const reservedItems = []
        try {
            for (const item of productItems) {
                const reserved = await Product.findOneAndUpdate(
                    { _id: item.productId, quantity: { $gte: item.quantity }, inventoryStatus: { $ne: 'OUTOFSTOCK' } },
                    { $inc: { quantity: -item.quantity } },
                    { new: true }
                )
                if (!reserved) throw new Error(`${item.productName} does not have enough stock.`)
                reservedItems.push(item)
                if (reserved.quantity === 0) {
                    await Product.findByIdAndUpdate(item.productId, { inventoryStatus: 'OUTOFSTOCK', productExist: 'OUTOFSTOCK' })
                }
            }

            const order = await Order.create({
            userId: req.user._id,
            orderNumber: generateOrderNumber(),
            status: 'quote_requested',
            subtotal,
            deliveryFee: fee,
            totalPrice,
            finalPrice: totalPrice,
            deliveryDate: deliveryDate || null,
            deliveryAddress: deliveryAddress || {},
            notes: notes || '',
                items: normalizedItems
            })

            return res.status(201).json({ message: 'Order created successfully', order })
        } catch (reservationError) {
            for (const reservedItem of reservedItems) {
                await Product.findByIdAndUpdate(reservedItem.productId, {
                    $inc: { quantity: reservedItem.quantity },
                    inventoryStatus: 'INSTOCK',
                    productExist: 'INSTOCK'
                })
            }
            throw reservationError
        }
    } catch (error) {
        console.error('Error creating order:', error)
        if (error.message.includes('Quantity must') || error.message.includes('Unit price must') || error.message.includes('Product no longer') || error.message.includes('out of stock') || error.message.includes('does not have enough stock')) {
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

        const order = await Order.findById(id)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (order.status === 'completed' || order.status === 'cancelled') {
            return res.status(400).json({ message: 'Completed or cancelled orders cannot be changed.' })
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
        const order = await Order.findById(id).populate('quote')

        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot approve this order' })
        }

        const quote = await Quote.findById(order.quote)
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
