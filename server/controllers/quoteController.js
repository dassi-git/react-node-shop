const Quote = require('../models/Quote')
const Order = require('../models/Order')

const createQuote = async (req, res) => {
    try {
        const { orderId, quotePrice, deliveryFee, depositAmount, notes, validUntil } = req.body

        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required.' })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }
        if (!Number.isFinite(Number(quotePrice)) || Number(quotePrice) < 0 || Number(quotePrice) > 100000) {
            return res.status(400).json({ message: 'Quote price must be a valid non-negative amount.' })
        }
        if (!Number.isFinite(Number(deliveryFee || 0)) || Number(deliveryFee || 0) < 0 || Number(deliveryFee || 0) > 100000) {
            return res.status(400).json({ message: 'Delivery fee must be a valid non-negative amount.' })
        }
        if (!Number.isFinite(Number(depositAmount || 0)) || Number(depositAmount || 0) < 0 || Number(depositAmount || 0) > Number(quotePrice)) {
            return res.status(400).json({ message: 'Deposit must be between zero and the quote price.' })
        }

        const quote = await Quote.create({
            orderId,
            adminId: req.user._id,
            quotePrice: Number(quotePrice || 0),
            deliveryFee: Number(deliveryFee || 0),
            depositAmount: Number(depositAmount || 0),
            notes: notes || '',
            validUntil: validUntil || null,
            status: 'sent'
        })

        order.quote = quote._id
        order.deliveryFee = Number(deliveryFee || order.deliveryFee || 0)
        order.finalPrice = Number(quotePrice || 0) + Number(deliveryFee || 0)
        order.status = 'quote_sent'
        await order.save()

        return res.status(201).json({ message: 'Quote sent successfully', quote, order })
    } catch (error) {
        console.error('Error creating quote:', error)
        return res.status(500).json({ message: 'Server error creating quote' })
    }
}

const getQuotesForOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
        if (!order) return res.status(404).json({ message: 'Order not found' })
        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot view these quotes' })
        }
        const quotes = await Quote.find({ orderId }).sort({ createdAt: -1 })
        return res.json(quotes)
    } catch (error) {
        console.error('Error fetching quotes:', error)
        return res.status(500).json({ message: 'Server error fetching quotes' })
    }
}

const acceptQuote = async (req, res) => {
    try {
        const { id } = req.params
        const quote = await Quote.findById(id)
        if (!quote) {
            return res.status(404).json({ message: 'Quote not found' })
        }

        const order = await Order.findById(quote.orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found for this quote' })
        }

        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot accept this quote' })
        }
        if (quote.status !== 'sent' || (quote.validUntil && quote.validUntil < new Date())) {
            return res.status(400).json({ message: 'This quote is no longer available.' })
        }

        quote.status = 'accepted'
        order.status = 'quote_accepted'

        await quote.save()
        await order.save()

        return res.json({ message: 'Quote accepted', quote, order })
    } catch (error) {
        console.error('Error accepting quote:', error)
        return res.status(500).json({ message: 'Server error accepting quote' })
    }
}

const rejectQuote = async (req, res) => {
    try {
        const { id } = req.params
        const quote = await Quote.findById(id)
        if (!quote) {
            return res.status(404).json({ message: 'Quote not found' })
        }

        const order = await Order.findById(quote.orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found for this quote' })
        }

        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot reject this quote' })
        }
        if (quote.status !== 'sent') {
            return res.status(400).json({ message: 'This quote is no longer available.' })
        }

        quote.status = 'rejected'
        order.status = 'quote_rejected'

        await quote.save()
        await order.save()

        return res.json({ message: 'Quote rejected', quote, order })
    } catch (error) {
        console.error('Error rejecting quote:', error)
        return res.status(500).json({ message: 'Server error rejecting quote' })
    }
}

module.exports = {
    createQuote,
    getQuotesForOrder,
    acceptQuote,
    rejectQuote
}
