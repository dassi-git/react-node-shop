const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'failure-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Product = require('./models/Product')
const Basket = require('./models/Basket')
const Order = require('./models/Order')
const Quote = require('./models/Quote')
const Payment = require('./models/Payment')

let mongoServer
let server
let baseUrl
let user
let userToken

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })
    const password = await bcrypt.hash('Test1234', 10)
    user = await User.create({ name: 'Failure Test User', userName: 'failure-user', address: 'Test Street', phone: '0501234567', email: 'failure-user@example.com', password })
    userToken = jwt.sign({ _id: user._id.toString(), name: user.name, email: user.email, userName: user.userName, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
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

test('missing products are rejected without creating an order', async () => {
    const missingProductId = new mongoose.Types.ObjectId()
    await Basket.create({ userId: user._id, Products: [{ type: missingProductId, quantity: 1 }] })
    const { response, body } = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            items: [{ productId: missingProductId, quantity: 1 }],
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(response.status, 400)
    assert.equal(body.message, 'Order items are invalid.')
    assert.equal(await Order.countDocuments({ userId: user._id }), 0)
    await Basket.deleteOne({ userId: user._id })
})

test('out-of-stock products are rejected without creating an order', async () => {
    const product = await Product.create({ name: 'Unavailable Product', price: 100, quantity: 0, productExist: 'OUTOFSTOCK', inventoryStatus: 'OUTOFSTOCK' })
    await Basket.create({ userId: user._id, Products: [{ type: product._id, quantity: 1 }] })
    const { response, body } = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            items: [{ productId: product._id, quantity: 1 }],
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(response.status, 400)
    assert.match(body.message, /out of stock/i)
    assert.equal(await Order.countDocuments({ userId: user._id }), 0)
})

test('order is created with server-side price even when client sends a fake price', async () => {
    const product = await Product.create({ name: 'Price Test Product', price: 50, quantity: 10, productExist: 'INSTOCK', inventoryStatus: 'INSTOCK' })
    // Use upsert to avoid duplicate-key error on Basket's unique userId index
    await Basket.findOneAndUpdate(
        { userId: user._id },
        { $set: { Products: [{ type: product._id, quantity: 1 }] } },
        { upsert: true, new: true }
    )

    // The client sends a completely different (fake) price in the body - server should ignore it
    const { response, body } = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            clientPrice: 1,          // fake price - should be ignored
            deliveryFee: 999,         // fake delivery fee - should be ignored
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(response.status, 201)
    // Price must come from the server (50), not from the client (1)
    assert.equal(body.order.items[0].unitPrice, 50)
    assert.equal(body.order.items[0].totalPrice, 50)
    assert.equal(body.order.totalPrice, 50)
    // Delivery fee must be server-calculated (0), not the fake 999
    assert.equal(body.order.deliveryFee, 0)
})

test('order is assigned to the authenticated user, not a userId injected in the body', async () => {
    const bcrypt = require('bcrypt')
    const otherUser = await User.create({ name: 'Other User', userName: 'other-user-fc', address: 'Other Street', phone: '0509999999', email: 'other-fc@example.com', password: await bcrypt.hash('Test1234', 10) })
    const product = await Product.create({ name: 'Ownership Test Product', price: 30, quantity: 5, productExist: 'INSTOCK', inventoryStatus: 'INSTOCK' })
    // Use upsert to avoid duplicate-key error on Basket's unique userId index
    await Basket.findOneAndUpdate(
        { userId: user._id },
        { $set: { Products: [{ type: product._id, quantity: 1 }] } },
        { upsert: true, new: true }
    )

    // The client tries to forge the userId – server must use the JWT user instead
    const { response, body } = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            userId: otherUser._id.toString(),   // fake userId – should be ignored
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(response.status, 201)
    // Order must belong to the JWT user, not the injected userId
    const storedOrder = await Order.findById(body.order._id).lean()
    assert.equal(storedOrder.userId.toString(), user._id.toString())
    assert.notEqual(storedOrder.userId.toString(), otherUser._id.toString())
})

test('role injected in request body is ignored; permissions come from JWT', async () => {
    // Regular user tries to create a product (admin-only POST) with a faked role in the body
    const { response, body } = await request('/api/product', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${userToken}`
        },
        // Trying to inject a fake Admin role alongside a product payload
        body: JSON.stringify({
            role: 'Admin',
            name: 'Fake Product',
            price: 10,
            quantity: 1
        })
    })

    // Admin-only endpoint must deny based on JWT role (User), ignoring body role
    assert.equal(response.status, 403)
    assert.match(body.message, /admin/i)
})

test('expired JWT token is rejected with 403', async () => {
    // Create a token that is already expired (expiresIn: 0 seconds)
    const expiredToken = jwt.sign(
        { _id: user._id.toString(), name: user.name, email: user.email, userName: user.userName, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: 1 }  // 1 second
    )

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 1100))

    const { response, body } = await request('/api/order/my', {
        method: 'GET',
        headers: { Authorization: `Bearer ${expiredToken}` }
    })

    assert.equal(response.status, 403)
    assert.match(body.message, /expired|invalid/i)
})

test('repeated payment creation is rejected for the same order', async () => {
    const order = await Order.create({
        userId: user._id,
        orderNumber: 'FAILURE-PAYMENT-1',
        status: 'quote_accepted',
        totalPrice: 120,
        finalPrice: 120,
        deliveryAddress: { city: 'Test City', street: 'Test Street' },
        items: [{ productName: 'Test Product', quantity: 1, unitPrice: 120, totalPrice: 120 }]
    })
    const quote = await Quote.create({ orderId: order._id, adminId: user._id, quotePrice: 120, validUntil: new Date(Date.now() + 86400000), status: 'accepted' })
    order.quote = quote._id
    await order.save()

    const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ orderId: order._id.toString(), paymentMethod: 'card' })
    }
    const first = await request('/api/payment', options)
    const second = await request('/api/payment', options)

    assert.equal(first.response.status, 201)
    assert.equal(second.response.status, 409)
    assert.equal(await Payment.countDocuments({ orderId: order._id }), 1)
})