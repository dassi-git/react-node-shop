const express = require("express")
const router = express.Router()
const verifyJWT = require("../middleware/verifyJwt")
const admin = require("../middleware/admin")

const productController = require("../controllers/productController")
const multer = require('multer')
const path = require('path')

// ensure uploads directory exists
const fs = require('fs')
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir)
	},
	filename: function (req, file, cb) {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1E9)
		cb(null, unique + path.extname(file.originalname))
	}
})
const upload = multer({ storage })

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
// Accept multipart/form-data with optional single file field `imageFile` on update
router.put("/", [verifyJWT, admin, upload.single('imageFile')], productController.updateProduct)
router.post("/", [verifyJWT, admin, upload.single('imageFile')], productController.creatProduct)

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
