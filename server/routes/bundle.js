const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const bundleController = require('../controllers/bundleController')

router.get('/', bundleController.getAllBundles)
router.post('/', [verifyJWT, admin], bundleController.createBundle)
router.delete('/:id', [verifyJWT, admin], bundleController.deleteBundle)

module.exports = router
