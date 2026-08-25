const Bundle = require('../models/Bundle')
const Product = require('../models/Product')

const getAllBundles = async (req, res) => {
    try {
        const bundles = await Bundle.find({ isActive: true }).populate('productIds').lean()
        return res.json(bundles)
    } catch (error) {
        console.error('Error fetching bundles:', error)
        return res.status(500).json({ message: 'Server error fetching bundles' })
    }
}

const createBundle = async (req, res) => {
    try {
        const { title, description, discountPercent, productIds } = req.body

        if (!title || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'Title and at least one product are required' })
        }

        const validProductIds = [...new Set(productIds)]
        const products = await Product.find({ _id: { $in: validProductIds } })

        if (products.length !== validProductIds.length) {
            return res.status(400).json({ message: 'One or more product IDs are invalid' })
        }

        const bundle = await Bundle.create({
            title,
            description: description || '',
            discountPercent: Number(discountPercent) || 0,
            productIds: validProductIds,
            createdBy: req.user?._id
        })

        return res.status(201).json(bundle)
    } catch (error) {
        console.error('Error creating bundle:', error)
        return res.status(500).json({ message: 'Server error creating bundle' })
    }
}

const deleteBundle = async (req, res) => {
    try {
        const { id } = req.params
        const bundle = await Bundle.findById(id)

        if (!bundle) {
            return res.status(404).json({ message: 'Bundle not found' })
        }

        bundle.isActive = false
        await bundle.save()

        return res.json({ message: 'Bundle deleted' })
    } catch (error) {
        console.error('Error deleting bundle:', error)
        return res.status(500).json({ message: 'Server error deleting bundle' })
    }
}

module.exports = { getAllBundles, createBundle, deleteBundle }
