const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'integration-test-secret'

const { app } = require('./server')
const User = require('./models/User')

let mongoServer
let server
let baseUrl
let userToken
let adminToken

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

const tokenFor = (user, expiresIn = '1h') => jwt.sign({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    userName: user.userName,
    role: user.role
}, process.env.ACCESS_TOKEN_SECRET, { expiresIn })

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    const [user, admin] = await User.create([
        { name: 'Integration User', userName: 'integration-user', address: 'User Street', phone: '0501234567', email: 'integration-user@example.com', password, role: 'User' },
        { name: 'Integration Admin', userName: 'integration-admin', address: 'Admin Street', phone: '0507654321', email: 'integration-admin@example.com', password, role: 'Admin' }
    ])

    userToken = tokenFor(user)
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

test('regular users cannot access admin-only user listing', async () => {
    const { response, body } = await request('/api/user', {
        headers: { Authorization: `Bearer ${userToken}` }
    })

    assert.equal(response.status, 403)
    assert.deepEqual(body, { message: 'Forbidden - Admin access required' })
})

test('admins can access the user listing without exposing passwords', async () => {
    const { response, body } = await request('/api/user', {
        headers: { Authorization: `Bearer ${adminToken}` }
    })

    assert.equal(response.status, 200)
    assert.equal(body.length, 2)
    assert.equal(body.some((user) => Object.prototype.hasOwnProperty.call(user, 'password')), false)
})

test('expired tokens are rejected before protected access', async () => {
    const expiredToken = tokenFor({
        _id: new mongoose.Types.ObjectId(),
        name: 'Expired User',
        email: 'expired@example.com',
        userName: 'expired-user',
        role: 'User'
    }, -1)
    const { response, body } = await request('/api/user/profile', {
        headers: { Authorization: `Bearer ${expiredToken}` }
    })

    assert.equal(response.status, 403)
    assert.deepEqual(body, { message: 'Forbidden - Invalid or expired token' })
})

test('login uses HttpOnly cookies and logout clears the cookie', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userName: 'integration-user', password: 'Test1234' })
    })
    const loginBody = await loginResponse.json()
    const setCookies = loginResponse.headers.getSetCookie()
    const accessCookie = setCookies.find((cookie) => cookie.startsWith('accessToken='))
    const csrfCookie = setCookies.find((cookie) => cookie.startsWith('csrfToken='))
    const accessToken = accessCookie.match(/^accessToken=([^;]+)/)[1]
    const csrfToken = csrfCookie.match(/^csrfToken=([^;]+)/)[1]
    const cookieHeader = `accessToken=${accessToken}; csrfToken=${csrfToken}`

    assert.equal(loginResponse.status, 200)
    assert.equal(Object.prototype.hasOwnProperty.call(loginBody, 'token'), false)
    assert.match(accessCookie, /HttpOnly/i)
    assert.match(csrfCookie, /SameSite=Lax/i)

    const profile = await request('/api/user/profile', { headers: { cookie: cookieHeader } })
    assert.equal(profile.response.status, 200)
    assert.equal(profile.body.userName, 'integration-user')

    const logout = await fetch(`${baseUrl}/api/user/logout`, {
        method: 'POST',
        headers: { cookie: cookieHeader, 'x-csrf-token': csrfToken }
    })
    assert.equal(logout.status, 204)
    assert.ok(logout.headers.getSetCookie().some((cookie) => cookie.startsWith('accessToken=;')))
})