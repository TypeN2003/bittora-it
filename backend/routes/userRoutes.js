const express = require('express')
const controller = require('../controllers/userApiController')

const router = express.Router()

router.post('/login', controller.login)
router.get('/', controller.list)
router.get('/:id', controller.getOne)
router.post('/', controller.create)
router.put('/:id', controller.update)
router.delete('/:id', controller.remove)

module.exports = router
