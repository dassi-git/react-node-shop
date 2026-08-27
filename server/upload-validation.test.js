const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'upload-validation-test-secret'

const { app } = require('./server')
const User = require('./models/User')

let mongoServer
let server
let baseUrl
let adminToken

const upload = async (blob, filename) => {
    const form = new FormData()
    form.append('name', 'Upload validation product')
    form.append('price', '10')
    form.append('imageFile', blob, filename)
    return fetch(`${baseUrl}/api/product`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form
    })
}

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })
    const password = await bcrypt.hash('Test1234', 10)
    const admin = await User.create({ name: 'Upload Admin', userName: 'upload-admin', address: 'Upload Street', phone: '0501234567', email: 'upload-admin@example.com', password, role: 'Admin' })
    adminToken = jwt.sign({ _id: admin._id.toString(), name: admin.name, userName: admin.userName, email: admin.email, role: admin.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
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

test('product upload rejects unsupported MIME types', async () => {
    const response = await upload(new Blob(['not an image'], { type: 'image/gif' }), 'test.gif')
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.match(body.message, /JPEG, PNG and WebP/i)
})

test('product upload rejects files larger than 5 MB', async () => {
    const response = await upload(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'too-large.png')
    const body = await response.json()

    assert.equal(response.status, 400)
    assert.match(body.message, /File too large/i)
})