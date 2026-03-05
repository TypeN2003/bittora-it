const { apiRequest } = require('../lib/apiClient')

function withGet(row) {
  if (!row || typeof row !== 'object') return row
  return {
    ...row,
    get(key) {
      return row[key]
    }
  }
}

exports.index = async (req, res) => {
  try {
    const payload = await apiRequest('/api/reports')
    const report = payload.data || {}

    res.render('reports/index', {
      summary: report.summary || {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalCustomers: 0
      },
      salesRows: (report.salesRows || []).map(withGet),
      bestSelling: (report.bestSelling || []).map(withGet)
    })
  } catch (error) {
    req.flash('error', `Failed to generate report dashboard: ${error.message}`)
    res.redirect('/')
  }
}

exports.sales = async (req, res) => {
  try {
    const query = new URLSearchParams({
      date: String(req.query.date || ''),
      month: String(req.query.month || '')
    }).toString()

    const payload = await apiRequest(`/api/reports/sales?${query}`)
    const data = payload.data || {}

    res.render('reports/sales', {
      orders: data.orders || [],
      orderItemsByOrderId: data.orderItemsByOrderId || {},
      productSalesRows: (data.productSalesRows || []).map(withGet),
      salesRows: (data.salesRows || []).map(withGet),
      totalOrders: Number(data.totalOrders || 0),
      totalRevenue: Number(data.totalRevenue || 0),
      totalProductQuantity: Number(data.totalProductQuantity || 0),
      totalProductRevenue: Number(data.totalProductRevenue || 0),
      filters: data.filters || { date: '', month: '' }
    })
  } catch (error) {
    req.flash('error', `Failed to generate sales report: ${error.message}`)
    res.redirect('/reports')
  }
}

exports.bestProducts = async (req, res) => {
  try {
    const payload = await apiRequest('/api/reports/best-products')
    const data = payload.data || {}

    res.render('reports/best-products', {
      bestSelling: (data.bestSelling || []).map(withGet),
      bestMonthByProductId: data.bestMonthByProductId || {}
    })
  } catch (error) {
    req.flash('error', `Failed to generate best-selling report: ${error.message}`)
    res.redirect('/reports')
  }
}

exports.salesByDate = exports.sales
exports.bestSellingProducts = exports.bestProducts
