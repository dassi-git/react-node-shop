const express = require('express')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJwt')
const admin = require('../middleware/admin')
const controller = require('../controllers/fruitSeasonController')

router.get('/', controller.getSeasonForDate)
router.get('/admin', [verifyJWT, admin], controller.getAllSeasons)
router.post('/', [verifyJWT, admin], controller.createSeason)
router.put('/:id', [verifyJWT, admin], controller.updateSeason)
router.delete('/:id', [verifyJWT, admin], controller.deleteSeason)

module.exports = router