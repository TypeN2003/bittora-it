const { apiRequest } = require('../lib/apiClient')

exports.loginForm = (_req, res) => {
  res.render('auth/login', { formData: { username: '' } })
}

exports.login = async (req, res) => {
  try {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')

    if (!username || !password) {
      req.flash('error', 'Username and password are required.')
      return res.status(400).render('auth/login', { formData: { username } })
    }

    const payload = await apiRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })

    req.session.user = payload.data
    req.flash('success', `Logged in as ${payload.data.username} (${payload.data.role}).`)
    return res.redirect('/')
  } catch (error) {
    req.flash('error', `Login failed: ${error.message}`)
    return res.status(401).render('auth/login', {
      formData: { username: String(req.body.username || '').trim() }
    })
  }
}

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login')
  })
}
