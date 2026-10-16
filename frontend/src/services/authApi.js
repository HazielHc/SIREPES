export async function loginWithCredentials({ username, password }) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.message || 'No fue posible validar el acceso.')
  }

  return result
}

async function readResponse(response) {
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'No fue posible completar la solicitud.')
  return result
}

export async function getCurrentUser() {
  return readResponse(await fetch('/api/auth/me', { credentials: 'include' }))
}

export async function logoutFromApi() {
  return readResponse(await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }))
}

export async function changePassword({ currentPassword, newPassword }) {
  return readResponse(await fetch('/api/auth/change-password', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  }))
}
