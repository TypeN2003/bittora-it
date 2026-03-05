const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const contentType = String(response.headers.get('content-type') || '')
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    const message = payload && payload.message ? payload.message : `Request failed: ${response.status}`
    throw new Error(message)
  }

  return payload
}

module.exports = {
  apiRequest,
  API_BASE_URL
}
