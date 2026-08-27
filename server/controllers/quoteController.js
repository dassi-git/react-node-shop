const Quote = require('../models/Quote')
const Order = require('../models/Order')
const mongoose = require('mongoose')

const createQuote = async (req, res) => {
    try {
        const { orderId, quotePrice, deliveryFee, depositAmount, notes, validUntil } = req.body

        if (!orderId) {
            return res.status(400).json({ message: 'Order ID is required.' })
        }
        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID.' })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }
        if (!['quote_requested', 'quote_rejected'].includes(order.status)) {
            return res.status(400).json({ message: 'A quote cannot be created for this order status.' })
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
        if (notes !== undefined && String(notes).length > 2000) {
            return res.status(400).json({ message: 'Quote notes are too long.' })
        }

        let normalizedValidUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        if (validUntil !== undefined && validUntil !== null) {
            normalizedValidUntil = new Date(validUntil)
            if (Number.isNaN(normalizedValidUntil.getTime()) || normalizedValidUntil <= new Date()) {
                return res.status(400).json({ message: 'Quote expiration date must be valid and in the future.' })
            }
        }

        const session = await mongoose.startSession()
        let quote
        try {
            await session.withTransaction(async () => {
                const createdQuotes = await Quote.create([{
                    orderId,
                    adminId: req.user._id,
                    quotePrice: Number(quotePrice || 0),
                    deliveryFee: Number(deliveryFee || 0),
                    depositAmount: Number(depositAmount || 0),
                    notes: String(notes || '').trim(),
                    validUntil: normalizedValidUntil,
                    status: 'sent'
                }], { session })
                quote = createdQuotes[0]

                order.quote = quote._id
                order.deliveryFee = Number(deliveryFee || order.deliveryFee || 0)
                order.finalPrice = Number(quotePrice || 0) + Number(deliveryFee || 0)
                order.status = 'quote_sent'
                order.statusHistory.push({ status: 'quote_sent', changedBy: req.user._id, changedAt: new Date() })
                await order.save({ session })
            })
        } finally {
            await session.endSession()
        }

        return res.status(201).json({ message: 'Quote sent successfully', quote, order })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'An active quote already exists for this order.' })
        }
        console.error('Error creating quote:', error)
        return res.status(500).json({ message: 'Server error creating quote' })
    }
}

const getQuotesForOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Invalid order ID' })
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
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid quote ID' })
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

        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                quote.status = 'accepted'
                order.status = 'quote_accepted'
                order.statusHistory.push({ status: 'quote_accepted', changedBy: req.user._id, changedAt: new Date() })
                await quote.save({ session })
                await order.save({ session })
            })
        } finally {
            await session.endSession()
        }

        return res.json({ message: 'Quote accepted', quote, order })
    } catch (error) {
        console.error('Error accepting quote:', error)
        return res.status(500).json({ message: 'Server error accepting quote' })
    }
}

const rejectQuote = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid quote ID' })
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

        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                quote.status = 'rejected'
                order.status = 'quote_rejected'
                order.statusHistory.push({ status: 'quote_rejected', changedBy: req.user._id, changedAt: new Date() })
                await quote.save({ session })
                await order.save({ session })
            })
        } finally {
            await session.endSession()
        }

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
