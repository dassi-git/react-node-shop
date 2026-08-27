/**
 * Full end-to-end flow test:
 * Register → Login → Add product to basket → Create order →
 * Admin creates quote → User accepts quote →
 * User creates manual payment (bank_transfer) → Admin confirms payment →
 * Order status == 'paid'
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'full-flow-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Product = require('./models/Product')
const Order = require('./models/Order')
const Quote = require('./models/Quote')
const Payment = require('./models/Payment')
const { paymentLimiter } = require('./middleware/rateLimiter')

let mongoServer
let server
let baseUrl

/**
 * Make an HTTP request and return {response, body}.
 * If the response has a Set-Cookie header with an accessToken, it is extracted.
 */
const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    let body
    try {
        body = await response.json()
    } catch {
        body = null
    }
    return { response, body }
}

/** Extract the value of a named cookie from a Set-Cookie header array. */
const extractCookie = (setCookieHeaders, name) => {
    if (!Array.isArray(setCookieHeaders)) return null
    for (const header of setCookieHeaders) {
        const match = header.match(new RegExp(`(?:^|\\s)${name}=([^;]+)`))
        if (match) return decodeURIComponent(match[1])
    }
    return null
}

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

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

test('full flow: Register → Login → Basket → Order → AdminQuote → Acceptance → ManualPayment → AdminConfirm → paid', async (t) => {
    // ─────────────────────────────────────────────────────────────────
    // Step 1: Register a new user via the API
    // ─────────────────────────────────────────────────────────────────
    const register = await request('/api/user/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            name: 'Full Flow User',
            userName: 'fullflow-user',
            address: '123 Flow Street',
            phone: '0501234567',
            email: 'fullflow@example.com',
            password: 'FlowPass1!'
        })
    })
    assert.equal(register.response.status, 201, `Register failed: ${JSON.stringify(register.body)}`)
    t.diagnostic('Step 1 PASS: User registered')

    // ─────────────────────────────────────────────────────────────────
    // Step 2: Login and extract the JWT (issued as an HttpOnly cookie)
    // ─────────────────────────────────────────────────────────────────
    const loginRes = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userName: 'fullflow-user', password: 'FlowPass1!' })
    })
    assert.equal(loginRes.status, 200, 'Login failed')

    // node-fetch / undici returns Set-Cookie as an array on getSetCookie()
    const setCookies = loginRes.headers.getSetCookie
        ? loginRes.headers.getSetCookie()
        : [loginRes.headers.get('set-cookie') || '']
    const cookieToken = extractCookie(setCookies, 'accessToken')
    assert.ok(cookieToken, 'No accessToken cookie returned from login')

    const loginBody = await loginRes.json()
    assert.ok(loginBody.user, 'Login response should have user field')
    t.diagnostic(`Step 2 PASS: Login succeeded for ${loginBody.user.userName}`)

    // Build the Authorization header from the cookie token
    const userToken = cookieToken

    // ─────────────────────────────────────────────────────────────────
    // Create a product directly (simulates admin seeding the catalog)
    // ─────────────────────────────────────────────────────────────────
    const product = await Product.create({
        name: 'Full Flow Fruit Basket',
        price: 120,
        quantity: 10,
        productExist: 'INSTOCK',
        inventoryStatus: 'INSTOCK'
    })

    // ─────────────────────────────────────────────────────────────────
    // Step 3: Add product to basket (PUT /api/basket/:productId)
    // ─────────────────────────────────────────────────────────────────
    const addToBasket = await request(`/api/basket/${product._id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ quantity: 2 })
    })
    assert.equal(addToBasket.response.status, 200, `Add to basket failed: ${JSON.stringify(addToBasket.body)}`)
    t.diagnostic('Step 3 PASS: Product added to basket')

    // Add it once more so quantity = 2
    await request(`/api/basket/${product._id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ quantity: 1 })
    })

    // ─────────────────────────────────────────────────────────────────
    // Step 4: Create order from basket
    // ─────────────────────────────────────────────────────────────────
    const createOrder = await request('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            deliveryAddress: { city: 'Tel Aviv', street: 'Dizengoff 1' }
        })
    })
    assert.equal(createOrder.response.status, 201, `Create order failed: ${JSON.stringify(createOrder.body)}`)
    const order = createOrder.body.order
    assert.equal(order.status, 'quote_requested')
    assert.ok(order.items.length > 0, 'Order should have items')
    assert.equal(order.items[0].unitPrice, 120, 'Unit price must come from the server')
    t.diagnostic(`Step 4 PASS: Order created - ${order.orderNumber}, status=${order.status}, total=${order.totalPrice}`)

    // ─────────────────────────────────────────────────────────────────
    // Create admin user directly for subsequent steps
    // ─────────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('AdminPass1!', 10)
    const admin = await User.create({
        name: 'Full Flow Admin',
        userName: 'fullflow-admin',
        address: 'Admin Street',
        phone: '0507654321',
        email: 'fullflow-admin@example.com',
        password: adminPassword,
        role: 'Admin'
    })
    const adminToken = jwt.sign(
        { _id: admin._id.toString(), name: admin.name, email: admin.email, userName: admin.userName, role: admin.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '1h' }
    )

    // ─────────────────────────────────────────────────────────────────
    // Step 5: Admin creates a quote for the order
    // ─────────────────────────────────────────────────────────────────
    const createQuote = await request('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
            orderId: order._id,
            quotePrice: 240,
            deliveryFee: 0,
            depositAmount: 120,
            notes: 'Ready for full-flow test',
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
    })
    assert.equal(createQuote.response.status, 201, `Create quote failed: ${JSON.stringify(createQuote.body)}`)
    const quote = createQuote.body.quote
    assert.equal(quote.status, 'sent')
    assert.equal(quote.quotePrice, 240)
    assert.equal(quote.depositAmount, 120)
    t.diagnostic(`Step 5 PASS: Admin created quote ${quote._id}, deposit=${quote.depositAmount}`)

    // Verify order is now in quote_sent status
    const orderAfterQuote = await Order.findById(order._id).lean()
    assert.equal(orderAfterQuote.status, 'quote_sent')

    // ─────────────────────────────────────────────────────────────────
    // Step 6: User accepts the quote
    // ─────────────────────────────────────────────────────────────────
    const acceptQuote = await request(`/api/quote/${quote._id}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userToken}` }
    })
    assert.equal(acceptQuote.response.status, 200, `Accept quote failed: ${JSON.stringify(acceptQuote.body)}`)
    assert.equal(acceptQuote.body.quote.status, 'accepted')
    assert.equal(acceptQuote.body.order.status, 'quote_accepted')
    t.diagnostic('Step 6 PASS: User accepted quote, order status=quote_accepted')

    // ─────────────────────────────────────────────────────────────────
    // Step 7: User creates a manual payment (bank_transfer)
    // ─────────────────────────────────────────────────────────────────
    // Reset rate limiter to avoid 429 in isolated test run
    paymentLimiter.resetKey('127.0.0.1')
    paymentLimiter.resetKey('::ffff:127.0.0.1')

    const createPayment = await request('/api/payment/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            orderId: order._id,
            paymentMethod: 'bank_transfer'
        })
    })
    assert.equal(createPayment.response.status, 201, `Create payment failed: ${JSON.stringify(createPayment.body)}`)
    const payment = createPayment.body.payment
    assert.equal(payment.paymentMethod, 'bank_transfer')
    assert.equal(payment.provider, 'internal')
    assert.equal(payment.status, 'pending')
    assert.equal(payment.amount, 120)  // deposit amount
    t.diagnostic(`Step 7 PASS: Manual payment created ${payment._id}, method=bank_transfer, status=pending, amount=${payment.amount}`)

    // Verify order is now in payment_pending
    const orderAfterPayment = await Order.findById(order._id).lean()
    assert.equal(orderAfterPayment.status, 'payment_pending')

    // ─────────────────────────────────────────────────────────────────
    // Step 8: Admin confirms the payment
    // ─────────────────────────────────────────────────────────────────
    const confirmPayment = await request(`/api/payment/${payment._id}/confirm`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` }
    })
    assert.equal(confirmPayment.response.status, 200, `Confirm payment failed: ${JSON.stringify(confirmPayment.body)}`)
    assert.equal(confirmPayment.body.payment.status, 'paid')
    assert.equal(confirmPayment.body.order.status, 'paid')
    t.diagnostic('Step 8 PASS: Admin confirmed payment, payment.status=paid, order.status=paid')

    // ─────────────────────────────────────────────────────────────────
    // Step 9: Verify final state — order.status == 'paid'
    // ─────────────────────────────────────────────────────────────────
    const finalOrder = await Order.findById(order._id).lean()
    const finalPayment = await Payment.findById(payment._id).lean()

    assert.equal(finalOrder.status, 'paid', `Final order status should be 'paid', got '${finalOrder.status}'`)
    assert.equal(finalPayment.status, 'paid', `Final payment status should be 'paid', got '${finalPayment.status}'`)
    assert.equal(finalOrder.finalPrice, 120)

    // Verify the status history trail
    const statuses = finalOrder.statusHistory.map((entry) => entry.status)
    assert.ok(statuses.includes('quote_requested'), 'Status history should include quote_requested')
    assert.ok(statuses.includes('quote_accepted'), 'Status history should include quote_accepted')
    assert.ok(statuses.includes('payment_pending'), 'Status history should include payment_pending')
    assert.ok(statuses.includes('paid'), 'Status history should include paid')

    // Exactly one payment record
    assert.equal(await Payment.countDocuments({ orderId: order._id }), 1)

    t.diagnostic(`Step 9 PASS: Final order status='paid', finalPrice=${finalOrder.finalPrice}, statusHistory=${statuses.join(' → ')}`)
})
