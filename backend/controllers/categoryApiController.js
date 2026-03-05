const db = require('../models')

exports.list = async (_req, res) => {
  const categories = await db.Category.findAll({ order: [['category_id', 'ASC']] })
  res.json({ data: categories })
}

exports.create = async (req, res) => {
  const category = await db.Category.create({ category_name: req.body.category_name })
  res.status(201).json({ data: category })
}

exports.getOne = async (req, res) => {
  const category = await db.Category.findByPk(Number(req.params.id))
  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }
  return res.json({ data: category })
}

exports.update = async (req, res) => {
  const category = await db.Category.findByPk(Number(req.params.id))
  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }

  await category.update({
    category_name: String(req.body.category_name || '').trim() || category.category_name
  })

  return res.json({ data: category })
}

exports.remove = async (req, res) => {
  const categoryId = Number(req.params.id)
  const category = await db.Category.findByPk(categoryId)

  if (!category) {
    return res.status(404).json({ message: 'Category not found' })
  }

  const productsCount = await db.Product.count({ where: { category_id: categoryId } })
  if (productsCount > 0) {
    return res.status(400).json({ message: 'Cannot delete category because products still use it' })
  }

  await category.destroy()
  return res.json({ message: 'Category deleted' })
}
