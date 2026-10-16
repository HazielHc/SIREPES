import { pool } from '../db/pool.js'
import { digestSessionToken, SESSION_COOKIE } from '../shared/sessions.js'

export async function authenticate(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token) return response.status(401).json({ code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' })

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.full_name AS "fullName", u.role, u.status,
              u.must_change_password AS "mustChangePassword", s.id AS "sessionId"
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
      [digestSessionToken(token)],
    )
    const user = rows[0]
    if (!user) return response.status(401).json({ code: 'UNAUTHENTICATED', message: 'La sesión ya no es válida.' })
    request.user = user
    request.sessionId = user.sessionId
    await pool.query('UPDATE auth_sessions SET last_seen_at = now() WHERE id = $1', [user.sessionId])
    const currentPath = `${request.baseUrl}${request.path}`
    if (user.mustChangePassword && !['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'].includes(currentPath)) {
      return response.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Cambia tu contraseña para continuar.' })
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ code: 'FORBIDDEN', message: 'No tienes permiso para realizar esta acción.' })
    }
    next()
  }
}
