require('dotenv').config()
const express = require('express')
const path = require('path')
const methodOverride = require('method-override')
const session = require('express-session')
const flash = require('connect-flash')
const expressLayouts = require('express-ejs-layouts')
const { requireAuth } = require('./middlewares/auth')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(expressLayouts)
app.set('layout', '../layouts/main')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(methodOverride('_method'))

app.use(express.static(path.join(__dirname, 'public')))
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')))

app.use(session({
  secret: process.env.SESSION_SECRET || 'bittora-secret',
  resave: false,
  saveUninitialized: true
}))

app.use(flash())

app.use((req, res, next) => {
  if (!Array.isArray(req.session.cart)) {
    req.session.cart = []
  }

  const cartCount = req.session.cart.reduce((sum, item) => {
    if (!item || typeof item !== 'object') return sum
    return sum + Number(item.quantity || 0)
  }, 0)

  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  res.locals.currentUser = req.session.user || null
  res.locals.isAdmin = !!(req.session.user && req.session.user.role === 'admin')
  res.locals.isUser = !!(req.session.user && req.session.user.role !== 'admin')
  res.locals.cartCount = cartCount
  next()
})

app.use('/auth', require('./routes/authRoutes'))
app.use(requireAuth)
app.use('/', require('./routes/homeRoutes'))
app.use('/products', require('./routes/productRoutes'))
app.use('/categories', require('./routes/categoryRoutes'))
app.use('/users', require('./routes/userRoutes'))
app.use('/orders', require('./routes/orderRoutes'))
app.use('/cart', require('./routes/cartRoutes'))
app.use('/order-items', require('./routes/orderItemRoutes'))
app.use('/order_items', require('./routes/orderItemRoutes'))
app.use('/reports', require('./routes/reportRoutes'))

const PORT = Number(process.env.PORT || 3000)
app.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`)
})
