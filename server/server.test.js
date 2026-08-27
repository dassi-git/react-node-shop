const test = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')

mongoose.set('bufferTimeoutMS', 100)

const { app } = require('./server')

let server
let baseUrl

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

test.before(async () => {
    server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance))
    })
    const address = server.address()
    baseUrl = `http://127.0.0.1:${address.port}`
})

test.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('health endpoint reports a live process', async () => {
    const { response, body } = await request('/health')

    assert.equal(response.status, 200)
    assert.deepEqual(body, { status: 'ok' })
})

test('readiness endpoint reports a disconnected database', async () => {
    const { response, body } = await request('/ready')

    assert.equal(response.status, 503)
    assert.deepEqual(body, { status: 'not_ready', database: 'disconnected' })
})

test('unknown routes return the documented JSON error', async () => {
    const { response, body } = await request('/does-not-exist')

    assert.equal(response.status, 404)
    assert.deepEqual(body, { success: false, message: 'Route not found' })
})

test('protected user, order, and payment routes reject anonymous requests', async () => {
    const routes = [
        ['/api/user/profile', 'GET'],
        ['/api/order/my', 'GET'],
        ['/api/payment/order/not-an-id', 'GET']
    ]

    for (const [path, method] of routes) {
        const { response, body } = await request(path, { method })
        assert.equal(response.status, 401, `${method} ${path} should require authentication`)
        assert.match(body.message, /Unauthorized/)
    }
})

test('public product listing remains available without authentication', async () => {
    const { response, body } = await request('/api/product')

    assert.equal(response.status, 503)
    assert.deepEqual(body, { message: 'Product catalog is temporarily unavailable' })
})

test('invalid product IDs are rejected before a database query', async () => {
    const { response, body } = await request('/api/product/not-an-object-id')

    assert.equal(response.status, 400)
    assert.deepEqual(body, { message: 'Invalid product ID' })
})

test('malformed JSON returns a client error and hides server metadata', async () => {
    const response = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid-json'
    })
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.equal(body.message, 'Malformed JSON request body')
    assert.equal(response.headers.get('x-powered-by'), null)
})

test('JSON request bodies larger than 1 MB are rejected', async () => {
    const response = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: 'x'.repeat(1024 * 1024) })
    })
    const body = await response.json()

    assert.equal(response.status, 413)
    assert.match(body.message, /request entity too large/i)
})

test('protected quote and payment routes reject anonymous requests', async () => {
    const routes = [
        ['/api/quote/order/not-an-object-id', 'GET'],
        ['/api/quote/not-an-object-id/accept', 'PUT'],
        ['/api/quote/not-an-object-id/reject', 'PUT'],
        ['/api/payment/order/not-an-object-id', 'GET']
    ]

    for (const [path, method] of routes) {
        const { response, body } = await request(path, { method })
        assert.equal(response.status, 401)
        assert.match(body.message, /Unauthorized/)
    }
})

test('cookie-authenticated state changes require a matching CSRF token', async () => {
    const cookie = 'accessToken=fake; csrfToken=expected'

    const missingHeader = await fetch(`${baseUrl}/api/user/logout`, {
        method: 'POST',
        headers: { cookie }
    })
    assert.equal(missingHeader.status, 403)

    const validHeader = await fetch(`${baseUrl}/api/user/logout`, {
        method: 'POST',
        headers: { cookie, 'x-csrf-token': 'expected' }
    })
    assert.equal(validHeader.status, 204)
})

test('payment mutations are rate limited independently', async () => {
    let lastResponse
    for (let attempt = 0; attempt < 11; attempt += 1) {
        lastResponse = await fetch(`${baseUrl}/api/payment`, { method: 'POST' })
    }

    assert.equal(lastResponse.status, 429)
})
