const { Sequelize } = require('sequelize')
const sequelize = require('../config/database')

const db = {}

db.Sequelize = Sequelize
db.sequelize = sequelize

db.User = require('./User')(sequelize, Sequelize)
db.Product = require('./Product')(sequelize, Sequelize)
db.Category = require('./category')(sequelize, Sequelize)
db.Order = require('./Order')(sequelize, Sequelize)
db.OrderItem = require('./OrderItem')(sequelize, Sequelize)

db.User.hasMany(db.Order, { foreignKey: 'user_id', onDelete: 'CASCADE' })
db.Order.belongsTo(db.User, { foreignKey: 'user_id' })

db.Order.belongsToMany(db.Product, {
  through: db.OrderItem,
  foreignKey: 'order_id',
  otherKey: 'product_id'
})
db.Product.belongsToMany(db.Order, {
  through: db.OrderItem,
  foreignKey: 'product_id',
  otherKey: 'order_id'
})

db.Order.hasMany(db.OrderItem, { foreignKey: 'order_id', onDelete: 'CASCADE' })
db.OrderItem.belongsTo(db.Order, { foreignKey: 'order_id' })

db.Product.hasMany(db.OrderItem, { foreignKey: 'product_id', onDelete: 'CASCADE' })
db.OrderItem.belongsTo(db.Product, { foreignKey: 'product_id' })

db.Category.hasMany(db.Product, { foreignKey: 'category_id' })
db.Product.belongsTo(db.Category, { foreignKey: 'category_id' })

module.exports = db
