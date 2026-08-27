const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'payment-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Order = require('./models/Order')
const Quote = require('./models/Quote')
const Payment = require('./models/Payment')

let mongoServer
let server
let baseUrl
let user
let otherUser
let admin
let userToken
let otherUserToken
let adminToken

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

const tokenFor = (account) => jwt.sign({
    _id: account._id.toString(),
    name: account.name,
    email: account.email,
    userName: account.userName,
    role: account.role
}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

const createOrderWithAcceptedQuote = async () => {
    const order = await Order.create({
        userId: user._id,
        orderNumber: `PAYMENT-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: 'quote_accepted',
        totalPrice: 200,
        finalPrice: 200,
        deliveryAddress: { city: 'Test City', street: 'Test Street' },
        items: [{ productName: 'Payment Test Product', quantity: 1, unitPrice: 200, totalPrice: 200 }]
    })
    const quote = await Quote.create({
        orderId: order._id,
        adminId: admin._id,
        quotePrice: 200,
        depositAmount: 75,
        validUntil: new Date(Date.now() + 86400000),
        status: 'accepted'
    })
    order.quote = quote._id
    await order.save()
    return order
}

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    ;[user, otherUser, admin] = await User.create([
        { name: 'Payment Test User', userName: 'payment-user', address: 'User Street', phone: '0501234567', email: 'payment-user@example.com', password, role: 'User' },
        { name: 'Other Payment User', userName: 'other-payment-user', address: 'Other Street', phone: '0507654321', email: 'other-payment-user@example.com', password, role: 'User' },
        { name: 'Payment Test Admin', userName: 'payment-admin', address: 'Admin Street', phone: '0501111111', email: 'payment-admin@example.com', password, role: 'Admin' }
    ])
    userToken = tokenFor(user)
    otherUserToken = tokenFor(otherUser)
    adminToken = tokenFor(admin)

    server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance))
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await mongoose.disconnect()
    await mongoServer.stop()
})

test('internal payment can be started, authorized, and confirmed once', async () => {
    const order = await createOrderWithAcceptedQuote()
    const create = await request('/api/payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: order._id.toString(), paymentMethod: 'card', transactionId: 'client-value-ignored' })
    })

    assert.equal(create.response.status, 201)
    assert.equal(create.body.payment.amount, 75)
    assert.equal(create.body.payment.status, 'pending')
    assert.equal(create.body.payment.transactionId, 'client-value-ignored')
    assert.equal((await Order.findById(order._id)).status, 'payment_pending')

    const hidden = await request(`/api/payment/order/${order._id}`, { headers: { Authorization: `Bearer ${otherUserToken}` } })
    assert.equal(hidden.response.status, 403)

    const visible = await request(`/api/payment/order/${order._id}`, { headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(visible.response.status, 200)
    assert.equal(visible.body.length, 1)
    assert.equal(visible.body[0].amount, 75)

    const regularConfirm = await request(`/api/payment/${create.body.payment._id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userToken}` }
    })
    assert.equal(regularConfirm.response.status, 403)

    const confirmed = await request(`/api/payment/${create.body.payment._id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(confirmed.response.status, 200)
    assert.equal(confirmed.body.payment.status, 'paid')
    assert.equal(confirmed.body.order.status, 'paid')
    assert.equal(confirmed.body.order.finalPrice, 75)

    const confirmedAgain = await request(`/api/payment/${create.body.payment._id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(confirmedAgain.response.status, 200)
    assert.equal(confirmedAgain.body.message, 'Payment is already confirmed')
    assert.equal(await Payment.countDocuments({ orderId: order._id }), 1)
})

test('external payment endpoints report missing configuration without creating payments', async () => {
    const stripeOrder = await createOrderWithAcceptedQuote()
    const paypalOrder = await createOrderWithAcceptedQuote()
    const keys = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']
    const savedKeys = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

    for (const key of keys) delete process.env[key]

    try {
        const stripe = await request('/api/payment/stripe/checkout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ orderId: stripeOrder._id.toString() })
        })
        assert.equal(stripe.response.status, 503)
        assert.equal(stripe.body.message, 'Stripe is not configured. Add STRIPE_SECRET_KEY to server/.env.')

        const paypal = await request('/api/payment/paypal/order', {
            method: 'POST',
            headers: { Authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ orderId: paypalOrder._id.toString() })
        })
        assert.equal(paypal.response.status, 503)
        assert.equal(paypal.body.message, 'PayPal is not configured. Add sandbox credentials to server/.env.')
        assert.equal(await Payment.countDocuments({ orderId: { $in: [stripeOrder._id, paypalOrder._id] } }), 0)
    } finally {
        for (const key of keys) {
            if (savedKeys[key] === undefined) delete process.env[key]
            else process.env[key] = savedKeys[key]
        }
    }
})

test('concurrent internal payment requests create only one active payment', async () => {
    const order = await createOrderWithAcceptedQuote()
    const options = {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: order._id.toString(), paymentMethod: 'card' })
    }

    const results = await Promise.all([
        request('/api/payment', options),
        request('/api/payment', options)
    ])

    assert.deepEqual(results.map((result) => result.response.status).sort((a, b) => a - b), [201, 409])
    assert.equal(await Payment.countDocuments({ orderId: order._id, status: { $in: ['pending', 'paid'] } }), 1)
})
