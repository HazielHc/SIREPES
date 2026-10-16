async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'No fue posible completar la solicitud.')
  return result
}

export const usersApi = {
  listUsers({ search = '', role = '', status = '', page = 1, pageSize = 10 }) {
    const query = new URLSearchParams({ search, role, status, page: String(page), pageSize: String(pageSize) })
    return request(`/api/admin/users?${query}`)
  },
  createUser(payload) {
    return request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) })
  },
  updateUser(id, payload) {
    return request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },
  resetPassword(id) {
    return request(`/api/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST' })
  },
}
