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
        enum: ['card', 'stripe', 'paypal', 'cash', 'bank_transfer'],
        default: 'card'
    },
    provider: {
        type: String,
        enum: ['internal', 'stripe', 'paypal'],
        default: 'internal'
    },
    providerPaymentId: {
        type: String,
        default: ''
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

paymentSchema.index(
    { provider: 1, providerPaymentId: 1 },
    { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string', $ne: '' } } }
)
paymentSchema.index({ orderId: 1, createdAt: -1 })

module.exports = mongoose.model('Payment', paymentSchema)
