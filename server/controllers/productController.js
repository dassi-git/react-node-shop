const Product = require("../models/Product")

const getUploadedImages = (req) => [
    ...(req.files?.imageFiles || []),
    ...(req.files?.imageFile || [])
].map((file) => `/uploads/${file.filename}`)

const normalizeImages = (images) => {
    if (images === undefined) return undefined
    if (typeof images === 'string') {
        try { images = JSON.parse(images) } catch (error) { images = [images] }
    }
    if (!Array.isArray(images)) throw new Error('Images must be an array.')
    const normalized = images.map((image) => String(image).trim()).filter(Boolean)
    if (normalized.length > 7) throw new Error('A product can have at most 7 images.')
    return normalized
}

const normalizeCustomizationOptions = (options) => {
    if (options === undefined) return undefined
    if (typeof options === 'string') {
        try {
            options = JSON.parse(options)
        } catch (error) {
            throw new Error('Customization options must be valid JSON.')
        }
    }
    if (!Array.isArray(options)) throw new Error('Customization options must be an array.')
    return options.map((option) => {
        if (!option?.name || !Array.isArray(option.values)) throw new Error('Each customization option needs a name and values.')
        if (!['single', 'multiple'].includes(option.selectionType || 'single')) throw new Error('Invalid customization selection type.')
        return {
            name: String(option.name).trim(),
            selectionType: option.selectionType || 'single',
            required: Boolean(option.required),
            maxSelections: option.selectionType === 'multiple' && option.maxSelections ? Number(option.maxSelections) : null,
            additionalSelectionPrice: option.selectionType === 'multiple' ? Number(option.additionalSelectionPrice || 0) : 0,
            sortOrder: Number(option.sortOrder) || 0,
            values: option.values.map((value) => {
                const priceAdjustment = Number(value.priceAdjustment || 0)
                if (!value?.label || !value?.value || !Number.isFinite(priceAdjustment) || priceAdjustment < 0) {
                    throw new Error('Customization values require a label, value and valid non-negative price.')
                }
                const fruitKey = value.fruitKey ? String(value.fruitKey).trim().toLowerCase() : ''
                return { label: String(value.label).trim(), value: String(value.value).trim(), fruitKey, priceAdjustment, active: value.active !== false, sortOrder: Number(value.sortOrder) || 0 }
            })
        }
    })
}

const normalizeFruitConfiguration = (configuration) => {
    if (configuration === undefined) return undefined
    if (typeof configuration === 'string') configuration = JSON.parse(configuration)
    if (!configuration || typeof configuration !== 'object') throw new Error('Fruit configuration is invalid.')
    const fruits = Array.isArray(configuration.fruits) ? configuration.fruits : []
    const selectionMode = configuration.selectionMode === 'customer' ? 'customer' : 'fixed'
    const selectionCount = Number(configuration.selectionCount || 1)
    const additionalSelectionPrice = Number(configuration.additionalSelectionPrice || 0)
    if (configuration.enabled && (!Number.isInteger(selectionCount) || selectionCount < 1)) throw new Error('Fruit selection count must be a positive whole number.')
    if (!Number.isFinite(additionalSelectionPrice) || additionalSelectionPrice < 0) throw new Error('Additional fruit price is invalid.')
    if (configuration.enabled && fruits.length < selectionCount) throw new Error('The product needs enough allowed fruits for its selection count.')
    return { enabled: Boolean(configuration.enabled), selectionMode, selectionCount, additionalSelectionPrice, fruits: fruits.map((fruit) => ({ fruitKey: String(fruit.fruitKey || fruit.value || '').trim().toLowerCase(), displayName: String(fruit.displayName || fruit.label || '').trim(), active: fruit.active !== false })) }
}

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().lean()
        return res.json(products)
    } catch (error) {
        console.error('Error fetching products:', error)
        return res.status(500).json({ message: 'Server error fetching products' })
    }
}

const getId = async (req, res) => {
    try {
        const { id } = req.params
        const products = await Product.findOne({ _id: id })
        if (!products) {
            return res.status(404).json({ message: 'Product not found' })
        }
        return res.json(products)
    } catch (error) {
        console.error('Error fetching product by ID:', error)
        return res.status(500).json({ message: 'Server error fetching product' })
    }
}

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params
        const delate = await Product.findById({ _id: id })
        if (!delate) {
            return res.status(404).json({ message: "Product not found" })
        }
        const save = await delate.deleteOne()
        return res.json(save)
    } catch (error) {
        console.error('Error deleting product:', error)
        return res.status(500).json({ message: 'Server error deleting product' })
    }
}

