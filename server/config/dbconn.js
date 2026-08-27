const mongoose = require('mongoose')
const { MongoMemoryReplSet } = require('mongodb-memory-server')

const ensureModelIndexes = async () => {
  ;[
    '../models/User',
    '../models/Product',
    '../models/Basket',
    '../models/Bundle',
    '../models/Order',
    '../models/Quote',
    '../models/Payment',
    '../models/FruitSeason',
    '../models/PasswordReset'
  ].forEach((modelPath) => require(modelPath))
  await Promise.all(mongoose.modelNames().map((modelName) => mongoose.model(modelName).createIndexes()))
}

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
      quantity: 100,
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
      quantity: 100,
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
      quantity: 25,
      productExist: 'LOWSTOCK',
      inventoryStatus: 'LOWSTOCK',
      rating: 4.7,
      image: ''
    }
  ])
  console.log('Development products seeded')
}

const connectDB = async () => {
  const configuredUri = process.env.DATABASE_URI || process.env.MONGO_URI
  if (process.env.NODE_ENV === 'production' && !configuredUri) {
    throw new Error('DATABASE_URI or MONGO_URI must be configured in production')
  }

  try {
    if (!configuredUri) throw new Error('No MongoDB URI configured')
    await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
    })
    await seedDevelopmentProducts()
    await ensureModelIndexes()
    return mongoose.connection
  } catch (err) {
    if (process.env.NODE_ENV === 'production') throw err

    console.warn('Local MongoDB not available, starting in-memory MongoDB...')
    try {
      const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
      const uri = mongoServer.getUri()
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      })
      await seedDevelopmentProducts()
      await ensureModelIndexes()
      return mongoose.connection
    } catch (memoryErr) {
      memoryErr.message = `Failed to connect to MongoDB and memory DB: ${memoryErr.message}`
      throw memoryErr
    }
  }
}

module.exports = connectDB