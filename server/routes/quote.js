const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const quoteController = require('../controllers/quoteController')

router.post('/', [verifyJWT, admin], quoteController.createQuote)
router.get('/order/:orderId', verifyJWT, quoteController.getQuotesForOrder)
router.put('/:id/accept', verifyJWT, quoteController.acceptQuote)
router.put('/:id/reject', verifyJWT, quoteController.rejectQuote)

module.exports = router
