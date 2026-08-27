const test = require('node:test')
const assert = require('node:assert/strict')

const { app } = require('./server')

let server
let baseUrl

test.before(async () => {
    server = await new Promise((resolve) => {
        const instance = app.listen(0, () => resolve(instance))
    })
    baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('login limiter blocks the sixth request from one IP', async () => {
    let lastResponse
    for (let attempt = 0; attempt < 6; attempt += 1) {
        lastResponse = await fetch(`${baseUrl}/api/user/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({})
        })
    }

    assert.equal(lastResponse.status, 429)
})

test('register limiter blocks the fourth request from one IP', async () => {
    let lastResponse
    for (let attempt = 0; attempt < 4; attempt += 1) {
        lastResponse = await fetch(`${baseUrl}/api/user/register`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({})
        })
    }

    assert.equal(lastResponse.status, 429)
})