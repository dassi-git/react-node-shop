require("dotenv").config()
const express=require("express")
const cors= require("cors")
const helmet = require("helmet")
const corsOption=require("./config/corsOptions")
const connectDB=require("./config/dbconn")
const logger = require("./config/logger")
const { default: mongoose } = require("mongoose")
const PORT =process.env.PORT || 1003
const app=express()

connectDB()

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
)
app.use(cors(corsOption))
app.use(express.static("public"))
app.use(express.json())

app.use("/api/user",require("./routes/user"))
app.use("/api/product",require("./routes/product"))
app.use("/api/bundle",require("./routes/bundle"))
app.use("/api/basket",require("./routes/basket"))
app.use("/api/order", require("./routes/order"))
app.use("/api/quote", require("./routes/quote"))
app.use("/api/payment", require("./routes/payment"))

app.use((err, req, res, next) => {
    logger.error('Error:', { message: err.message, stack: err.stack })
    
    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    
    res.status(statusCode).json({
        success: false,
        message: message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
})

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    })
})

mongoose.connection.once('open',()=>{
    logger.info('Connected to MongoDB');
    app.listen(PORT,()=> logger.info(`Server running on port ${PORT}`))
})
mongoose.connection.on('error',err=>{
    logger.error('MongoDB connection error:', err);
})
