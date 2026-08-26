const mongoose = require("mongoose")

const customizationValueSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    fruitKey: { type: String, trim: true, lowercase: true, default: '' },
    priceAdjustment: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
}, { _id: false })

const customizationOptionSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    selectionType: { type: String, enum: ["single", "multiple"], default: "single" },
    required: { type: Boolean, default: false },
    maxSelections: { type: Number, min: 1, default: null },
    additionalSelectionPrice: { type: Number, min: 0, default: 0 },
    sortOrder: { type: Number, default: 0 },
    values: { type: [customizationValueSchema], default: [] }
}, { _id: false })

const productFruitSchema = new mongoose.Schema({
    fruitKey: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true }
}, { _id: false })

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
        images: {
            type: [String],
            default: [],
            validate: {
                validator: (images) => images.length <= 7,
                message: 'A product can have at most 7 images.'
            }
        },
        bundleTag: {
            type: String,
            default: ""
        },
        isFeatured: {
            type: Boolean,
            default: false
        },
        customizationOptions: {
            type: [customizationOptionSchema],
            default: []
        },
        fruitConfiguration: {
            enabled: { type: Boolean, default: false },
            selectionMode: { type: String, enum: ['fixed', 'customer'], default: 'fixed' },
            selectionCount: { type: Number, min: 1, default: 1 },
            additionalSelectionPrice: { type: Number, min: 0, default: 0 },
            fruits: { type: [productFruitSchema], default: [] }
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model("Product", productScema)
