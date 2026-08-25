const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const orderController = require('../controllers/orderController')

router.post('/', verifyJWT, orderController.createOrder)
router.get('/my', verifyJWT, orderController.getMyOrders)
router.get('/admin', [verifyJWT, admin], orderController.getAllOrders)
router.get('/:id', verifyJWT, orderController.getOrderById)
router.put('/:id/status', [verifyJWT, admin], orderController.updateOrderStatus)
router.post('/:id/accept-quote', verifyJWT, orderController.acceptQuote)

module.exports = router
