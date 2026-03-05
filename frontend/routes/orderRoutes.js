const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { requireAuth, requireAdmin } = require('../middlewares/auth')

router.get('/history', requireAuth, orderController.history)
router.get('/', requireAuth, orderController.index)
router.get('/realtime', requireAdmin, orderController.realtime)
router.get('/new', requireAdmin, orderController.newForm)
router.post('/quick', requireAdmin, orderController.quickOrder)
router.post('/', requireAdmin, orderController.create)
router.post('/delete-old', requireAdmin, orderController.deleteOld)
router.post('/:id/cancel', requireAdmin, orderController.cancel)
router.get('/:id', requireAdmin, orderController.show)
router.get('/:id/edit', requireAdmin, orderController.editForm)
router.put('/:id', requireAdmin, orderController.update)
router.delete('/:id', requireAdmin, orderController.delete)

module.exports = router
