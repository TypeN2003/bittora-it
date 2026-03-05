const express = require('express')
const controller = require('../controllers/categoryApiController')

const router = express.Router()

router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)
router.post('/:id/update', controller.update)
router.post('/:id/delete', controller.remove)

module.exports = router
