const { Op } = require('sequelize')
const db = require('../models')

function groupOrders(orders) {
  const grouped = {}

  for (const order of orders) {
    const userId = order.user_id
    if (!grouped[userId]) {
      grouped[userId] = {
        user_id: userId,
        username: order.User ? order.User.username : 'Unknown',
        total_orders: 0,
        total_revenue: 0,
        orders: []
      }
    }

    grouped[userId].orders.push(order)
    grouped[userId].total_orders += 1
    grouped[userId].total_revenue += Number(order.total_price || 0)
  }

  return Object.values(grouped).sort((a, b) => a.username.localeCompare(b.username))
}

async function recalculateOrderTotal(orderId, transaction) {
  const items = await db.OrderItem.findAll({
    where: { order_id: orderId },
    transaction
  })

  const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  await db.Order.update({ total_price: total }, { where: { order_id: orderId }, transaction })
}

exports.list = async (req, res) => {
  const where = {}
  if (req.query.status && req.query.status !== 'all') {
    where.status = req.query.status
  } else {
    where.status = { [Op.ne]: 'cancelled' }
  }
  if (req.query.user_id) {
    where.user_id = Number(req.query.user_id)
  }

  const include = [{ model: db.User }]
  if (String(req.query.include_items || '') === '1') {
    include.push({ model: db.OrderItem, include: [{ model: db.Product }] })
  }

  const orders = await db.Order.findAll({
    where,
    include,
    order: [['order_id', 'DESC']]
  })

  res.json({
    data: orders,
    grouped_orders: groupOrders(orders)
  })
}

exports.getOne = async (req, res) => {
  const order = await db.Order.findByPk(req.params.id, {
    include: [
      { model: db.User },
      { model: db.OrderItem, include: [{ model: db.Product }] }
    ]
  })

  if (!order) {
    return res.status(404).json({ message: 'Order not found' })
  }

  res.json({ data: order })
}

exports.create = async (req, res) => {
  const order = await db.Order.create({
    user_id: Number(req.body.user_id),
    order_date: req.body.order_date || new Date(),
    total_price: Number(req.body.total_price || 0),
    status: req.body.status || 'pending'
  })

  res.status(201).json({ data: order })
}

exports.update = async (req, res) => {
  const order = await db.Order.findByPk(req.params.id)
  if (!order) {
    return res.status(404).json({ message: 'Order not found' })
  }

  await order.update({
    user_id: req.body.user_id !== undefined ? Number(req.body.user_id) : order.user_id,
    order_date: req.body.order_date || order.order_date,
    total_price: req.body.total_price !== undefined ? Number(req.body.total_price) : order.total_price,
    status: req.body.status || order.status
  })

  res.json({ data: order })
}

exports.remove = async (req, res) => {
  const deletedCount = await db.Order.destroy({ where: { order_id: req.params.id } })
  if (!deletedCount) {
    return res.status(404).json({ message: 'Order not found' })
  }

  res.json({ message: 'Order deleted' })
}

exports.cancel = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const order = await db.Order.findByPk(req.params.id, {
      include: [{ model: db.OrderItem }],
      transaction
    })

    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Order not found' })
    }

    if (order.status !== 'cancelled') {
      await order.update({ status: 'cancelled' }, { transaction })
      for (const item of order.OrderItems || []) {
        await db.Product.increment(
          { stock: Number(item.quantity || 0) },
          { where: { product_id: item.product_id }, transaction }
        )
      }
    }

    await transaction.commit()
    res.json({ data: order })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

exports.realtime = async (req, res) => {
  const orders = await db.Order.findAll({
    where: { status: { [Op.ne]: 'cancelled' } },
    include: [{ model: db.User }],
    order: [['order_id', 'DESC']]
  })

  const grouped = groupOrders(orders).map(group => ({
    user_id: group.user_id,
    username: group.username,
    total_orders: group.total_orders,
    total_revenue: Number(group.total_revenue || 0)
  }))

  res.json({
    generated_at: new Date().toISOString(),
    grouped_orders: grouped
  })
}

