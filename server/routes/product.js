const express = require("express")
const router = express.Router()
const verifyJWT = require("../middleware/verifyJwt")
const admin = require("../middleware/admin")

const productController = require("../controllers/productController")

router.get("/", productController.getAllProducts)

// Development-only seed endpoint to insert example products
if (process.env.NODE_ENV === 'development') {
	router.get('/seed', async (req, res) => {
		try {
			const Product = require('../models/Product')
			const sample = [
				{ name: 'Sample Product A', price: 9.99, body: 'Example A', productExist: 'INSTOCK', image: '' },
				{ name: 'Sample Product B', price: 19.99, body: 'Example B', productExist: 'LOWSTOCK', image: '' },
				{ name: 'Sample Product C', price: 29.99, body: 'Example C', productExist: 'OUTOFSTOCK', image: '' }
			]
			await Product.deleteMany({})
			const created = await Product.insertMany(sample)
			return res.json({ created })
		} catch (err) {
			console.error(err)
			return res.status(500).json({ message: 'Seed failed' })
		}
	})
}

router.get("/:id", productController.getId)

router.delete("/:id", [verifyJWT, admin], productController.deleteProduct)
router.put("/", [verifyJWT, admin], productController.updateProduct)
router.post("/", [verifyJWT, admin], productController.creatProduct)

// Development-only seed endpoint to insert example products
if (process.env.NODE_ENV === 'development') {
	router.get('/seed', async (req, res) => {
		try {
			const Product = require('../models/Product')
			const sample = [
				{ name: 'Sample Product A', price: 9.99, body: 'Example A', productExit: 'INSTOCK', image: '' },
				{ name: 'Sample Product B', price: 19.99, body: 'Example B', productExit: 'LOWSTOCK', image: '' },
				{ name: 'Sample Product C', price: 29.99, body: 'Example C', productExit: 'OUTOFSTOCK', image: '' }
			]
			await Product.deleteMany({})
			const created = await Product.insertMany(sample)
			return res.json({ created })
		} catch (err) {
			console.error(err)
			return res.status(500).json({ message: 'Seed failed' })
		}
	})
}


module.exports = router
