const { apiRequest } = require('../lib/apiClient')

function sanitizeQuantity(raw) {
  return Math.max(1, Number(raw || 1))
}

function getSessionCart(req) {
  const raw = Array.isArray(req.session.cart) ? req.session.cart : []
  const cleaned = raw
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      product_id: Number(item.product_id),
      quantity: sanitizeQuantity(item.quantity)
    }))
    .filter(item => Number.isFinite(item.product_id) && item.product_id > 0)

  req.session.cart = cleaned
  return cleaned
}

function getCartCount(req) {
  return getSessionCart(req).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

function getSelectedProductIds(req) {
  const raw = Array.isArray(req.session.selectedCartProductIds) ? req.session.selectedCartProductIds : []
  const ids = raw.map(Number).filter(id => Number.isFinite(id) && id > 0)
  req.session.selectedCartProductIds = ids
  return ids
}

function wantsJson(req) {
  const accept = String(req.headers.accept || '')
  const ajaxFlag = req.body && typeof req.body === 'object' ? req.body.ajax : ''
  return req.xhr || accept.includes('application/json') || String(ajaxFlag || '') === '1'
}

async function fetchProduct(productId) {
  const payload = await apiRequest(`/api/products/${productId}`)
  return payload.data
}

async function getCartDetails(req, selectedProductIds = null) {
  const cart = getSessionCart(req)
  const selectedSet = Array.isArray(selectedProductIds) && selectedProductIds.length
    ? new Set(selectedProductIds.map(Number))
    : null

  const filteredCart = selectedSet
    ? cart.filter(item => selectedSet.has(Number(item.product_id)))
    : cart

  if (!filteredCart.length) {
    return { items: [], total: 0 }
  }

  const productPromises = filteredCart.map(item =>
    fetchProduct(item.product_id).catch(() => null)
  )

  const products = await Promise.all(productPromises)
  const byId = new Map(products.filter(Boolean).map(product => [Number(product.product_id), product]))

  const items = filteredCart
    .map(item => {
      const product = byId.get(Number(item.product_id))
      if (!product) return null
      const quantity = sanitizeQuantity(item.quantity)
      const subtotal = Number(product.price || 0) * quantity

      return {
        product,
        quantity,
        subtotal,
        inStock: Number(product.stock || 0) >= quantity
      }
    })
    .filter(Boolean)

  const total = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
  return { items, total }
}

exports.index = async (req, res) => {
  try {
    const { items, total } = await getCartDetails(req)
    req.session.cart = items.map(item => ({
      product_id: Number(item.product.product_id),
      quantity: item.quantity
    }))
    req.session.selectedCartProductIds = []
    const selectedProductIds = []
    return res.render('cart/index', { items, total, selectedProductIds })
  } catch (error) {
    req.flash('error', `Failed to load cart: ${error.message}`)
    return res.redirect('/')
  }
}

exports.checkoutPage = async (req, res) => {
  try {
    const selectedProductIds = getSelectedProductIds(req)
    const { items, total } = await getCartDetails(req, selectedProductIds)
    if (!items.length) {
      req.flash('error', 'Please select at least one item to checkout.')
      return res.redirect('/cart')
    }

    return res.render('cart/checkout', {
      items,
      total,
      formData: {
        customer_name: req.session.user ? req.session.user.username : '',
        phone: '',
        address: '',
        payment_method: 'promptpay',
        note: ''
      }
    })
  } catch (error) {
    req.flash('error', `Failed to load checkout page: ${error.message}`)
    return res.redirect('/cart')
  }
}

exports.add = async (req, res) => {
  try {
    const productId = Number(req.body.product_id)
    const quantity = sanitizeQuantity(req.body.quantity)
    const returnTo = req.body.return_to || '/'

    const product = await fetchProduct(productId)

    if (!product) {
      if (wantsJson(req)) {
        return res.status(404).json({ ok: false, message: 'Product not found.' })
      }
      req.flash('error', 'Product not found.')
      return res.redirect(returnTo)
    }

    if (Number(product.stock) <= 0) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: 'This product is out of stock.' })
      }
      req.flash('error', 'This product is out of stock.')
      return res.redirect(returnTo)
    }

    const cart = getSessionCart(req)
    const existingIndex = cart.findIndex(item => Number(item.product_id) === productId)

    if (existingIndex >= 0) {
      const nextQty = sanitizeQuantity(cart[existingIndex].quantity) + quantity
      cart[existingIndex].quantity = Math.min(Number(product.stock), nextQty)
    } else {
      cart.push({
        product_id: productId,
        quantity: Math.min(Number(product.stock), quantity)
      })
    }

    if (wantsJson(req)) {
      return res.json({
        ok: true,
        message: `Added "${product.product_name}" to cart.`,
        cart_count: getCartCount(req)
      })
    }

    req.flash('success', `Added "${product.product_name}" to cart.`)
    return res.redirect(returnTo)
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(500).json({ ok: false, message: `Failed to add product to cart: ${error.message}` })
    }
    req.flash('error', `Failed to add product to cart: ${error.message}`)
    return res.redirect('/')
  }
}