exports.addItem = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const orderId = Number(req.body.order_id)
    const productId = Number(req.body.product_id)
    const quantity = Math.max(1, Number(req.body.quantity || 1))

    const [order, product] = await Promise.all([
      db.Order.findByPk(orderId, { transaction }),
      db.Product.findByPk(productId, { transaction })
    ])

    if (!order) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Order not found' })
    }

    if (!product) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Product not found' })
    }

    const subtotal = Number(product.price || 0) * quantity

    const [item, created] = await db.OrderItem.findOrCreate({
      where: { order_id: orderId, product_id: productId },
      defaults: { order_id: orderId, product_id: productId, quantity, subtotal },
      transaction
    })

    if (!created) {
      const nextQty = Number(item.quantity || 0) + quantity
      await item.update({ quantity: nextQty, subtotal: nextQty * Number(product.price || 0) }, { transaction })
    }

    await recalculateOrderTotal(orderId, transaction)

    const updatedOrder = await db.Order.findByPk(orderId, {
      include: [{ model: db.OrderItem, include: [{ model: db.Product }] }],
      transaction
    })

    await transaction.commit()
    res.status(201).json({ data: updatedOrder })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

exports.quickOrder = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const userId = Number(req.body.user_id)
    const productId = Number(req.body.product_id)
    const quantity = Math.max(1, Number(req.body.quantity || 1))

    const product = await db.Product.findByPk(productId, { transaction })
    if (!product) {
      await transaction.rollback()
      return res.status(404).json({ message: 'Product not found' })
    }

    if (Number(product.stock) < quantity) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Not enough stock' })
    }

    const subtotal = Number(product.price) * quantity
    const order = await db.Order.create({
      user_id: userId,
      order_date: new Date(),
      total_price: subtotal,
      status: 'pending'
    }, { transaction })

    await db.OrderItem.create({
      order_id: order.order_id,
      product_id: productId,
      quantity,
      subtotal
    }, { transaction })

    await db.Product.update(
      { stock: Number(product.stock) - quantity },
      { where: { product_id: productId }, transaction }
    )

    await transaction.commit()
    res.status(201).json({ data: order })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

exports.checkout = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const userId = Number(req.body.user_id)
    const cart = Array.isArray(req.body.items) ? req.body.items : []

    if (!cart.length) {
      await transaction.rollback()
      return res.status(400).json({ message: 'Cart is empty' })
    }

    const productIds = cart.map(item => Number(item.product_id)).filter(Boolean)
    const products = await db.Product.findAll({ where: { product_id: productIds }, transaction })
    const byId = new Map(products.map(product => [Number(product.product_id), product]))

    let totalPrice = 0
    const normalizedItems = []

    for (const rawItem of cart) {
      const product = byId.get(Number(rawItem.product_id))
      const quantity = Math.max(1, Number(rawItem.quantity || 1))

      if (!product) {
        await transaction.rollback()
        return res.status(400).json({ message: 'Product in cart no longer exists' })
      }

      if (Number(product.stock) < quantity) {
        await transaction.rollback()
        return res.status(400).json({ message: `Not enough stock for ${product.product_name}` })
      }

      const subtotal = Number(product.price) * quantity
      totalPrice += subtotal
      normalizedItems.push({ product, quantity, subtotal })
    }

    const order = await db.Order.create({
      user_id: userId,
      order_date: new Date(),
      total_price: totalPrice,
      status: 'pending'
    }, { transaction })

    for (const item of normalizedItems) {
      await db.OrderItem.create({
        order_id: order.order_id,
        product_id: item.product.product_id,
        quantity: item.quantity,
        subtotal: item.subtotal
      }, { transaction })

      await db.Product.update(
        { stock: Number(item.product.stock) - item.quantity },
        { where: { product_id: item.product.product_id }, transaction }
      )
    }

    await transaction.commit()
    res.status(201).json({ data: order })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

exports.deleteOld = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const days = Math.max(1, Number(req.body.days || 30))
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const oldOrders = await db.Order.findAll({
      where: { order_date: { [Op.lt]: cutoff } },
      attributes: ['order_id'],
      transaction
    })

    const orderIds = oldOrders.map(order => order.order_id)
    if (!orderIds.length) {
      await transaction.rollback()
      return res.json({ data: { deletedCount: 0 } })
    }

    await db.OrderItem.destroy({
      where: { order_id: { [Op.in]: orderIds } },
      transaction
    })

    const deletedCount = await db.Order.destroy({
      where: { order_id: { [Op.in]: orderIds } },
      transaction
    })

    await transaction.commit()
    res.json({ data: { deletedCount } })
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
