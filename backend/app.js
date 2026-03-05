require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./models')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/reports', require('./routes/reportRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/order-items', require('./routes/orderItemRoutes'))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ message: err.message || 'Internal server error' })
})

const PORT = Number(process.env.PORT || 5000)

db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running at http://localhost:${PORT}`)
  })
}).catch((error) => {
  console.error('Failed to start backend:', error)
  process.exit(1)
})
