const { Op } = require('sequelize')
const db = require('../models')

exports.list = async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query
  const where = {}

  if (category) {
    where.category_id = Number(category)
  }

  const q = String(search || '').trim()
  if (q) {
    where[Op.or] = [
      { product_name: { [Op.like]: `%${q}%` } },
      { '$Category.category_name$': { [Op.like]: `%${q}%` } }
    ]
  }

  const parsedLimit = Math.max(1, Number(limit) || 20)
  const parsedPage = Math.max(1, Number(page) || 1)
  const offset = (parsedPage - 1) * parsedLimit

  const { count, rows } = await db.Product.findAndCountAll({
    where,
    include: [{ model: db.Category }],
    subQuery: false,
    limit: parsedLimit,
    offset,
    order: [['product_id', 'ASC']]
  })

  res.json({
    data: rows,
    pagination: {
      count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.max(1, Math.ceil(count / parsedLimit))
    }
  })
}

exports.getOne = async (req, res) => {
  const product = await db.Product.findByPk(req.params.id, {
    include: [{ model: db.Category }]
  })

  if (!product) {
    return res.status(404).json({ message: 'Product not found' })
  }

  res.json({ data: product })
}

exports.create = async (req, res) => {
  const payload = {
    product_name: req.body.product_name,
    price: Number(req.body.price || 0),
    stock: Number(req.body.stock || 0),
    category_id: Number(req.body.category_id),
    description: req.body.description || '',
    image_url: req.body.image_url || ''
  }

  const created = await db.Product.create(payload)
  res.status(201).json({ data: created })
}

exports.update = async (req, res) => {
  const existing = await db.Product.findByPk(req.params.id)
  if (!existing) {
    return res.status(404).json({ message: 'Product not found' })
  }

  await existing.update({
    product_name: req.body.product_name ?? existing.product_name,
    price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : existing.stock,
    category_id: req.body.category_id !== undefined ? Number(req.body.category_id) : existing.category_id,
    description: req.body.description ?? existing.description,
    image_url: req.body.image_url ?? existing.image_url
  })

  res.json({ data: existing })
}

exports.remove = async (req, res) => {
  const deletedCount = await db.Product.destroy({ where: { product_id: req.params.id } })
  if (!deletedCount) {
    return res.status(404).json({ message: 'Product not found' })
  }

  res.json({ message: 'Product deleted' })
}
