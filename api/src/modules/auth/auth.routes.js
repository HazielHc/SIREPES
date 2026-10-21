import { Router } from 'express'
import { pool } from '../../db/pool.js'
import { authenticate } from '../../middleware/authenticate.js'
import { createSessionToken, digestSessionToken, SESSION_COOKIE, SESSION_HOURS, setSessionCookie, clearSessionCookie } from '../../shared/sessions.js'
import { hashPassword, validatePassword, verifyPassword } from '../../shared/passwords.js'
import { writeAudit } from '../audit/audit.repository.js'

const router = Router()
const attempts = new Map()
const dummyHash = '$argon2id$v=19$m=19456,p=1,t=2$GTtsOpLSIJufO3sC8gCGXw$3WnZVI9jrmAiyX9zTvh/JJOJLdTmrsx5CvItIrz/p+g'

function safeUser(user) {
  return { id: user.id, username: user.username, fullName: user.fullName, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword }
}

function trackAttempt(key, current, now) {
  for (const [oldKey, value] of attempts) if (value.until <= now) attempts.delete(oldKey)
  while (attempts.size >= 5000 && !attempts.has(key)) attempts.delete(attempts.keys().next().value)
  attempts.set(key, current?.until > now ? { count: current.count + 1, until: current.until } : { count: 1, until: now + 15 * 60_000 })
}

router.post('/login', async (request, response, next) => {
  const username = String(request.body?.username || '').trim().toLowerCase().slice(0, 120)
  const password = request.body?.password
  const key = `${request.ip}:${username}`
  const ipKey = `${request.ip}:*`
  const now = Date.now()
  const record = attempts.get(key)
  const ipAttempts = attempts.get(ipKey)
  if ((record && record.until > now && record.count >= 10) || (ipAttempts && ipAttempts.until > now && ipAttempts.count >= 30)) {
    return response.status(429).json({ code: 'RATE_LIMITED', message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, username, full_name AS "fullName", email, role, status,
              must_change_password AS "mustChangePassword", password_hash AS "passwordHash"
       FROM users WHERE username = $1`, [username],
    )
    const user = rows[0]
    const boundedPassword = typeof password === 'string' && password.length <= 15 ? password : ''
    const valid = user ? await verifyPassword(user.passwordHash, boundedPassword) : await verifyPassword(dummyHash, boundedPassword)
    if (!user || user.status !== 'active' || !valid || boundedPassword !== password) {
      trackAttempt(key, record, now)
      trackAttempt(ipKey, ipAttempts, now)
      await writeAudit({ actorUserId: user?.id, action: 'auth.login', targetType: 'user', targetId: user?.id, result: 'failure', requestId: request.id })
      return response.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos.' })
    }

    attempts.delete(key)
    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000)
    await pool.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [digestSessionToken(token), user.id, expiresAt])
    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])
    await writeAudit({ actorUserId: user.id, action: 'auth.login', targetType: 'user', targetId: user.id, result: 'success', requestId: request.id })
    setSessionCookie(response, token, expiresAt)
    return response.json({ user: safeUser(user) })
  } catch (error) { next(error) }
})

router.get('/me', authenticate, (request, response) => {
  response.json({ user: { id: request.user.id, username: request.user.username, fullName: request.user.fullName, role: request.user.role, mustChangePassword: request.user.mustChangePassword } })
})

router.post('/logout', authenticate, async (request, response, next) => {
  try {
    await pool.query('UPDATE auth_sessions SET revoked_at = now() WHERE id = $1', [request.sessionId])
    await writeAudit({ actorUserId: request.user.id, action: 'auth.logout', targetType: 'user', targetId: request.user.id, result: 'success', requestId: request.id })
    clearSessionCookie(response)
    response.status(204).end()
  } catch (error) { next(error) }
})

router.post('/change-password', authenticate, async (request, response, next) => {
  try {
    const { currentPassword, newPassword } = request.body || {}
    validatePassword(newPassword)
    const { rows } = await pool.query('SELECT password_hash AS "passwordHash" FROM users WHERE id = $1', [request.user.id])
    if (!await verifyPassword(rows[0].passwordHash, currentPassword)) {
      return response.status(400).json({ code: 'INVALID_CURRENT_PASSWORD', message: 'La contraseña actual no es correcta.' })
    }
    if (currentPassword === newPassword) return response.status(400).json({ code: 'PASSWORD_UNCHANGED', message: 'Elige una contraseña distinta a la actual.' })
    const hash = await hashPassword(newPassword)
    const token = createSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('UPDATE users SET password_hash = $1, must_change_password = false, password_changed_at = now(), updated_at = now() WHERE id = $2', [hash, request.user.id])
      await client.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [request.user.id])
      await client.query('INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [digestSessionToken(token), request.user.id, expiresAt])
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    setSessionCookie(response, token, expiresAt)
    response.json({ user: { id: request.user.id, username: request.user.username, fullName: request.user.fullName, role: request.user.role, mustChangePassword: false } })
  } catch (error) { next(error) }
})

export default router
