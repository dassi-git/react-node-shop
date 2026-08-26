const Payment = require('../models/Payment')
const Order = require('../models/Order')
const Stripe = require('stripe')
const mongoose = require('mongoose')

const getAuthorizedOrder = async (orderId, user) => {
    if (!mongoose.isValidObjectId(orderId)) return { error: { status: 400, message: 'Invalid order ID' } }
    const order = await Order.findById(orderId).populate('quote')
    if (!order) return { error: { status: 404, message: 'Order not found' } }
    if (order.userId.toString() !== user._id.toString() && user.role !== 'Admin') {
        return { error: { status: 403, message: 'Forbidden: cannot pay for this order' } }
    }
    if (!['quote_accepted', 'payment_pending'].includes(order.status)) {
        return { error: { status: 400, message: 'A quote must be accepted before payment.' } }
    }
    if (!order.quote || order.quote.status !== 'accepted') return { error: { status: 400, message: 'No accepted quote exists for this order.' } }
    const amount = Number(order.quote.depositAmount || order.finalPrice || order.totalPrice || 0)
    if (amount <= 0) return { error: { status: 400, message: 'The order has no payable amount.' } }
    return { order, amount }
}

const finishPayment = async ({ orderId, userId, amount, provider, providerPaymentId }) => {
    const session = await mongoose.startSession()
    let payment
    try {
        await session.withTransaction(async () => {
            payment = await Payment.findOneAndUpdate(
                { orderId, provider, providerPaymentId },
                { orderId, userId, amount, paymentMethod: provider === 'paypal' ? 'paypal' : 'stripe', provider, providerPaymentId, status: 'paid' },
                { new: true, upsert: true, setDefaultsOnInsert: true, session }
            )
            await Order.findByIdAndUpdate(orderId, { status: 'paid', finalPrice: amount }, { session })
        })
    } finally {
        await session.endSession()
    }
    return payment
}

const stripeWebhook = async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({ message: 'Stripe webhook is not configured.' })
    }

    try {
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
        const event = stripe.webhooks.constructEvent(
            req.body,
            req.get('stripe-signature'),
            process.env.STRIPE_WEBHOOK_SECRET
        )

        if (event.type !== 'checkout.session.completed') {
            return res.json({ received: true })
        }

        const session = event.data.object
        if (session.payment_status !== 'paid' || !session.metadata?.orderId) {
            return res.status(400).json({ message: 'Stripe session is not a completed order payment.' })
        }

        const order = await Order.findById(session.metadata.orderId).populate('quote')
        if (!order) return res.status(404).json({ message: 'Order not found.' })

        const paidAmount = Number(session.amount_total || 0) / 100
        const expectedAmount = Number(order.quote?.depositAmount || order.finalPrice || order.totalPrice || 0)
        if (Math.abs(paidAmount - expectedAmount) > 0.01) {
            return res.status(400).json({ message: 'Stripe payment amount does not match the order.' })
        }

        const payment = await finishPayment({
            orderId: order._id,
            userId: order.userId,
            amount: paidAmount,
            provider: 'stripe',
            providerPaymentId: session.id
        })
        return res.json({ received: true, paymentId: payment._id })
    } catch (error) {
        if (error.type === 'StripeSignatureVerificationError') {
            return res.status(400).json({ message: 'Invalid Stripe webhook signature.' })
        }
        console.error('Error processing Stripe webhook:', error)
        return res.status(500).json({ message: 'Unable to process Stripe webhook.' })
    }
}

