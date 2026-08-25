const mongoose = require('mongoose')
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const User = require('../models/User')

const run = async () => {
  try {
    const uri = process.env.DATABASE_URI || 'mongodb://localhost:27017/329166185'
    await mongoose.connect(uri)
    console.log('Connected to DB')

    const res = await User.findOneAndUpdate({ userName: 'admin' }, { role: 'Admin' }, { new: true })
    if (!res) {
      console.log('User admin not found')
    } else {
      console.log('Promoted user:', res.userName, 'role=', res.role)
    }

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
