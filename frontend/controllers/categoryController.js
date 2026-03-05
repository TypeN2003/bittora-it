const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const payload = await apiRequest('/api/categories')
    res.render('categories/index', { categories: payload.data || [] })
  } catch (error) {
    req.flash('error', `Failed to load categories: ${error.message}`)
    res.redirect('/')
  }
}

exports.create = async (req, res) => {
  try {
    await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ category_name: req.body.category_name })
    })
    req.flash('success', 'Category created successfully')
    res.redirect('/categories')
  } catch (error) {
    req.flash('error', `Error creating category: ${error.message}`)
    res.redirect('/categories')
  }
}

exports.editForm = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/categories/${req.params.id}`)
    res.render('categories/edit', { category: payload.data })
  } catch (error) {
    req.flash('error', `Error loading category: ${error.message}`)
    res.redirect('/categories')
  }
}

exports.update = async (req, res) => {
  try {
    await apiRequest(`/api/categories/${req.params.id}/update`, {
      method: 'POST',
      body: JSON.stringify({ category_name: req.body.category_name })
    })
    req.flash('success', 'Category updated successfully')
    res.redirect('/categories')
  } catch (error) {
    req.flash('error', `Error updating category: ${error.message}`)
    res.redirect(`/categories/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await apiRequest(`/api/categories/${req.params.id}/delete`, {
      method: 'POST',
      body: JSON.stringify({})
    })
    req.flash('success', 'Category deleted successfully')
    res.redirect('/categories')
  } catch (error) {
    req.flash('error', `Error deleting category: ${error.message}`)
    res.redirect('/categories')
  }
}
