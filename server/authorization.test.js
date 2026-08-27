const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'integration-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const PasswordReset = require('./models/PasswordReset')
const { forgotPassword, resetPassword, register } = require('./controllers/userController')

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

const controllerResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code
        return this
    },
    json(body) {
        this.body = body
        return this
    }
})

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

test('regular users cannot read or update another user', async () => {
    const target = await User.findOne({ userName: 'integration-admin' }).lean()
    const readOtherUser = await request(`/api/user/${target._id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
    })
    assert.equal(readOtherUser.response.status, 403)

    const updateOtherUser = await request(`/api/user/${target._id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
            name: 'Unauthorized Update',
            userName: 'integration-admin',
            address: 'Changed Street',
            phone: '0507654321',
            email: 'integration-admin@example.com'
        })
    })
    assert.equal(updateOtherUser.response.status, 403)

    const unchanged = await User.findById(target._id).lean()
    assert.equal(unchanged.name, 'Integration Admin')
    assert.equal(unchanged.address, 'Admin Street')
})

test('registration rejects invalid email and short password before database writes', async () => {
    const invalidEmailResponse = controllerResponse()
    await register({ body: {
        name: 'Invalid Email User',
        userName: `invalid-email-${Date.now()}`,
        address: 'Test Street',
        phone: '0501234567',
        email: 'not-an-email',
        password: 'Valid123'
    } }, invalidEmailResponse)
    assert.equal(invalidEmailResponse.statusCode, 400)
    assert.equal(invalidEmailResponse.body.message, 'Invalid email format')

    const shortPasswordResponse = controllerResponse()
    await register({ body: {
        name: 'Short Password User',
        userName: `short-password-${Date.now()}`,
        address: 'Test Street',
        phone: '0501234567',
        email: `short-password-${Date.now()}@example.com`,
        password: 'short'
    } }, shortPasswordResponse)
    assert.equal(shortPasswordResponse.statusCode, 400)
    assert.equal(shortPasswordResponse.body.message, 'Password must be at least 6 characters long')
})

test('registration rejects invalid phone numbers before database writes', async () => {
    const response = controllerResponse()
    const userName = `invalid-phone-${Date.now()}`
    await register({ body: {
        name: 'Invalid Phone User',
        userName,
        address: 'Test Street',
        phone: '12345',
        email: `${userName}@example.com`,
        password: 'Valid123'
    } }, response)

    assert.equal(response.statusCode, 400)
    assert.equal(response.body.message, 'Invalid phone number')
    assert.equal(await User.countDocuments({ userName }), 0)
})

test('login returns a generic unauthorized response for an unknown user', async () => {
    const response = await request('/api/user/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userName: `missing-${Date.now()}`, password: 'Valid123' })
    })

    assert.equal(response.response.status, 401)
    assert.deepEqual(response.body, { message: 'Unauthorized' })
    assert.equal(response.response.headers.get('set-cookie'), null)
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

test('registration and login validate credentials and normalize identity fields', async () => {
    const suffix = Date.now().toString(36)
    const registration = await fetch(`${baseUrl}/api/user/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            name: 'Registered User',
            userName: ` registered-${suffix} `,
            address: 'Registration Street',
            phone: '0501234567',
            email: ` Registered-${suffix}@Example.com `,
            password: 'Register123'
        })
    })
    const registrationBody = await registration.json()

    assert.equal(registration.status, 201)
    assert.match(registrationBody.message, new RegExp(`New user registered-${suffix} created`))

    const duplicateEmail = await request('/api/user/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            name: 'Another User',
            userName: `another-${suffix}`,
            address: 'Another Street',
            phone: '0507654321',
            email: `registered-${suffix}@example.com`,
            password: 'Register123'
        })
    })
    assert.equal(duplicateEmail.response.status, 409)
    assert.equal(duplicateEmail.body.message, 'Email already exists')

    const duplicateUsername = await request('/api/user/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            name: 'Another User',
            userName: ` registered-${suffix} `,
            address: 'Another Street',
            phone: '0507654321',
            email: `another-${suffix}@example.com`,
            password: 'Register123'
        })
    })
    assert.equal(duplicateUsername.response.status, 409)
    assert.equal(duplicateUsername.body.message, 'Duplicate username')
    assert.equal(await User.countDocuments({ userName: `registered-${suffix}` }), 1)

    const login = await fetch(`${baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userName: `registered-${suffix}`, password: 'Register123' })
    })
    const loginBody = await login.json()
    assert.equal(login.status, 200)
    assert.equal(loginBody.user.userName, `registered-${suffix}`)
    assert.equal(loginBody.user.email, `registered-${suffix}@example.com`)
    assert.equal(Object.prototype.hasOwnProperty.call(loginBody, 'token'), false)
    assert.ok(login.headers.getSetCookie().some((cookie) => cookie.startsWith('accessToken=')))

    const wrongPassword = await request('/api/user/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userName: `registered-${suffix}`, password: 'Wrong123' })
    })
    assert.equal(wrongPassword.response.status, 401)
    assert.equal(wrongPassword.body.message, 'Unauthorized')
})

test('password reset is generic, single-use, and rejects weak or expired tokens', async () => {
    const unknownEmailResponse = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(body) {
            this.body = body
            return this
        }
    }
    await forgotPassword({ body: { email: 'missing@example.com' } }, unknownEmailResponse)
    assert.equal(unknownEmailResponse.statusCode, 200)
    assert.deepEqual(unknownEmailResponse.body, { message: 'If the email exists, a reset link has been sent' })

    const validToken = `reset-${Date.now()}`
    await PasswordReset.create({
        userId: (await User.findOne({ userName: 'integration-user' }))._id,
        email: 'integration-user@example.com',
        token: crypto.createHash('sha256').update(validToken).digest('hex')
    })

    const weakPassword = await request('/api/user/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: validToken, newPassword: 'short' })
    })
    assert.equal(weakPassword.response.status, 400)
    assert.equal(weakPassword.body.message, 'Password must be at least 6 characters long')

    const reset = await request('/api/user/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: validToken, newPassword: 'Reset1234' })
    })
    assert.equal(reset.response.status, 200)
    assert.equal(await PasswordReset.countDocuments({ email: 'integration-user@example.com' }), 0)

    const reused = await request('/api/user/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: validToken, newPassword: 'Reset5678' })
    })
    assert.equal(reused.response.status, 400)
    assert.equal(reused.body.message, 'Invalid or expired reset token')

    const expiredToken = `expired-${Date.now()}`
    await PasswordReset.create({
        userId: (await User.findOne({ userName: 'integration-user' }))._id,
        email: 'integration-user@example.com',
        token: crypto.createHash('sha256').update(expiredToken).digest('hex'),
        createdAt: new Date(Date.now() - 60 * 60 * 1000 - 1000)
    })
    const expiredResponse = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(body) {
            this.body = body
            return this
        }
    }
    await resetPassword({ body: { token: expiredToken, newPassword: 'Reset9999' } }, expiredResponse)
    assert.equal(expiredResponse.statusCode, 400)
    assert.equal(expiredResponse.body.message, 'Invalid or expired reset token')
})