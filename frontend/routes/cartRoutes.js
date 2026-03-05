const express = require('express')
const router = express.Router()
const cartController = require('../controllers/cartController')

router.get('/', cartController.index)
router.get('/checkout', cartController.checkoutPage)
router.post('/add', cartController.add)
router.post('/update', cartController.update)
router.post('/remove', cartController.remove)
router.post('/clear', cartController.clear)
router.post('/checkout/select', cartController.selectForCheckout)
router.post('/checkout', cartController.checkout)

module.exports = router
