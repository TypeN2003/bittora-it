const { Op, fn, col, literal } = require('sequelize')
const db = require('../models')

exports.index = async (_req, res) => {
  const [
    totalOrders,
    totalRevenue,
    totalProducts,
    totalCustomers,
    salesRows,
    bestSelling
  ] = await Promise.all([
    db.Order.count(),
    db.Order.sum('total_price'),
    db.Product.count(),
    db.User.count(),
    db.Order.findAll({
      attributes: [
        [fn('date', col('order_date')), 'order_date'],
        [fn('COUNT', col('order_id')), 'total_orders'],
        [fn('SUM', col('total_price')), 'total_revenue']
      ],
      group: [fn('date', col('order_date'))],
      order: [[fn('date', col('order_date')), 'DESC']],
      limit: 10
    }),
    db.Product.findAll({
      attributes: [
        'product_id',
        'product_name',
        [fn('COALESCE', fn('SUM', col('OrderItems.quantity')), 0), 'total_quantity_sold'],
        [fn('COALESCE', fn('SUM', col('OrderItems.subtotal')), 0), 'total_revenue']
      ],
      include: [{ model: db.OrderItem, attributes: [], required: false }],
      subQuery: false,
      group: ['Product.product_id'],
      order: [literal('total_quantity_sold DESC')],
      limit: 10
    })
  ])

  res.json({
    data: {
      summary: {
        totalOrders,
        totalRevenue: Number(totalRevenue || 0),
        totalProducts,
        totalCustomers
      },
      salesRows,
      bestSelling
    }
  })
}

exports.sales = async (req, res) => {
  const { date, month } = req.query
  const where = {}

  if (date) {
    const start = new Date(`${date}T00:00:00`)
    const end = new Date(`${date}T23:59:59.999`)
    where.order_date = { [Op.between]: [start, end] }
  } else if (month) {
    const start = new Date(`${month}-01T00:00:00`)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)
    where.order_date = { [Op.gte]: start, [Op.lt]: end }
  }

  const orders = await db.Order.findAll({
    where,
    include: [{ model: db.User }],
    order: [['order_date', 'DESC']]
  })

  const orderItems = await db.OrderItem.findAll({
    attributes: ['order_id', 'quantity'],
    include: [
      { model: db.Product, attributes: ['product_name'] },
      { model: db.Order, attributes: [], where, required: true }
    ],
    order: [['order_id', 'DESC']]
  })

  const productSalesRows = await db.OrderItem.findAll({
    attributes: [
      [col('Product.product_name'), 'product_name'],
      [fn('SUM', col('OrderItem.quantity')), 'total_quantity'],
      [fn('SUM', col('OrderItem.subtotal')), 'total_revenue']
    ],
    include: [
      { model: db.Product, attributes: [] },
      { model: db.Order, attributes: [], where, required: true }
    ],
    group: [col('Product.product_id'), col('Product.product_name')],
    order: [[literal('total_quantity DESC')]]
  })

  const salesRows = await db.Order.findAll({
    attributes: [
      [fn('date', col('order_date')), 'order_date'],
      [fn('COUNT', col('order_id')), 'total_orders'],
      [fn('SUM', col('total_price')), 'total_revenue']
    ],
    where,
    group: [fn('date', col('order_date'))],
    order: [[fn('date', col('order_date')), 'DESC']]
  })

  const orderItemsByOrderId = orderItems.reduce((acc, item) => {
    const key = item.order_id
    if (!acc[key]) acc[key] = []
    acc[key].push({
      product_name: item.Product ? item.Product.product_name : '-',
      quantity: Number(item.quantity || 0)
    })
    return acc
  }, {})

  res.json({
    data: {
      orders,
      orderItemsByOrderId,
      productSalesRows,
      salesRows,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0),
      totalProductQuantity: productSalesRows.reduce((sum, row) => sum + Number(row.get('total_quantity') || 0), 0),
      totalProductRevenue: productSalesRows.reduce((sum, row) => sum + Number(row.get('total_revenue') || 0), 0),
      filters: { date: date || '', month: month || '' }
    }
  })
}

exports.bestProducts = async (_req, res) => {
  const orderWhere = { status: { [Op.ne]: 'cancelled' } }

  const bestSelling = await db.OrderItem.findAll({
    attributes: [
      [col('Product.product_id'), 'product_id'],
      [col('Product.product_name'), 'product_name'],
      [fn('COALESCE', fn('SUM', col('OrderItem.quantity')), 0), 'total_quantity_sold'],
      [fn('COALESCE', fn('SUM', col('OrderItem.subtotal')), 0), 'total_revenue']
    ],
    include: [
      { model: db.Product, attributes: [], required: true },
      { model: db.Order, attributes: [], where: orderWhere, required: true }
    ],
    group: [col('Product.product_id'), col('Product.product_name')],
    order: [literal('total_quantity_sold DESC')]
  })

  const monthlyRows = await db.OrderItem.findAll({
    attributes: [
      [col('Product.product_id'), 'product_id'],
      [col('Order.order_date'), 'order_date'],
      [col('OrderItem.quantity'), 'quantity']
    ],
    include: [
      { model: db.Product, attributes: [], required: true },
      { model: db.Order, attributes: [], where: orderWhere, required: true }
    ],
    raw: true
  })

  const byProductMonth = new Map()
  for (const row of monthlyRows) {
    const productId = Number(row.product_id)
    const date = new Date(row.order_date)
    if (!productId || Number.isNaN(date.getTime())) continue

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const mapKey = `${productId}:${monthKey}`
    byProductMonth.set(mapKey, (byProductMonth.get(mapKey) || 0) + Number(row.quantity || 0))
  }

  const bestMonthByProductId = {}
  for (const [mapKey, qty] of byProductMonth.entries()) {
    const [productIdStr, monthKey] = mapKey.split(':')
    const productId = Number(productIdStr)
    const current = bestMonthByProductId[productId]
    if (!current || qty > current.qty || (qty === current.qty && monthKey > current.monthKey)) {
      bestMonthByProductId[productId] = { monthKey, qty }
    }
  }

  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
  for (const productId of Object.keys(bestMonthByProductId)) {
    const [year, month] = bestMonthByProductId[productId].monthKey.split('-').map(Number)
    bestMonthByProductId[productId] = formatter.format(new Date(year, month - 1, 1))
  }

  res.json({ data: { bestSelling, bestMonthByProductId } })
}
