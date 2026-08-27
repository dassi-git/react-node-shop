const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const paymentController = require('../controllers/paymentController')
const { paymentLimiter } = require('../middleware/rateLimiter')

router.post('/', [paymentLimiter, verifyJWT], paymentController.createPayment)
// Temporary fallback until a business payment provider is configured.
router.post('/manual', [paymentLimiter, verifyJWT], paymentController.createManualPayment)
router.post('/stripe/checkout', [paymentLimiter, verifyJWT], paymentController.createStripeCheckout)
router.post('/stripe/complete/:sessionId', [paymentLimiter, verifyJWT], paymentController.completeStripeCheckout)
router.post('/paypal/order', [paymentLimiter, verifyJWT], paymentController.createPaypalOrder)
router.post('/paypal/capture/:orderId', [paymentLimiter, verifyJWT], paymentController.capturePaypalOrder)
router.get('/order/:orderId', verifyJWT, paymentController.getPaymentsForOrder)
router.put('/:id/confirm', [paymentLimiter, verifyJWT, admin], paymentController.confirmPayment)

module.exports = router
