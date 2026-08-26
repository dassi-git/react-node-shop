const mongoose = require('mongoose')

const fruitSeasonSchema = new mongoose.Schema({
    fruitKey: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    status: { type: String, enum: ['available', 'premium', 'unavailable'], required: true, default: 'available' },
    priceAdjustment: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    customerMessage: { type: String, default: '', trim: true },
    internalNote: { type: String, default: '', trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true })

fruitSeasonSchema.index({ fruitKey: 1, validFrom: 1, validUntil: 1 })

module.exports = mongoose.model('FruitSeason', fruitSeasonSchema)