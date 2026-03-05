const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const payload = await apiRequest('/api/order-items')
    res.render('order_items/index', { orderItems: payload.data || [] })
  } catch (error) {
    req.flash('error', `Failed to load order items: ${error.message}`)
    res.redirect('/')
  }
}

exports.show = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/order-items/${req.params.id}`)
    res.render('order_items/show', { orderItem: payload.data })
  } catch (error) {
    req.flash('error', `Failed to load order item: ${error.message}`)
    res.redirect('/order_items')
  }
}

exports.newForm = async (_req, res) => {
  try {
    const [ordersPayload, productsPayload] = await Promise.all([
      apiRequest('/api/orders'),
      apiRequest('/api/products?limit=1000')
    ])
    res.render('order_items/new', {
      orders: ordersPayload.data || [],
      products: productsPayload.data || []
    })
  } catch (error) {
    req.flash('error', `Failed to load order item form: ${error.message}`)
    res.redirect('/order_items')
  }
}

exports.create = async (req, res) => {
  try {
    await apiRequest('/api/orders/items', {
      method: 'POST',
      body: JSON.stringify({
        order_id: req.body.order_id,
        product_id: req.body.product_id,
        quantity: req.body.quantity
      })
    })

    req.flash('success', 'Order item created successfully')
    res.redirect('/order_items')
  } catch (error) {
    req.flash('error', `Failed to create order item: ${error.message}`)
    res.redirect('/order_items/new')
  }
}

exports.editForm = async (req, res) => {
  try {
    const [itemPayload, ordersPayload, productsPayload] = await Promise.all([
      apiRequest(`/api/order-items/${req.params.id}`),
      apiRequest('/api/orders'),
      apiRequest('/api/products?limit=1000')
    ])

    res.render('order_items/edit', {
      orderItem: itemPayload.data,
      orders: ordersPayload.data || [],
      products: productsPayload.data || []
    })
  } catch (error) {
    req.flash('error', `Failed to load edit form: ${error.message}`)
    res.redirect('/order_items')
  }
}

exports.update = async (req, res) => {
  try {
    await apiRequest(`/api/order-items/${req.params.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        order_id: req.body.order_id,
        product_id: req.body.product_id,
        quantity: req.body.quantity
      })
    })

    req.flash('success', 'Order item updated successfully')
    res.redirect(`/order_items/${req.params.id}`)
  } catch (error) {
    req.flash('error', `Failed to update order item: ${error.message}`)
    res.redirect(`/order_items/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await apiRequest(`/api/order-items/${req.params.id}`, { method: 'DELETE' })
    req.flash('success', 'Order item deleted successfully')
    res.redirect('/order_items')
  } catch (error) {
    req.flash('error', `Failed to delete order item: ${error.message}`)
    res.redirect('/order_items')
  }
}
