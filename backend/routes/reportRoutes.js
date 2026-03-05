const express = require('express')
const controller = require('../controllers/reportApiController')

const router = express.Router()

router.get('/', controller.index)
router.get('/sales', controller.sales)
router.get('/best-products', controller.bestProducts)

module.exports = router
