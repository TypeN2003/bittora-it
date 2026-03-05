const db = require('../models')

async function recalculateOrderTotal(orderId) {
  const items = await db.OrderItem.findAll({ where: { order_id: orderId } })
  const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  await db.Order.update({ total_price: total }, { where: { order_id: orderId } })
}

exports.list = async (_req, res) => {
  const items = await db.OrderItem.findAll({
    include: [{ model: db.Order, include: [{ model: db.User }] }, { model: db.Product }],
    order: [['order_item_id', 'DESC']]
  })
  res.json({ data: items })
}

exports.getOne = async (req, res) => {
  const item = await db.OrderItem.findByPk(req.params.id, {
    include: [{ model: db.Order, include: [{ model: db.User }] }, { model: db.Product }]
  })

  if (!item) {
    return res.status(404).json({ message: 'Order item not found' })
  }

  res.json({ data: item })
}

exports.create = async (req, res) => {
  const product = await db.Product.findByPk(req.body.product_id)
  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  const quantity = Math.max(1, Number(req.body.quantity || 1))
  const item = await db.OrderItem.create({
    order_id: Number(req.body.order_id),
    product_id: Number(req.body.product_id),
    quantity,
    subtotal: quantity * Number(product.price || 0)
  })

  await recalculateOrderTotal(item.order_id)
  res.status(201).json({ data: item })
}

exports.update = async (req, res) => {
  const item = await db.OrderItem.findByPk(req.params.id)
  if (!item) {
    return res.status(404).json({ message: 'Order item not found' })
  }

  const product = await db.Product.findByPk(req.body.product_id)
  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  const originalOrderId = Number(item.order_id)
  const nextOrderId = Number(req.body.order_id)
  const quantity = Math.max(1, Number(req.body.quantity || 1))

  await item.update({
    order_id: nextOrderId,
    product_id: Number(req.body.product_id),
    quantity,
    subtotal: quantity * Number(product.price || 0)
  })

  await recalculateOrderTotal(originalOrderId)
  if (originalOrderId !== nextOrderId) {
    await recalculateOrderTotal(nextOrderId)
  }

  res.json({ data: item })
}

exports.remove = async (req, res) => {
  const item = await db.OrderItem.findByPk(req.params.id)
  if (!item) {
    return res.status(404).json({ message: 'Order item not found' })
  }

  const orderId = Number(item.order_id)
  await item.destroy()
  await recalculateOrderTotal(orderId)

  res.json({ message: 'Order item deleted' })
}
