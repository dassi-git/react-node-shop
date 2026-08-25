const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const seedDevelopmentProducts = async () => {
  if (process.env.NODE_ENV !== 'development') return

  const Product = require('../models/Product')
  const productCount = await Product.countDocuments()
  if (productCount > 0) return

  await Product.insertMany([
    {
      name: 'מגש פירות טרופיים',
      price: 129,
      body: 'מבחר פירות טרופיים טריים לעיצוב שולחן מרשים.',
      category: 'מגשי פירות',
      productExist: 'INSTOCK',
      inventoryStatus: 'INSTOCK',
      rating: 4.8,
      image: ''
    },
    {
      name: 'סלסלת פירות פרימיום',
      price: 189,
      body: 'סלסלה חגיגית עם פירות העונה באיכות גבוהה.',
      category: 'סלסלות',
      productExist: 'INSTOCK',
      inventoryStatus: 'INSTOCK',
      rating: 4.9,
      image: ''
    },
    {
      name: 'עיצוב פירות לאירוח',
      price: 249,
      body: 'עיצוב צבעוני ומרשים לאירועים, מתנות ואירוח.',
      category: 'עיצובים לאירועים',
      productExist: 'LOWSTOCK',
      inventoryStatus: 'LOWSTOCK',
      rating: 4.7,
      image: ''
    }
  ])
  console.log('Development products seeded')
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.DATABASE_URI || 'mongodb://localhost:27017/329166185'
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    })
    await seedDevelopmentProducts()
    console.log('Connected to MongoDB successfully')
  } catch (err) {
    console.log('Local MongoDB not available, starting in-memory MongoDB...')
    try {
      const mongoServer = await MongoMemoryServer.create()
      const uri = mongoServer.getUri()
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      })
      await seedDevelopmentProducts()
      console.log('Connected to in-memory MongoDB successfully')
    } catch (memoryErr) {
      console.error('Failed to connect to MongoDB and memory DB:', memoryErr)
    }
  }
}

module.exports = connectDB