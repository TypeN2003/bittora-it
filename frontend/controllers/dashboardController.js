const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const productsPayload = await apiRequest('/api/products?limit=1000')
    const products = Array.isArray(productsPayload.data) ? productsPayload.data : []

    if (req.session.user && req.session.user.role !== 'admin') {
      return res.render('storefront', { products })
    }

    const categoriesPayload = await apiRequest('/api/categories')
    const categories = Array.isArray(categoriesPayload.data) ? categoriesPayload.data : []

    return res.render('dashboard', {
      stats: {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + Number(p.stock || 0), 0),
        totalCategories: categories.length
      },
      latestProducts: [...products].sort((a, b) => Number(b.product_id) - Number(a.product_id)).slice(0, 5)
    })
  } catch (error) {
    req.flash('error', `Failed to load dashboard: ${error.message}`)
    return res.render('dashboard', {
      stats: { totalProducts: 0, totalStock: 0, totalCategories: 0 },
      latestProducts: []
    })
  }
}
