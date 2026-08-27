const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'quote-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Order = require('./models/Order')
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

const jsonOptions = (method, token, body) => ({
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
})

const createOrder = async (suffix, status = 'quote_requested') => Order.create({
    userId: user._id,
    orderNumber: `QUOTE-TEST-${suffix}`,
    status,
    totalPrice: 100,
    finalPrice: 100,
    deliveryAddress: { city: 'Test City', street: 'Test Street' },
    items: [{ productName: 'Quote Test Product', quantity: 1, unitPrice: 100, totalPrice: 100 }]
})

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    ;[user, otherUser, admin] = await User.create([
        { name: 'Quote Test User', userName: 'quote-user', address: 'User Street', phone: '0501234567', email: 'quote-user@example.com', password, role: 'User' },
        { name: 'Other Quote User', userName: 'other-quote-user', address: 'Other Street', phone: '0507654321', email: 'other-quote-user@example.com', password, role: 'User' },
        { name: 'Quote Test Admin', userName: 'quote-admin', address: 'Admin Street', phone: '0507654321', email: 'quote-admin@example.com', password, role: 'Admin' }
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

test('quote lifecycle supports creation, viewing, acceptance, rejection, and expiration', async () => {
    const acceptedOrder = await createOrder('ACCEPT')
    const create = await request('/api/quote', jsonOptions('POST', adminToken, {
        orderId: acceptedOrder._id.toString(),
        quotePrice: 120,
        deliveryFee: 15,
        depositAmount: 60,
        notes: 'Test quote',
        validUntil: new Date(Date.now() + 86400000).toISOString()
    }))

    assert.equal(create.response.status, 201)
    assert.equal(create.body.quote.status, 'sent')
    assert.equal(create.body.order.status, 'quote_sent')
    assert.equal(create.body.order.finalPrice, 135)

    const unauthorizedCreate = await request('/api/quote', jsonOptions('POST', userToken, {
        orderId: (await createOrder('UNAUTHORIZED'))._id.toString(),
        quotePrice: 50
    }))
    assert.equal(unauthorizedCreate.response.status, 403)

    const visible = await request(`/api/quote/order/${acceptedOrder._id}`, { headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(visible.response.status, 200)
    assert.equal(visible.body.length, 1)
    assert.equal(visible.body[0].quotePrice, 120)

    const hidden = await request(`/api/quote/order/${acceptedOrder._id}`, { headers: { Authorization: `Bearer ${otherUserToken}` } })
    assert.equal(hidden.response.status, 403)

    const forbiddenAccept = await request(`/api/quote/${create.body.quote._id}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${otherUserToken}` } })
    assert.equal(forbiddenAccept.response.status, 403)
    assert.equal((await Quote.findById(create.body.quote._id)).status, 'sent')

    const accepted = await request(`/api/quote/${create.body.quote._id}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(accepted.response.status, 200)
    assert.equal(accepted.body.quote.status, 'accepted')
    assert.equal(accepted.body.order.status, 'quote_accepted')

    const rejectedOrder = await createOrder('REJECT')
    const rejectedQuote = await Quote.create({
        orderId: rejectedOrder._id,
        adminId: admin._id,
        quotePrice: 80,
        validUntil: new Date(Date.now() + 86400000),
        status: 'sent'
    })
    rejectedOrder.quote = rejectedQuote._id
    rejectedOrder.status = 'quote_sent'
    await rejectedOrder.save()

    const rejected = await request(`/api/quote/${rejectedQuote._id}/reject`, { method: 'PUT', headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(rejected.response.status, 200)
    assert.equal(rejected.body.quote.status, 'rejected')
    assert.equal(rejected.body.order.status, 'quote_rejected')

    const rejectedAccept = await request(`/api/quote/${rejectedQuote._id}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(rejectedAccept.response.status, 400)
    assert.equal(rejectedAccept.body.message, 'This quote is no longer available.')
    assert.equal((await Quote.findById(rejectedQuote._id)).status, 'rejected')
    assert.equal((await Order.findById(rejectedOrder._id)).status, 'quote_rejected')

    const expiredOrder = await createOrder('EXPIRED')
    const expiredQuote = await Quote.create({
        orderId: expiredOrder._id,
        adminId: admin._id,
        quotePrice: 90,
        validUntil: new Date(Date.now() - 1000),
        status: 'sent'
    })
    expiredOrder.quote = expiredQuote._id
    expiredOrder.status = 'quote_sent'
    await expiredOrder.save()

    const expired = await request(`/api/quote/${expiredQuote._id}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${userToken}` } })
    assert.equal(expired.response.status, 400)
    assert.equal(expired.body.message, 'This quote is no longer available.')
    assert.equal((await Quote.findById(expiredQuote._id)).status, 'sent')
    assert.equal((await Order.findById(expiredOrder._id)).status, 'quote_sent')
})

test('concurrent quote requests create only one active quote', async () => {
    const order = await createOrder('DUPLICATE')
    const options = jsonOptions('POST', adminToken, {
        orderId: order._id.toString(),
        quotePrice: 100,
        depositAmount: 50
    })

    const results = await Promise.all([
        request('/api/quote', options),
        request('/api/quote', options)
    ])

    assert.deepEqual(results.map((result) => result.response.status).sort((a, b) => a - b), [201, 409])
    assert.equal(await Quote.countDocuments({ orderId: order._id, status: { $in: ['sent', 'accepted'] } }), 1)
    assert.equal((await Order.findById(order._id)).status, 'quote_sent')
})

test('quote creation rejects invalid pricing, expiration, and notes', async () => {
    const cases = [
        { suffix: 'NEGATIVE', body: { quotePrice: -1 }, message: 'Quote price must be a valid non-negative amount.' },
        { suffix: 'DELIVERY', body: { quotePrice: 100, deliveryFee: -1 }, message: 'Delivery fee must be a valid non-negative amount.' },
        { suffix: 'DEPOSIT', body: { quotePrice: 100, depositAmount: 101 }, message: 'Deposit must be between zero and the quote price.' },
        { suffix: 'EXPIRATION', body: { quotePrice: 100, validUntil: new Date(Date.now() - 1000).toISOString() }, message: 'Quote expiration date must be valid and in the future.' },
        { suffix: 'NOTES', body: { quotePrice: 100, notes: 'x'.repeat(2001) }, message: 'Quote notes are too long.' }
    ]

    for (const testCase of cases) {
        const order = await createOrder(testCase.suffix)
        const response = await request('/api/quote', jsonOptions('POST', adminToken, {
            orderId: order._id.toString(),
            ...testCase.body
        }))

        assert.equal(response.response.status, 400)
        assert.equal(response.body.message, testCase.message)
        assert.equal(await Quote.countDocuments({ orderId: order._id }), 0)
        assert.equal((await Order.findById(order._id)).status, 'quote_requested')
    }
})
