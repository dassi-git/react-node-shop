const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'cash', 'bank_transfer'],
        default: 'card'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true })

module.exports = mongoose.model('Payment', paymentSchema)
