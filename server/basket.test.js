const test = require('node:test')
const assert = require('node:assert/strict')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

mongoose.set('bufferTimeoutMS', 100)
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'basket-test-secret'

const { app } = require('./server')
const User = require('./models/User')
const Product = require('./models/Product')
const Basket = require('./models/Basket')

let mongoServer
let server
let baseUrl
let user
let userToken
let product

const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, options)
    return { response, body: await response.json() }
}

const authHeaders = { Authorization: '' }

const jsonOptions = (method, body) => ({
    method,
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(body)
})

test.before(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    await mongoose.connect(mongoServer.getUri(), { serverSelectionTimeoutMS: 5000 })

    const password = await bcrypt.hash('Test1234', 10)
    user = await User.create({
        name: 'Basket Test User',
        userName: 'basket-user',
        address: 'Test Street',
        phone: '0501234567',
        email: 'basket-user@example.com',
        password
    })
    userToken = jwt.sign({
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        userName: user.userName,
        role: user.role
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    authHeaders.Authorization = `Bearer ${userToken}`

    product = await Product.create({
        name: 'Basket Test Product',
        price: 25,
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

test('basket supports create, quantity changes, item removal, and clearing', async () => {
    const created = await request('/api/basket', jsonOptions('POST', {}))
    assert.equal(created.response.status, 200)
    assert.equal(created.body.Products.length, 0)

    const firstAdd = await request(`/api/basket/${product._id}`, jsonOptions('PUT', {}))
    assert.equal(firstAdd.response.status, 200)
    assert.equal(firstAdd.body.basket.Products.length, 1)
    assert.equal(firstAdd.body.basket.Products[0].quantity, 1)

    const secondAdd = await request(`/api/basket/${product._id}`, jsonOptions('PUT', {}))
    assert.equal(secondAdd.response.status, 200)
    assert.equal(secondAdd.body.basket.Products[0].quantity, 2)

    const storedAfterAdd = await Basket.findOne({ userId: user._id }).lean()
    assert.equal(storedAfterAdd.Products.length, 1)
    assert.equal(storedAfterAdd.Products[0].quantity, 2)

    const basketItemId = storedAfterAdd.Products[0]._id.toString()
    const decrement = await request(`/api/basket/${basketItemId}`, { method: 'DELETE', headers: authHeaders })
    assert.equal(decrement.response.status, 200)
    assert.equal(decrement.body.Products[0].quantity, 1)

    const remove = await request(`/api/basket/${basketItemId}`, { method: 'DELETE', headers: authHeaders })
    assert.equal(remove.response.status, 200)
    assert.equal(remove.body.Products.length, 0)

    const readd = await request(`/api/basket/${product._id}`, jsonOptions('PUT', {}))
    assert.equal(readd.response.status, 200)
    const cleared = await request('/api/basket', { method: 'DELETE', headers: authHeaders })
    assert.equal(cleared.response.status, 200)
    assert.equal((await Basket.findOne({ userId: user._id })), null)

    const empty = await request('/api/basket', { headers: authHeaders })
    assert.equal(empty.response.status, 200)
    assert.deepEqual(empty.body, [])
})

test('basket keeps different customization selections as separate priced items', async () => {
    const customizedProduct = await Product.create({
        name: 'Customized Basket Product',
        price: 40,
        quantity: 5,
        productExist: 'INSTOCK',
        inventoryStatus: 'INSTOCK',
        customizationOptions: [{
            name: 'גודל',
            selectionType: 'multiple',
            required: true,
            maxSelections: 2,
            additionalSelectionPrice: 3,
            values: [
                { label: 'קטן', value: 'small', priceAdjustment: 2 },
                { label: 'גדול', value: 'large', priceAdjustment: 5 },
                { label: 'מתנה', value: 'gift', priceAdjustment: 3 }
            ]
        }]
    })

    const first = await request(`/api/basket/${customizedProduct._id}`, jsonOptions('PUT', {
        selectedOptions: { גודל: ['small'] }
    }))
    assert.equal(first.response.status, 200)

    const second = await request(`/api/basket/${customizedProduct._id}`, jsonOptions('PUT', {
        selectedOptions: { גודל: ['large', 'gift'] }
    }))
    assert.equal(second.response.status, 200)

    const stored = await Basket.findOne({ userId: user._id }).lean()
    const customizedItems = stored.Products.filter((item) => item.type.toString() === customizedProduct._id.toString())
    assert.equal(customizedItems.length, 2)
    assert.deepEqual(customizedItems.map((item) => item.selectedOptions.גודל), [['small'], ['large', 'gift']])
    assert.deepEqual(customizedItems.map((item) => item.optionPriceAdjustment).sort((a, b) => a - b), [2, 11])
})
