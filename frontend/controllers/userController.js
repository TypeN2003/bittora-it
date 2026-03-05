const { apiRequest } = require('../lib/apiClient')

exports.index = async (req, res) => {
  try {
    const payload = await apiRequest('/api/users')
    res.render('users/index', { users: payload.data || [] })
  } catch (error) {
    req.flash('error', `Failed to load users: ${error.message}`)
    res.redirect('/')
  }
}

exports.show = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/users/${req.params.id}`)
    res.render('users/show', { user: payload.data })
  } catch (error) {
    req.flash('error', `Failed to load user: ${error.message}`)
    res.redirect('/users')
  }
}

exports.newForm = (_req, res) => {
  res.render('users/new')
}

exports.create = async (req, res) => {
  try {
    await apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(req.body)
    })

    req.flash('success', 'User created successfully')
    res.redirect('/users')
  } catch (error) {
    req.flash('error', `Failed to create user: ${error.message}`)
    res.redirect('/users/new')
  }
}

exports.editForm = async (req, res) => {
  try {
    const payload = await apiRequest(`/api/users/${req.params.id}`)
    res.render('users/edit', { user: payload.data })
  } catch (error) {
    req.flash('error', `Failed to load edit form: ${error.message}`)
    res.redirect('/users')
  }
}

exports.update = async (req, res) => {
  try {
    await apiRequest(`/api/users/${req.params.id}`, {
      method: 'PUT',
      body: JSON.stringify(req.body)
    })

    req.flash('success', 'User updated successfully')
    res.redirect(`/users/${req.params.id}`)
  } catch (error) {
    req.flash('error', `Failed to update user: ${error.message}`)
    res.redirect(`/users/${req.params.id}/edit`)
  }
}

exports.delete = async (req, res) => {
  try {
    await apiRequest(`/api/users/${req.params.id}`, { method: 'DELETE' })
    req.flash('success', 'User deleted successfully')
    res.redirect('/users')
  } catch (error) {
    req.flash('error', `Failed to delete user: ${error.message}`)
    res.redirect('/users')
  }
}
