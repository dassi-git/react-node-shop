const mongoose = require("mongoose")
const basketScema = new mongoose.Schema({
    userId: {
        type: mongoose.ObjectId,
        ref: "User",
        required: true,

    },
    Products: [{
        type: {
            type: mongoose.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            default: 1
        },
        selectedOptions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        optionPriceAdjustment: {
            type: Number,
            min: 0,
            default: 0
        },
        seasonalSnapshot: {
            type: mongoose.Schema.Types.Mixed,
            default: []
        },
        seasonalDate: {
            type: Date,
            default: null
        }
    }]

})

basketScema.index({ userId: 1 }, { unique: true })

module.exports = mongoose.model("basket", basketScema)