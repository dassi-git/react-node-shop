const Product = require("../models/Product")

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

        if (req.file) {
            updateProduct1.image = `/uploads/${req.file.filename}`
        } else if (image) {
            updateProduct1.image = image
        }

        const result = await updateProduct1.save()
        return res.json(result)
    } catch (error) {
        console.error('Error updating product:', error)
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

        let imageUrl = ''
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`
        } else if (req.body.image) {
            imageUrl = req.body.image
        }

        const normalizedStock = inventoryStatus || productExist || productExit || 'INSTOCK'

        const product1 = await Product.create({
            name,
            price,
            quantity: Number(quantity) || 0,
            body,
            category: category || 'General',
            rating: Number(rating) || 4.5,
            inventoryStatus: normalizedStock,
            productExist: normalizedStock,
            image: imageUrl
        })

        return res.json(product1)
    } catch (error) {
        console.error('Error creating product:', error)
        return res.status(500).json({ message: 'Server error creating product' })
    }
}

module.exports = { deleteProduct, updateProduct, creatProduct, getAllProducts, getId }

