const Payment = require('../models/Payment')
const Order = require('../models/Order')

const createPayment = async (req, res) => {
    try {
        const { orderId, amount, paymentMethod, transactionId, notes } = req.body

        if (!orderId || !amount) {
            return res.status(400).json({ message: 'orderId and amount are required.' })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: cannot pay for this order' })
        }

        const payment = await Payment.create({
            orderId,
            userId: order.userId,
            amount: Number(amount),
            paymentMethod: paymentMethod || 'card',
            transactionId: transactionId || '',
            notes: notes || '',
            status: 'pending'
        })

        order.status = 'payment_pending'
        await order.save()

        return res.status(201).json({ message: 'Payment started', payment })
    } catch (error) {
        console.error('Error creating payment:', error)
        return res.status(500).json({ message: 'Server error creating payment' })
    }
}

const confirmPayment = async (req, res) => {
    try {
        const { id } = req.params
        const payment = await Payment.findById(id)

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' })
        }

        const order = await Order.findById(payment.orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found for this payment' })
        }

        payment.status = 'paid'
        order.status = 'paid'
        order.finalPrice = payment.amount

        await payment.save()
        await order.save()

        return res.json({ message: 'Payment confirmed successfully', payment, order })
    } catch (error) {
        console.error('Error confirming payment:', error)
        return res.status(500).json({ message: 'Server error confirming payment' })
    }
}

const getPaymentsForOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        const payments = await Payment.find({ orderId }).sort({ createdAt: -1 })
        return res.json(payments)
    } catch (error) {
        console.error('Error fetching payments:', error)
        return res.status(500).json({ message: 'Server error fetching payments' })
    }
}

module.exports = {
    createPayment,
    confirmPayment,
    getPaymentsForOrder
}
