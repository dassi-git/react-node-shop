const mongoose = require('mongoose')

const quoteSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    quotePrice: {
        type: Number,
        required: true,
        min: 0
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: 0
    },
    depositAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        default: ''
    },
    validUntil: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['sent', 'accepted', 'rejected'],
        default: 'sent'
    }
}, { timestamps: true })

module.exports = mongoose.model('Quote', quoteSchema)
