const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const paymentController = require('../controllers/paymentController')

router.post('/', verifyJWT, paymentController.createPayment)
router.post('/stripe/checkout', verifyJWT, paymentController.createStripeCheckout)
router.post('/stripe/complete/:sessionId', verifyJWT, paymentController.completeStripeCheckout)
router.post('/paypal/order', verifyJWT, paymentController.createPaypalOrder)
router.post('/paypal/capture/:orderId', verifyJWT, paymentController.capturePaypalOrder)
router.get('/order/:orderId', verifyJWT, paymentController.getPaymentsForOrder)
router.put('/:id/confirm', [verifyJWT, admin], paymentController.confirmPayment)

module.exports = router
