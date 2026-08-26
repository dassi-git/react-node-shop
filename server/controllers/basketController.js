const Basket = require("../models/Basket")
const Product = require("../models/Product")
const { resolveSeasonalSelections } = require('../services/fruitSeasonService')

const validateOptions = (product, selectedOptions = {}) => {
    const normalized = {}
    let adjustment = 0
    for (const option of product.customizationOptions || []) {
        const selected = selectedOptions[option.name]
        const values = Array.isArray(selected) ? selected : selected ? [selected] : []
        if (option.required && values.length === 0) throw new Error(`יש לבחור ${option.name}`)
        if (option.selectionType === 'single' && values.length > 1) throw new Error(`ניתן לבחור ערך אחד בלבד ב-${option.name}`)
        if (option.maxSelections && values.length > option.maxSelections) throw new Error(`ניתן לבחור עד ${option.maxSelections} אפשרויות ב-${option.name}`)
        const validValues = values.map((value) => option.values.find((item) => item.value === value && item.active !== false))
        if (validValues.some((value) => !value)) throw new Error(`בחירה לא זמינה ב-${option.name}`)
        normalized[option.name] = option.selectionType === 'single' ? (values[0] || '') : values
        adjustment += validValues.reduce((sum, value) => sum + Number(value?.priceAdjustment || 0), 0)
        if (option.selectionType === 'multiple' && values.length > 1) adjustment += (values.length - 1) * Number(option.additionalSelectionPrice || 0)
    }
    return { selectedOptions: normalized, adjustment }
}

const getId = async (req, res) => {
    try {
        const userId = req.user._id
        const myBasket = await Basket.findOne({ userId: userId }).populate({
            path: 'Products.type',
            select: 'name price body image productExist' 
        });
        
        if (!myBasket) {
            return res.json([]);
        }
        
        const populatedProductsArray = myBasket.Products.map(item => {
            if (!item.type) {
                return null;
            }
            return {
                ...item.type.toObject(),
                quantity: item.quantity,
                price: Number(item.type.price || 0) + Number(item.optionPriceAdjustment || 0),
                selectedOptions: item.selectedOptions || {},
                seasonalSnapshot: item.seasonalSnapshot || [],
                seasonalDate: item.seasonalDate || null,
                _basketItemId: item._id
            };
        })
        
        return res.json(populatedProductsArray)
    } catch (error) {
        console.error('Error fetching basket:', error)
        return res.status(500).json({ message: 'Server error fetching basket' })
    }
}

const deletebasket = async (req, res) => {
    try {
        const { id } = req.params
        const myBasket = await Basket.findOne({ userId: req.user._id })
        
        if (!myBasket) {
            return res.status(404).json({ message: "Basket not found" })
        }
        
        const delate = myBasket.Products.find((p) => {
            return p._id.toString() === id || p.type.toString() === id
        })
        
        if (!delate) {
            return res.status(404).json({ message: "Product not found in basket" })
        }
        
        if (delate.quantity > 1) {
            delate.quantity--
        } else {
            myBasket.Products = myBasket.Products.filter((p) => {
                return p._id.toString() !== id && p.type.toString() !== id
            })
        }
        
        const save = await myBasket.save()
        return res.json(save)
    } catch (error) {
        console.error('Error deleting from basket:', error)
        return res.status(500).json({ message: 'Server error deleting from basket' })
    }
}

const deleteAllbasket = async (req, res) => {
    try {
        const myBasket = await Basket.findOne({ userId: req.user._id })

        if (!myBasket) {
            return res.status(404).json({ message: "Basket not found" })
        }

        const save = await myBasket.deleteOne()
        return res.json(save)
    } catch (error) {
        console.error('Error deleting basket:', error)
        return res.status(500).json({ message: 'Server error deleting basket' })
    }
}

const updateBasket = async (req, res) => {
    try {
        const { id } = req.params
        const selectedOptions = req.body?.selectedOptions || {}
        const seasonalDate = req.body?.seasonalDate ? new Date(req.body.seasonalDate) : new Date()
        if (Number.isNaN(seasonalDate.getTime())) return res.status(400).json({ message: 'תאריך עונתי אינו תקין' })
        
        const myProduct = await Product.findOne({ _id: id })
        if (!myProduct) {
            return res.status(404).json({ message: "המוצר לא נמצא במערכת" })
        }
        
        if (myProduct.productExist === "OUTOFSTOCK" || myProduct.productExist === "0" || myProduct.quantity <= 0) {
            return res.status(400).json({ 
                message: "מצטערים, המוצר אזל מהמלאי",
                productName: myProduct.name,
                outOfStock: true
            })
        }
        
        if (myProduct.productExist === "LOWSTOCK") {
            console.log(`Warning: Product ${myProduct.name} has low stock`)
        }
        
        let myBasket = await Basket.findOne({ userId: req.user._id })
        if (!myBasket) {
            myBasket = await Basket.create({ userId: req.user._id })
        }
        
        let validatedOptions
        try {
            validatedOptions = validateOptions(myProduct, selectedOptions)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }
        let seasonalSelections
        try {
            seasonalSelections = await resolveSeasonalSelections(myProduct, validatedOptions.selectedOptions, seasonalDate)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }
        const optionKey = JSON.stringify(validatedOptions.selectedOptions)
        const existingProduct = myBasket.Products.find((p) => p.type.toString() === id && JSON.stringify(p.selectedOptions || {}) === optionKey && String(p.seasonalDate || '') === String(seasonalDate))
        
        if (existingProduct) {
            if (existingProduct.quantity >= myProduct.quantity && myProduct.quantity > 0) {
                return res.status(400).json({ message: "לא ניתן להוסיף מעבר לכמות הקיימת במלאי", productName: myProduct.name, outOfStock: true })
            }
            existingProduct.quantity++
        } else {
            myBasket.Products.push({ type: myProduct._id, quantity: 1, selectedOptions: validatedOptions.selectedOptions, optionPriceAdjustment: validatedOptions.adjustment + seasonalSelections.adjustment, seasonalSnapshot: seasonalSelections.snapshots, seasonalDate })
        }
        
        const result = await myBasket.save()
        
        res.json({ 
            message: "המוצר נוסף לסל בהצלחה", 
            basket: myBasket,
            productName: myProduct.name,
            stockStatus: myProduct.productExist
        })
    } catch (error) {
        console.error('Error updating basket:', error)
        return res.status(500).json({ message: 'Server error updating basket' })
    }
}

const creatProduct = async (req, res) => {
    try {
        const userId = req.user._id
        const myBasket = await Basket.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId, Products: [] } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
        return res.json(myBasket)
    } catch (error) {
        console.error('Error creating basket:', error)
        return res.status(500).json({ message: 'Server error creating basket' })
    }
}





module.exports = { deletebasket, updateBasket, creatProduct, deleteAllbasket, getId }






