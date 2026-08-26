const mongoose = require("mongoose")

const productScema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        body: {
            type: String,
            default: ""
        },
        category: {
            type: String,
            default: "General"
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 4.5
        },
        quantity: {
            type: Number,
            min: 0,
            default: 0
        },
        productExist: {
            type: String,
            enum: ["INSTOCK", "LOWSTOCK", "OUTOFSTOCK"],
            default: "INSTOCK",
        },
        inventoryStatus: {
            type: String,
            enum: ["INSTOCK", "LOWSTOCK", "OUTOFSTOCK"],
            default: "INSTOCK",
        },
        image: {
            type: String,
            default: ""
        },
        bundleTag: {
            type: String,
            default: ""
        },
        isFeatured: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("Product", productScema)
