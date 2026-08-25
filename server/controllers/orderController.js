const Order = require('../models/Order')
const Quote = require('../models/Quote')

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

        const normalizedItems = items.map((item) => {
            const quantity = Number(item.quantity || 1)
            const unitPrice = Number(item.unitPrice || 0)
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                throw new Error('Quantity must be a whole number between 1 and 100.')
            }
            if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100000) {
                throw new Error('Unit price must be a valid non-negative amount.')
            }
            const totalPrice = unitPrice * quantity

            return {
                productId: item.productId,
                productName: item.productName || 'Custom fruit arrangement',
                quantity,
                selectedOptions: item.selectedOptions || {},
                customNotes: item.customNotes || '',
                unitPrice,
                totalPrice
            }
        })

        const subtotal = normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
        const fee = Number(deliveryFee || 0)
        if (!Number.isFinite(fee) || fee < 0 || fee > 100000) {
            return res.status(400).json({ message: 'Delivery fee must be a valid non-negative amount.' })
        }
        const totalPrice = subtotal + fee

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
    } catch (error) {
        console.error('Error creating order:', error)
        if (error.message.includes('Quantity must') || error.message.includes('Unit price must')) {
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
