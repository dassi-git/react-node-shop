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

let mongoServer
let server
let baseUrl
let user
let otherUser
let userToken
let otherUserToken
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
    ;[user, otherUser] = await User.create([
        { name: 'Order Test User', userName: 'order-user', address: 'User Street', phone: '0501234567', email: 'order-user@example.com', password },
        { name: 'Other Order User', userName: 'other-order-user', address: 'Other Street', phone: '0507654321', email: 'other-order-user@example.com', password }
    ])
    userToken = tokenFor(user)
    otherUserToken = tokenFor(otherUser)
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
    const created = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            items: [{ productId: product._id.toString(), quantity: 2, unitPrice: 1, productName: 'Client Controlled Price' }],
            deliveryFee: 999,
            deliveryAddress: { city: 'Test City', street: 'Test Street', zipCode: '12345' }
        })
    })

    assert.equal(created.response.status, 201)
    assert.equal(created.body.order.status, 'quote_requested')
    assert.equal(created.body.order.subtotal, 80)
    assert.equal(created.body.order.deliveryFee, 999)
    assert.equal(created.body.order.totalPrice, 1079)
    assert.equal(created.body.order.items[0].productName, 'Server Priced Product')
    assert.equal(created.body.order.items[0].unitPrice, 40)
    assert.equal(created.body.order.items[0].totalPrice, 80)

    const storedProduct = await Product.findById(product._id).lean()
    assert.equal(storedProduct.quantity, 3)

    const storedOrder = await Order.findById(created.body.order._id).lean()
    assert.equal(storedOrder.userId.toString(), user._id.toString())
    assert.equal(storedOrder.items[0].quantity, 2)

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
