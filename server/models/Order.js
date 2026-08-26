const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    selectedOptions: {
        type: Object,
        default: {}
    },
    seasonalSnapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    customNotes: {
        type: String,
        default: ''
    },
    unitPrice: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    }
}, { _id: true })

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    status: {
        type: String,
        enum: [
            'draft',
            'quote_requested',
            'quote_sent',
            'quote_accepted',
            'quote_rejected',
            'payment_pending',
            'paid',
            'confirmed',
            'preparing',
            'ready_for_delivery',
            'in_delivery',
            'completed',
            'cancelled'
        ],
        default: 'quote_requested'
    },
    subtotal: {
        type: Number,
        default: 0
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number,
        default: 0
    },
    deliveryDate: {
        type: Date,
        default: null
    },
    deliveryAddress: {
        city: { type: String, default: '' },
        street: { type: String, default: '' },
        zipCode: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    notes: {
        type: String,
        default: ''
    },
    items: [orderItemSchema],
    quote: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote',
        default: null
    }
}, { timestamps: true })

orderSchema.index({ userId: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

module.exports = mongoose.model('Order', orderSchema)