const updateProduct = async (req, res) => {
    try {
        const { _id, name, price, body, category, rating, quantity, productExit, productExist, inventoryStatus, image } = req.body
        const updateProduct1 = await Product.findById(_id)

        if (!updateProduct1) {
            return res.status(404).json({ message: "Product not found" })
        }
        if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
            return res.status(400).json({ message: "Quantity must be a non-negative whole number" })
        }

        updateProduct1.name = name || updateProduct1.name
        updateProduct1.price = price ?? updateProduct1.price
        updateProduct1.quantity = quantity ?? updateProduct1.quantity
        updateProduct1.body = body ?? updateProduct1.body
        updateProduct1.category = category || updateProduct1.category || "General"
        updateProduct1.rating = rating ?? updateProduct1.rating ?? 4.5
        updateProduct1.inventoryStatus = inventoryStatus || productExist || productExit || updateProduct1.inventoryStatus || "INSTOCK"
        updateProduct1.productExist = updateProduct1.inventoryStatus
        const customizationOptions = normalizeCustomizationOptions(req.body.customizationOptions)
        if (customizationOptions !== undefined) updateProduct1.customizationOptions = customizationOptions
        const fruitConfiguration = normalizeFruitConfiguration(req.body.fruitConfiguration)
        if (fruitConfiguration !== undefined) updateProduct1.fruitConfiguration = fruitConfiguration
        const uploadedImages = getUploadedImages(req)
        const requestedImages = normalizeImages(req.body.images)
        if (requestedImages !== undefined || uploadedImages.length > 0) {
            const images = [...(requestedImages || []), ...uploadedImages]
            if (images.length > 7) return res.status(400).json({ message: 'A product can have at most 7 images.' })
            updateProduct1.images = images
            updateProduct1.image = images[0] || updateProduct1.image
        }

        if (image && requestedImages === undefined && uploadedImages.length === 0) {
            updateProduct1.image = image
        }

        const result = await updateProduct1.save()
        return res.json(result)
    } catch (error) {
        console.error('Error updating product:', error)
        if (error.message.toLowerCase().includes('customization') || error.message.toLowerCase().includes('image')) return res.status(400).json({ message: error.message })
        return res.status(500).json({ message: 'Server error updating product' })
    }
}

const creatProduct = async (req, res) => {
    try {
        const { name, price, body, category, rating, quantity, productExit, productExist, inventoryStatus } = req.body

        if (!name || price === undefined || price === null || Number(price) < 0) {
            return res.status(400).json({ message: "Name and price are required" })
        }
        if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
            return res.status(400).json({ message: "Quantity must be a non-negative whole number" })
        }

        const uploadedImages = getUploadedImages(req)
        const requestedImages = normalizeImages(req.body.images)
        const images = [...(requestedImages || []), ...uploadedImages]
        let imageUrl = images[0] || ''
        if (uploadedImages.length === 0 && req.body.image) {
            imageUrl = req.body.image
            images.unshift(imageUrl)
        }
        if (images.length > 7) return res.status(400).json({ message: 'A product can have at most 7 images.' })

        const normalizedStock = inventoryStatus || productExist || productExit || 'INSTOCK'
        const customizationOptions = normalizeCustomizationOptions(req.body.customizationOptions)
        const fruitConfiguration = normalizeFruitConfiguration(req.body.fruitConfiguration)

        const product1 = await Product.create({
            name,
            price,
            quantity: Number(quantity) || 0,
            body,
            category: category || 'General',
            rating: Number(rating) || 4.5,
            inventoryStatus: normalizedStock,
            productExist: normalizedStock,
            image: imageUrl,
            images,
            customizationOptions: customizationOptions || []
            ,fruitConfiguration: fruitConfiguration || undefined
        })

        return res.json(product1)
    } catch (error) {
        console.error('Error creating product:', error)
        if (error.message.toLowerCase().includes('customization') || error.message.toLowerCase().includes('image')) return res.status(400).json({ message: error.message })
        return res.status(500).json({ message: 'Server error creating product' })
    }
}

module.exports = { deleteProduct, updateProduct, creatProduct, getAllProducts, getId }

