const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.role === 'admin'
    const query = isAdmin ? '' : `?user_id=${req.session.user.user_id}`
    const payload = await apiRequest(`/api/orders${query}`)

    const orders = payload.data || []
    const groupedOrders = isAdmin
      ? (payload.grouped_orders || [])
      : [{
        user_id: req.session.user.user_id,
        username: req.session.user.username,
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0),
        orders
      }]

    res.render('orders/index', { orders, groupedOrders })
  } catch (error) {
    req.flash('error', `Failed to load orders: ${error.message}`)
    res.redirect('/')
  }
}

exports.realtime = async (_req, res) => {
  try {
    const payload = await apiRequest('/api/orders/realtime')
    res.json(payload)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.show = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/orders/${req.params.id}`)
    const order = payload.data

    if (!order) {
      req.flash('error', 'Order not found')
      return res.redirect('/orders')
    }

    const isAdmin = req.session.user && req.session.user.role === 'admin'
    if (!isAdmin && Number(order.user_id) !== Number(req.session.user.user_id)) {
      req.flash('error', 'Order not found or access denied')
      return res.redirect('/orders')
    }

    res.render('orders/show', { order })
  } catch (error) {
    req.flash('error', `Failed to load order: ${error.message}`)
    res.redirect('/orders')
  }
}

exports.newForm = async (_req, res) => {
  const usersPayload = await apiRequest('/api/users')
  res.render('orders/new', { users: usersPayload.data || [] })
}

exports.create = async (req, res) => {
  try {
    await apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...req.body,
        order_date: req.body.order_date || new Date().toISOString()
      })
    })
    req.flash('success', 'Order created successfully')
    res.redirect('/orders')
  } catch (error) {
    req.flash('error', `Failed to create order: ${error.message}`)
    res.redirect('/orders/new')
  }
}

exports.quickOrder = async (req, res) => {
  try {
    await apiRequest('/api/orders/quick', {
      method: 'POST',
      body: JSON.stringify({
        user_id: req.session.user.user_id,
        product_id: req.body.product_id,
        quantity: req.body.quantity
      })
    })

    req.flash('success', 'Order created successfully.')
    return res.redirect('/orders')
  } catch (error) {
    req.flash('error', `Failed to create order: ${error.message}`)
    return res.redirect('/products')
  }
}

exports.editForm = async (req, res) => {
  try {
    const [orderPayload, usersPayload] = await Promise.all([
      apiRequest(`/api/orders/${req.params.id}`),
      apiRequest('/api/users')
    ])

    res.render('orders/edit', {
      order: orderPayload.data,
      users: usersPayload.data || []
    })
  } catch (error) {
    req.flash('error', `Failed to load edit form: ${error.message}`)
    res.redirect('/orders')
  }
}

exports.update = async (req, res) => {
  try {
    await apiRequest(`/api/orders/${req.params.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...req.body,
        order_date: req.body.order_date || new Date().toISOString()
      })
    })

    req.flash('success', 'Order updated successfully')
    res.redirect(`/orders/${req.params.id}`)
  } catch (error) {
    req.flash('error', `Failed to update order: ${error.message}`)
    res.redirect(`/orders/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await apiRequest(`/api/orders/${req.params.id}`, { method: 'DELETE' })
    req.flash('success', 'Order deleted successfully')
    res.redirect('/orders')
  } catch (error) {
    req.flash('error', `Failed to delete order: ${error.message}`)
    res.redirect('/orders')
  }
}

exports.cancel = async (req, res) => {
  try {
    await apiRequest(`/api/orders/${req.params.id}/cancel`, { method: 'POST', body: '{}' })
    req.flash('success', 'Order cancelled successfully')
    res.redirect('/orders')
  } catch (error) {
    req.flash('error', `Failed to cancel order: ${error.message}`)
    res.redirect('/orders')
  }
}

exports.deleteOld = async (req, res) => {
  try {
    const payload = await apiRequest('/api/orders/delete-old', {
      method: 'POST',
      body: JSON.stringify({ days: req.body.days || 30 })
    })

    req.flash('success', `Deleted ${Number(payload.data?.deletedCount || 0)} old orders.`)
    res.redirect('/orders')
  } catch (error) {
    req.flash('error', `Failed to delete old orders: ${error.message}`)
    res.redirect('/orders')
  }
}

exports.history = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/orders?user_id=${req.session.user.user_id}&status=all&include_items=1`)
    let orders = payload.data || []

    const needsDetails = orders.some(order => !Array.isArray(order.OrderItems))
    if (needsDetails) {
      const detailedOrders = await Promise.all(
        orders.map(async (order) => {
          try {
            const detailPayload = await apiRequest(`/api/orders/${order.order_id}`)
            return detailPayload.data || order
          } catch (_) {
            return order
          }
        })
      )
      orders = detailedOrders
    }

    res.render('orders/history', { orders })
  } catch (error) {
    req.flash('error', `Failed to load order history: ${error.message}`)
    res.redirect('/')
  }
}
