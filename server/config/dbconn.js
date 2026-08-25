const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const connectDB = async () => {
  try {
    const mongoUri = process.env.DATABASE_URI || 'mongodb://localhost:27017/329166185'
    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB successfully')
  } catch (err) {
    console.log('Local MongoDB not available, starting in-memory MongoDB...')
    try {
      const mongoServer = await MongoMemoryServer.create()
      const uri = mongoServer.getUri()
      await mongoose.connect(uri)
      console.log('Connected to in-memory MongoDB successfully')
    } catch (memoryErr) {
      console.error('Failed to connect to MongoDB and memory DB:', memoryErr)
    }
  }
}

module.exports = connectDB