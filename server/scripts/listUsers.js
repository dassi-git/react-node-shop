const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const User = require('../models/User')

const run = async () => {
  try {
    const uri = process.env.DATABASE_URI || 'mongodb://localhost:27017/329166185'
    console.log('Connecting to MongoDB at', uri)
    await mongoose.connect(uri)
    console.log('Connected')

    const count = await User.countDocuments()
    console.log('Users count:', count)

    if (count > 0) {
      const users = await User.find().select('-password').limit(10).lean()
      console.log('Sample users:')
      console.dir(users, { depth: null })
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

run()
