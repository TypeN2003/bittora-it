const db = require('../models')

function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'customer'
}

exports.list = async (_req, res) => {
  const users = await db.User.findAll({ order: [['user_id', 'ASC']] })
  res.json({ data: users })
}

exports.getOne = async (req, res) => {
  const user = await db.User.findByPk(req.params.id, {
    include: [{ model: db.Order }]
  })

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  res.json({ data: user })
}

exports.create = async (req, res) => {
  const user = await db.User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: normalizeRole(req.body.role)
  })

  res.status(201).json({ data: user })
}

exports.update = async (req, res) => {
  const user = await db.User.findByPk(req.params.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  await user.update({
    username: req.body.username ?? user.username,
    email: req.body.email ?? user.email,
    password: req.body.password ?? user.password,
    role: req.body.role ? normalizeRole(req.body.role) : user.role
  })

  res.json({ data: user })
}

exports.remove = async (req, res) => {
  const deletedCount = await db.User.destroy({ where: { user_id: req.params.id } })
  if (!deletedCount) {
    return res.status(404).json({ message: 'User not found' })
  }

  res.json({ message: 'User deleted' })
}

exports.login = async (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' })
  }

  const user = await db.User.findOne({ where: { username, password } })
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' })
  }

  res.json({
    data: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  })
}
