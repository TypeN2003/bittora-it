const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const category = req.query.category || ''
    const search = String(req.query.search || '').trim()
    const currentPage = Math.max(1, Number(req.query.page || 1))

    const productsPayload = await apiRequest(`/api/products?${new URLSearchParams({
      page: String(currentPage),
      limit: '5',
      category: String(category || ''),
      search
    }).toString()}`)

    const categoriesPayload = await apiRequest('/api/categories')

    const totalPages = Number(productsPayload.pagination?.totalPages || 1)

    res.render('products/index', {
      products: productsPayload.data || [],
      categories: categoriesPayload.data || [],
      selectedCategory: category,
      searchQuery: search,
      totalPages,
      currentPage,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages
    })
  } catch (error) {
    req.flash('error', `Failed to load products: ${error.message}`)
    res.redirect('/')
  }
}

exports.show = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/products/${req.params.id}`)
    res.render('products/show', { product: payload.data })
  } catch (error) {
    req.flash('error', `Failed to load product: ${error.message}`)
    res.redirect('/products')
  }
}

exports.newForm = async (_req, res) => {
  const categoriesPayload = await apiRequest('/api/categories')
  res.render('products/new', {
    categories: categoriesPayload.data || [],
    errors: [],
    formData: {}
  })
}

exports.create = async (req, res) => {
  try {
    if (req.validationErrors && req.validationErrors.length) {
      const categoriesPayload = await apiRequest('/api/categories')
      return res.status(422).render('products/new', {
        categories: categoriesPayload.data || [],
        errors: req.validationErrors,
        formData: req.body
      })
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || '')

    await apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify({ ...req.body, image_url: imageUrl })
    })

    req.flash('success', 'Product created successfully')
    res.redirect('/products')
  } catch (error) {
    req.flash('error', `Failed to create product: ${error.message}`)
    res.redirect('/products/new')
  }
}

exports.editForm = async (req, res) => {
  try {
    const [productPayload, categoriesPayload] = await Promise.all([
      apiRequest(`/api/products/${req.params.id}`),
      apiRequest('/api/categories')
    ])

    res.render('products/edit', {
      product: productPayload.data,
      categories: categoriesPayload.data || [],
      errors: [],
      formData: productPayload.data
    })
  } catch (error) {
    req.flash('error', `Failed to load edit form: ${error.message}`)
    res.redirect('/products')
  }
}

exports.update = async (req, res) => {
  try {
    const productPayload = await apiRequest(`/api/products/${req.params.id}`)
    const existing = productPayload.data

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.image_url || existing.image_url)

    if (req.validationErrors && req.validationErrors.length) {
      const categoriesPayload = await apiRequest('/api/categories')
      return res.status(422).render('products/edit', {
        product: existing,
        categories: categoriesPayload.data || [],
        errors: req.validationErrors,
        formData: { ...existing, ...req.body, image_url: imageUrl }
      })
    }

    await apiRequest(`/api/products/${req.params.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...req.body, image_url: imageUrl })
    })

    req.flash('success', 'Product updated successfully')
    res.redirect(`/products/${req.params.id}`)
  } catch (error) {
    req.flash('error', `Failed to update product: ${error.message}`)
    res.redirect(`/products/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await apiRequest(`/api/products/${req.params.id}`, { method: 'DELETE' })
    req.flash('success', 'Product deleted successfully')
    res.redirect('/products')
  } catch (error) {
    req.flash('error', `Failed to delete product: ${error.message}`)
    res.redirect('/products')
  }
}

exports.report = async (_req, res) => {
  const payload = await apiRequest('/api/products?limit=1000')
  const products = [...(payload.data || [])].sort((a, b) => String(a.product_name).localeCompare(String(b.product_name)))
  res.render('products/report', { products })
}
