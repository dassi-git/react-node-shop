const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'order-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Product = require('./models/Product')
const Order = require('./models/Order')
const Basket = require('./models/Basket')
const Payment = require('./models/Payment')
const Quote = require('./models/Quote')

let mongoServer
let server
let baseUrl
let user
let otherUser
let admin
let userToken
let otherUserToken
let adminToken
let product

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

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    ;[user, otherUser, admin] = await User.create([
        { name: 'Order Test User', userName: 'order-user', address: 'User Street', phone: '0501234567', email: 'order-user@example.com', password },
        { name: 'Other Order User', userName: 'other-order-user', address: 'Other Street', phone: '0507654321', email: 'other-order-user@example.com', password },
        { name: 'Order Test Admin', userName: 'order-admin', address: 'Admin Street', phone: '0501111111', email: 'order-admin@example.com', password, role: 'Admin' }
    ])
    userToken = tokenFor(user)
    otherUserToken = tokenFor(otherUser)
    adminToken = tokenFor(admin)
    product = await Product.create({
        name: 'Server Priced Product',
        price: 40,
        quantity: 5,
        productExist: 'INSTOCK',
        inventoryStatus: 'INSTOCK'
    })

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

test('order creation uses server pricing, reserves stock, and enforces ownership', async () => {
    await Basket.create({
        userId: user._id,
        Products: [{ type: product._id, quantity: 2 }]
    })
    const created = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            deliveryFee: 999,
            deliveryAddress: { city: 'Test City', street: 'Test Street', zipCode: '12345' }
        })
    })

    assert.equal(created.response.status, 201)
    assert.equal(created.body.order.status, 'quote_requested')
    assert.equal(created.body.order.subtotal, 80)
    assert.equal(created.body.order.deliveryFee, 0)
    assert.equal(created.body.order.totalPrice, 80)
    assert.equal(created.body.order.items[0].productName, 'Server Priced Product')
    assert.equal(created.body.order.items[0].unitPrice, 40)
    assert.equal(created.body.order.items[0].totalPrice, 80)

    const storedProduct = await Product.findById(product._id).lean()
    assert.equal(storedProduct.quantity, 3)

    const storedOrder = await Order.findById(created.body.order._id).lean()
    assert.equal(storedOrder.userId.toString(), user._id.toString())
    assert.equal(storedOrder.items[0].quantity, 2)
    assert.equal((await Basket.findOne({ userId: user._id })).Products.length, 0)

    const hidden = await request(`/api/order/${created.body.order._id}`, {
        headers: { Authorization: `Bearer ${otherUserToken}` }
    })
    assert.equal(hidden.response.status, 403)

    const visible = await request(`/api/order/${created.body.order._id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    })
    assert.equal(visible.response.status, 200)
    assert.equal(visible.body.items[0].quantity, 2)
})

test('order history keeps item snapshots after a product is deleted', async () => {
    const historicalProduct = await Product.create({
        name: 'Historical Product',
        price: 60,
        quantity: 2,
        productExist: 'INSTOCK',
        inventoryStatus: 'INSTOCK'
    })
    await Basket.updateOne(
        { userId: user._id },
        { $set: { Products: [{ type: historicalProduct._id, quantity: 1 }] } },
        { upsert: true }
    )
    const created = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            deliveryAddress: { city: 'Test City', street: 'Test Street' }
        })
    })

    assert.equal(created.response.status, 201)
    await historicalProduct.deleteOne()

    const history = await request('/api/order/my', { headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(history.response.status, 200)
    const savedOrder = history.body.find((order) => order._id === created.body.order._id)
    assert.ok(savedOrder)
    assert.equal(savedOrder.items[0].productName, 'Historical Product')
    assert.equal(savedOrder.items[0].unitPrice, 60)
    assert.equal(savedOrder.items[0].totalPrice, 60)
})

test('order creation rejects invalid delivery input and empty baskets', async () => {
    await Basket.updateOne(
        { userId: user._id },
        { $set: { Products: [{ type: product._id, quantity: 1 }] } },
        { upsert: true }
    )

    const missingAddress = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ deliveryAddress: { city: 'Test City' } })
    })
    assert.equal(missingAddress.response.status, 400)
    assert.equal(missingAddress.body.message, 'Delivery city and street are required.')

    const invalidDate = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ deliveryDate: 'not-a-date', deliveryAddress: { city: 'Test City', street: 'Test Street' } })
    })
    assert.equal(invalidDate.response.status, 400)
    assert.equal(invalidDate.body.message, 'Delivery date is invalid.')

    const longNotes = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ notes: 'x'.repeat(2001), deliveryAddress: { city: 'Test City', street: 'Test Street' } })
    })
    assert.equal(longNotes.response.status, 400)
    assert.equal(longNotes.body.message, 'Order notes are too long.')

    await Basket.deleteOne({ userId: user._id })
    const emptyBasket = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ deliveryAddress: { city: 'Test City', street: 'Test Street' } })
    })
    assert.equal(emptyBasket.response.status, 400)
    assert.equal(emptyBasket.body.message, 'At least one item is required.')
    assert.equal(await Order.countDocuments({ userId: user._id }), 2)
})

test('order creation rolls back inventory when a later reservation fails', async () => {
    const rollbackProduct = await Product.create({
        name: 'Rollback Test Product',
        price: 25,
        quantity: 1,
        productExist: 'INSTOCK',
        inventoryStatus: 'INSTOCK'
    })
    await Basket.create({
        userId: user._id,
        Products: [
            { type: rollbackProduct._id, quantity: 1 },
            { type: rollbackProduct._id, quantity: 1 }
        ]
    })
    const orderCountBefore = await Order.countDocuments({ userId: user._id })

    const failed = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ deliveryAddress: { city: 'Test City', street: 'Test Street' } })
    })

    assert.equal(failed.response.status, 400)
    assert.match(failed.body.message, /does not have enough stock/)
    assert.equal((await Product.findById(rollbackProduct._id)).quantity, 1)
    assert.equal((await Order.countDocuments({ userId: user._id })), orderCountBefore)
    assert.equal((await Basket.findOne({ userId: user._id })).Products.length, 2)
})

test('order status updates require admin access, valid transitions, and confirmed payment', async () => {
    const order = await Order.create({
        userId: user._id,
        orderNumber: `STATUS-TEST-${Date.now()}`,
        status: 'quote_requested',
        totalPrice: 100,
        finalPrice: 100,
        deliveryAddress: { city: 'Test City', street: 'Test Street' },
        items: [{ productName: 'Status Test Product', quantity: 1, unitPrice: 100, totalPrice: 100 }]
    })

    const regularUser = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ status: 'quote_sent' })
    })
    assert.equal(regularUser.response.status, 403)

    const invalidTransition = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'paid' })
    })
    assert.equal(invalidTransition.response.status, 400)
    assert.match(invalidTransition.body.message, /Invalid status transition/)

    const quoteSent = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'quote_sent' })
    })
    assert.equal(quoteSent.response.status, 200)

    const quote = await Quote.create({
        orderId: order._id,
        adminId: admin._id,
        quotePrice: 100,
        depositAmount: 50,
        validUntil: new Date(Date.now() + 86400000),
        status: 'accepted'
    })
    await Order.updateOne({ _id: order._id }, { $set: { quote: quote._id } })

    const quoteAccepted = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'quote_accepted' })
    })
    assert.equal(quoteAccepted.response.status, 200)

    const paymentPending = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'payment_pending' })
    })
    assert.equal(paymentPending.response.status, 200)

    const paidWithoutPayment = await request(`/api/order/${order._id}/status`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'paid' })
    })
    assert.equal(paidWithoutPayment.response.status, 400)
    assert.equal(paidWithoutPayment.body.message, 'A confirmed payment is required before this status.')
    assert.equal((await Order.findById(order._id)).status, 'payment_pending')

    assert.equal(await Payment.countDocuments({ orderId: order._id }), 0)
})

test('completed and cancelled orders cannot change status', async () => {
    const orders = await Order.create([
        {
            userId: user._id,
            orderNumber: `COMPLETED-TEST-${Date.now()}`,
            status: 'completed',
            totalPrice: 100,
            finalPrice: 100,
            deliveryAddress: { city: 'Test City', street: 'Test Street' },
            items: [{ productName: 'Completed Test Product', quantity: 1, unitPrice: 100, totalPrice: 100 }]
        },
        {
            userId: user._id,
            orderNumber: `CANCELLED-TEST-${Date.now()}`,
            status: 'cancelled',
            totalPrice: 100,
            finalPrice: 100,
            deliveryAddress: { city: 'Test City', street: 'Test Street' },
            items: [{ productName: 'Cancelled Test Product', quantity: 1, unitPrice: 100, totalPrice: 100 }]
        }
    ])

    for (const order of orders) {
        const response = await request(`/api/order/${order._id}/status`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ status: 'confirmed' })
        })
        assert.equal(response.response.status, 400)
        assert.match(response.body.message, /Invalid status transition/)
        assert.equal((await Order.findById(order._id)).status, order.status)
    }
})
