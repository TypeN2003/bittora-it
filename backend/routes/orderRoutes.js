const express = require('express')
const controller = require('../controllers/orderApiController')

const router = express.Router()

router.get('/realtime', controller.realtime)
router.post('/quick', controller.quickOrder)
router.post('/checkout', controller.checkout)
router.post('/items', controller.addItem)
router.post('/delete-old', controller.deleteOld)
router.post('/:id/cancel', controller.cancel)
router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

module.exports = router
