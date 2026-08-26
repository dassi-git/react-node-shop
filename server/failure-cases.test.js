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
    const { response, body } = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            items: [{ productId: missingProductId, quantity: 1 }],
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(response.status, 400)
    assert.equal(body.message, 'Product no longer exists.')
    assert.equal(await Order.countDocuments({ userId: user._id }), 0)
})

test('out-of-stock products are rejected without creating an order', async () => {
    const product = await Product.create({ name: 'Unavailable Product', price: 100, quantity: 0, productExist: 'OUTOFSTOCK', inventoryStatus: 'OUTOFSTOCK' })
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