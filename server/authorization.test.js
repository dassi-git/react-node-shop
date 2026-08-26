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