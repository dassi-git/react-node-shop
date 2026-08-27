const allowedOrigins = (process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',')
    : [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    ]).map((origin) => origin.trim()).filter(Boolean)

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}

module.exports = corsOptions 