const createPayment = async (req, res) => {
    try {
        const { orderId, paymentMethod, transactionId, notes } = req.body

        if (!orderId) {
            return res.status(400).json({ message: 'orderId is required.' })
        }

        const { order, error } = await getAuthorizedOrder(orderId, req.user)
        if (error) return res.status(error.status).json({ message: error.message })

        const payment = await Payment.create({
            orderId,
            userId: order.userId,
            amount: Number(order.quote.depositAmount || order.finalPrice || order.totalPrice),
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
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid payment ID' })
        }
        const payment = await Payment.findById(id)

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' })
        }

        if (payment.provider !== 'internal') {
            return res.status(400).json({ message: 'External payments must be confirmed by their provider flow.' })
        }

        if (payment.status === 'paid') {
            return res.json({ message: 'Payment is already confirmed', payment })
        }

        const order = await Order.findById(payment.orderId)
        if (!order) {
            return res.status(404).json({ message: 'Order not found for this payment' })
        }
        if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: cannot confirm this payment' })
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

const createStripeCheckout = async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to server/.env.' })
    try {
        const { order, amount, error } = await getAuthorizedOrder(req.body.orderId, req.user)
        if (error) return res.status(error.status).json({ message: error.message })
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{ price_data: { currency: 'ils', product_data: { name: `הזמנת עיצוב פירות ${order.orderNumber}` }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
            success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders?payment=cancelled`,
            metadata: { orderId: order._id.toString() }
        })
        await Payment.create({ orderId: order._id, userId: order.userId, amount, paymentMethod: 'stripe', provider: 'stripe', providerPaymentId: session.id, status: 'pending' })
        await Order.findByIdAndUpdate(order._id, { status: 'payment_pending' })
        return res.json({ url: session.url })
    } catch (error) {
        console.error('Error creating Stripe checkout:', error)
        return res.status(502).json({ message: 'Unable to start Stripe checkout' })
    }
}

const completeStripeCheckout = async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ message: 'Stripe is not configured.' })
    try {
        if (!req.params.sessionId || req.params.sessionId.length > 255) {
            return res.status(400).json({ message: 'Invalid Stripe session ID' })
        }
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId)
        if (session.payment_status !== 'paid' || !session.metadata?.orderId) return res.status(400).json({ message: 'Stripe payment is not complete.' })
        const order = await Order.findById(session.metadata.orderId).populate('quote')
        if (!order || (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString())) return res.status(403).json({ message: 'Forbidden' })
        const paidAmount = Number(session.amount_total || 0) / 100
        const expectedAmount = Number(order.quote?.depositAmount || order.finalPrice || order.totalPrice || 0)
        if (Math.abs(paidAmount - expectedAmount) > 0.01) return res.status(400).json({ message: 'Stripe payment amount does not match the order.' })
        const payment = await finishPayment({ orderId: order._id, userId: order.userId, amount: paidAmount, provider: 'stripe', providerPaymentId: session.id })
        return res.json({ message: 'Stripe payment confirmed', payment })
    } catch (error) {
        console.error('Error completing Stripe checkout:', error)
        return res.status(502).json({ message: 'Unable to confirm Stripe payment' })
    }
}

const getPaypalAccessToken = async () => {
    const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'
    const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error_description || 'PayPal authentication failed')
    return body.access_token
}

const paypalRequest = async (path, options = {}) => {
    const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'
    const accessToken = await getPaypalAccessToken()
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) } })
    const body = await response.json()
    if (!response.ok) throw new Error(body.message || 'PayPal request failed')
    return body
}

const createPaypalOrder = async (req, res) => {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return res.status(503).json({ message: 'PayPal is not configured. Add sandbox credentials to server/.env.' })
    try {
        const { order, amount, error } = await getAuthorizedOrder(req.body.orderId, req.user)
        if (error) return res.status(error.status).json({ message: error.message })
        const paypalOrder = await paypalRequest('/v2/checkout/orders', { method: 'POST', body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: order._id.toString(), amount: { currency_code: 'ILS', value: amount.toFixed(2) }, description: `הזמנה ${order.orderNumber}` }], application_context: { return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-success?provider=paypal`, cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders?payment=cancelled` } }) })
        await Payment.create({ orderId: order._id, userId: order.userId, amount, paymentMethod: 'paypal', provider: 'paypal', providerPaymentId: paypalOrder.id, status: 'pending' })
        await Order.findByIdAndUpdate(order._id, { status: 'payment_pending' })
        return res.json({ id: paypalOrder.id, url: paypalOrder.links?.find((link) => link.rel === 'approve')?.href })
    } catch (error) {
        console.error('Error creating PayPal order:', error)
        return res.status(502).json({ message: 'Unable to start PayPal checkout' })
    }
}

const capturePaypalOrder = async (req, res) => {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) return res.status(503).json({ message: 'PayPal is not configured.' })
    try {
        const paymentRecord = await Payment.findOne({ provider: 'paypal', providerPaymentId: req.params.orderId })
        if (!paymentRecord || (req.user.role !== 'Admin' && paymentRecord.userId.toString() !== req.user._id.toString())) {
            return res.status(403).json({ message: 'Forbidden' })
        }

        if (paymentRecord.status === 'paid') {
            return res.json({ message: 'PayPal payment is already confirmed', payment: paymentRecord })
        }

        const paypalOrder = await paypalRequest(`/v2/checkout/orders/${req.params.orderId}/capture`, { method: 'POST', body: '{}' })
        if (paypalOrder.status !== 'COMPLETED') return res.status(400).json({ message: 'PayPal payment is not complete.' })
        if (paypalOrder.id !== paymentRecord.providerPaymentId) return res.status(400).json({ message: 'PayPal order ID mismatch.' })
        const capturedAmount = Number(paypalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
        if (Math.abs(capturedAmount - paymentRecord.amount) > 0.01) return res.status(400).json({ message: 'PayPal payment amount does not match the order.' })
        const payment = await finishPayment({ orderId: paymentRecord.orderId, userId: paymentRecord.userId, amount: paymentRecord.amount, provider: 'paypal', providerPaymentId: paypalOrder.id })
        return res.json({ message: 'PayPal payment confirmed', payment })
    } catch (error) {
        console.error('Error capturing PayPal order:', error)
        return res.status(502).json({ message: 'Unable to confirm PayPal payment' })
    }
}

const getPaymentsForOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: 'Invalid order ID' })
        const order = await Order.findById(orderId).select('userId')
        if (!order) return res.status(404).json({ message: 'Order not found' })
        if (req.user.role !== 'Admin' && order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Forbidden: cannot view these payments' })
        }
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
    stripeWebhook,
    createStripeCheckout,
    completeStripeCheckout,
    createPaypalOrder,
    capturePaypalOrder,
    getPaymentsForOrder
}
