const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'fruit-season-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const FruitSeason = require('./models/FruitSeason')

let mongoServer
let server
let baseUrl
let adminToken

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

const jsonOptions = (method, body, token = adminToken) => ({
    method,
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
})

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    const adminUser = await User.create({
        name: 'Fruit Season Admin',
        userName: 'fruit-season-admin',
        address: 'Season Street',
        phone: '0501234567',
        email: 'fruit-season-admin@example.com',
        password,
        role: 'Admin'
    })
    adminToken = jwt.sign({
        _id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        userName: adminUser.userName,
        role: adminUser.role
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

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

test('season boundaries are inclusive and overlapping active seasons are rejected', async () => {
    const season = await request('/api/fruit-season', jsonOptions('POST', {
        fruitKey: 'mango',
        displayName: 'מנגו',
        validFrom: '2026-08-01T00:00:00.000Z',
        validUntil: '2026-08-31T23:59:59.999Z',
        status: 'available'
    }))
    assert.equal(season.response.status, 201)

    const atStart = await request('/api/fruit-season?date=2026-08-01T00:00:00.000Z')
    assert.equal(atStart.response.status, 200)
    assert.equal(atStart.body.seasons[0].fruitKey, 'mango')

    const atEnd = await request('/api/fruit-season?date=2026-08-31T23:59:59.999Z')
    assert.equal(atEnd.response.status, 200)
    assert.equal(atEnd.body.seasons[0].fruitKey, 'mango')

    const overlap = await request('/api/fruit-season', jsonOptions('POST', {
        fruitKey: 'MANGO',
        displayName: 'מנגו נוסף',
        validFrom: '2026-08-15T00:00:00.000Z',
        validUntil: '2026-09-01T00:00:00.000Z',
        status: 'premium',
        priceAdjustment: 4
    }))
    assert.equal(overlap.response.status, 409)
    assert.equal(await FruitSeason.countDocuments({ fruitKey: 'mango' }), 1)
})

test('non-premium seasons reject forged price adjustments', async () => {
    const forged = await request('/api/fruit-season', jsonOptions('POST', {
        fruitKey: 'apple',
        displayName: 'תפוח',
        validFrom: '2026-09-01T00:00:00.000Z',
        validUntil: '2026-09-30T23:59:59.999Z',
        status: 'available',
        priceAdjustment: 99
    }))
    assert.equal(forged.response.status, 400)
    assert.equal(await FruitSeason.countDocuments({ fruitKey: 'apple' }), 0)
})

test('season update and delete reject invalid IDs before database access', async () => {
    const update = await request('/api/fruit-season/not-an-object-id', jsonOptions('PUT', {}))
    assert.equal(update.response.status, 400)
    assert.deepEqual(update.body, { message: 'Invalid season ID.' })

    const remove = await request('/api/fruit-season/not-an-object-id', jsonOptions('DELETE', {}))
    assert.equal(remove.response.status, 400)
    assert.deepEqual(remove.body, { message: 'Invalid season ID.' })
})