exports.update = async (req, res) => {
  try {
    const productId = Number(req.body.product_id)
    const quantity = sanitizeQuantity(req.body.quantity)
    const cart = getSessionCart(req)
    const idx = cart.findIndex(item => Number(item.product_id) === productId)

    if (idx < 0) {
      req.flash('error', 'Item not found in cart.')
      return res.redirect('/cart')
    }

    const product = await fetchProduct(productId)

    cart[idx].quantity = Math.min(Number(product.stock || 0), quantity)
    if (cart[idx].quantity <= 0) {
      cart.splice(idx, 1)
    }

    req.session.selectedCartProductIds = getSelectedProductIds(req).filter(id => id !== productId)
    req.flash('success', 'Cart updated.')
    return res.redirect('/cart')
  } catch (error) {
    req.flash('error', `Failed to update cart: ${error.message}`)
    return res.redirect('/cart')
  }
}

exports.remove = (req, res) => {
  try {
    const productId = Number(req.body.product_id)
    const cart = getSessionCart(req)
    req.session.cart = cart.filter(item => Number(item.product_id) !== productId)
    req.session.selectedCartProductIds = getSelectedProductIds(req).filter(id => id !== productId)
    req.flash('success', 'Item removed from cart.')
    return res.redirect('/cart')
  } catch (error) {
    req.flash('error', `Failed to remove item: ${error.message}`)
    return res.redirect('/cart')
  }
}

exports.clear = (req, res) => {
  req.session.cart = []
  req.session.selectedCartProductIds = []
  req.flash('success', 'Cart cleared.')
  return res.redirect('/cart')
}

exports.selectForCheckout = (req, res) => {
  const raw = String(req.body.selected_product_ids || '')
  const ids = raw
    .split(',')
    .map(s => Number(s.trim()))
    .filter(id => Number.isFinite(id) && id > 0)

  const cartIds = new Set(getSessionCart(req).map(item => Number(item.product_id)))
  const validIds = [...new Set(ids)].filter(id => cartIds.has(id))

  if (!validIds.length) {
    req.flash('error', 'Please select at least one item.')
    return res.redirect('/cart')
  }

  req.session.selectedCartProductIds = validIds
  return res.redirect('/cart/checkout')
}

exports.checkout = async (req, res) => {
  try {
    const currentUser = req.session.user
    if (!currentUser || !currentUser.user_id) {
      req.flash('error', 'Please log in first.')
      return res.redirect('/auth/login')
    }

    const selectedProductIds = getSelectedProductIds(req)
    const cart = selectedProductIds.length
      ? getSessionCart(req).filter(item => selectedProductIds.includes(Number(item.product_id)))
      : []
    if (!cart.length) {
      req.flash('error', 'Please select at least one item.')
      return res.redirect('/cart')
    }

    const customerName = String(req.body.customer_name || '').trim()
    const phone = String(req.body.phone || '').trim()
    const address = String(req.body.address || '').trim()
    const paymentMethod = String(req.body.payment_method || '').trim()

    if (!customerName || !phone || !address || !paymentMethod) {
      req.flash('error', 'Please complete all payment information.')
      return res.redirect('/cart/checkout')
    }

    const payload = {
      user_id: currentUser.user_id,
      items: cart,
      customer_name: customerName,
      phone,
      address,
      payment_method: paymentMethod,
      note: String(req.body.note || '').trim()
    }

    await apiRequest('/api/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    const selectedSet = new Set(selectedProductIds.map(Number))
    req.session.cart = getSessionCart(req).filter(item => !selectedSet.has(Number(item.product_id)))
    req.session.selectedCartProductIds = []
    req.flash('success', 'Payment complete. Order was sent to admin.')
    return res.redirect('/cart')
  } catch (error) {
    req.flash('error', `Checkout failed: ${error.message}`)
    return res.redirect('/cart')
  }
}
