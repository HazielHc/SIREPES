async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.message || 'No fue posible completar la solicitud.')
    error.status = response.status
    error.code = result.code
    error.requestId = result.requestId || response.headers.get('X-Request-Id') || null
    throw error
  }
  return result
}

export const recordsApi = {
  list(module, filters = {}) {
    const query = new URLSearchParams({
      module,
      search: filters.search || '',
      status: filters.status || '',
      personType: filters.personType || '',
      page: String(filters.page || 1),
      pageSize: String(filters.pageSize || 50),
    })
    return request(`/api/records?${query}`)
  },
  get(id) {
    return request(`/api/records/${encodeURIComponent(id)}`)
  },
  create(payload) {
    return request('/api/records', { method: 'POST', body: JSON.stringify(payload) })
  },
  update(id, payload) {
    return request(`/api/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  finalize(id, payload) {
    return request(`/api/records/${encodeURIComponent(id)}/finalize`, { method: 'POST', body: JSON.stringify(payload) })
  },
}
