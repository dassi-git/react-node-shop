require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const corsOption = require('./config/corsOptions')
const connectDB = require('./config/dbconn')
const logger = require('./config/logger')
const mongoose = require('mongoose')
const { apiLimiter } = require('./middleware/rateLimiter')
const paymentController = require('./controllers/paymentController')

const PORT = Number(process.env.PORT) || 1003
const app = express()
app.disable('x-powered-by')

if (process.env.NODE_ENV === 'production' && !process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET must be configured in production')
}

if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL must be configured in production')
}

if (process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET must be configured when Stripe is enabled in production')
}

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
)
app.use(cors(corsOption))
app.use(express.static(path.join(__dirname, 'public')))
app.post('/api/payment/stripe/webhook', apiLimiter, express.raw({ type: 'application/json', limit: '1mb' }), paymentController.stripeWebhook)
app.use(express.json({ limit: '1mb' }))
app.use('/api', apiLimiter)

app.get('/health', (req, res) => {
    res.json({ status: 'ok' })
})

app.get('/ready', (req, res) => {
    const ready = mongoose.connection.readyState === 1
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database: ready ? 'connected' : 'disconnected' })
})

app.use("/api/user",require("./routes/user"))
app.use("/api/product",require("./routes/product"))
app.use("/api/bundle",require("./routes/bundle"))
app.use("/api/basket",require("./routes/basket"))
app.use("/api/order", require("./routes/order"))
app.use("/api/quote", require("./routes/quote"))
app.use("/api/payment", require("./routes/payment"))
app.use("/api/fruit-season", require("./routes/fruitSeason"))

app.use((err, req, res, next) => {
    logger.error('Unhandled request error', { message: err.message, stack: err.stack, path: req.path, method: req.method })

    const isMalformedJson = err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')
    const statusCode = isMalformedJson ? 400 : (err.name === 'MulterError' || err.message?.includes('Only JPEG, PNG and WebP')
        ? 400
        : (Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500))
    const message = statusCode === 500 && process.env.NODE_ENV !== 'development'
        ? 'Internal Server Error'
        : (err.message || 'Internal Server Error')

    res.status(statusCode).json({
        success: false,
        message: isMalformedJson ? 'Malformed JSON request body' : message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
})

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    })
})

const startServer = async () => {
    await connectDB()
    logger.info('Connected to MongoDB')

    const server = app.listen(PORT, () => logger.info(`Server running on port ${PORT}`))
    const shutdown = async (signal) => {
        logger.info(`Received ${signal}; shutting down`)
        server.close(async () => {
            await mongoose.connection.close()
            process.exit(0)
        })
    }

    process.once('SIGINT', () => shutdown('SIGINT'))
    process.once('SIGTERM', () => shutdown('SIGTERM'))
}

if (require.main === module) {
    startServer().catch((error) => {
        logger.error('Server startup failed', { message: error.message, stack: error.stack })
        process.exitCode = 1
    })
}

module.exports = { app, startServer }
