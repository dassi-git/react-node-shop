const http = require('http')
const fs = require('fs')
const path = require('path')

const HOST = 'localhost'
const PORT = 8888

const login = () => new Promise((resolve, reject) => {
  const data = JSON.stringify({ userName: 'admin', password: 'Admin1234' })
  const opts = {
    hostname: HOST,
    port: PORT,
    path: '/api/user/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }
  const req = http.request(opts, res => {
    let b = ''
    res.on('data', c => b += c)
    res.on('end', () => {
      try {
        const json = JSON.parse(b)
        if (json.token) return resolve(json.token)
        return reject(new Error('No token in login response: ' + b))
      } catch (err) {
        return reject(err)
      }
    })
  })
  req.on('error', reject)
  req.write(data)
  req.end()
})

const upload = (token) => new Promise((resolve, reject) => {
  const boundary = '----NodeMultipartBoundary' + Date.now()
  const filePath = path.resolve(__dirname, '..', 'public', 'product-01.png')
  if (!fs.existsSync(filePath)) return reject(new Error('Test file not found: ' + filePath))
  const fileContent = fs.readFileSync(filePath)

  const parts = []
  function part(name, value) { return `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n` }
  parts.push(part('name', 'UploadFromScript'))
  parts.push(part('price', '1.23'))
  parts.push(part('body', 'Uploaded by script'))
  parts.push(part('productExit', 'INSTOCK'))
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="imageFile"; filename="${path.basename(filePath)}"\r\nContent-Type: image/png\r\n\r\n`)

  const pre = Buffer.from(parts.join(''))
  const post = Buffer.from(`\r\n--${boundary}--\r\n`)
  const contentLength = pre.length + fileContent.length + post.length

  const opts = {
    hostname: HOST,
    port: PORT,
    path: '/api/product',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': contentLength
    }
  }

  const req = http.request(opts, res => {
    let b = ''
    res.on('data', c => b += c)
    res.on('end', () => resolve({ status: res.statusCode, body: b }))
  })
  req.on('error', reject)
  req.write(pre)
  req.write(fileContent)
  req.write(post)
  req.end()
})

;(async ()=>{
  try {
    console.log('Logging in...')
    const token = await login()
    console.log('Got token, uploading file...')
    const res = await upload(token)
    console.log('Upload response status:', res.status)
    console.log('Body:', res.body)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
})()
