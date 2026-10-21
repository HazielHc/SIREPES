import { Router } from 'express'
import { randomInt, randomUUID } from 'node:crypto'
import { pool } from '../../db/pool.js'
import { authenticate, requireRole } from '../../middleware/authenticate.js'
import { createTemporaryPassword, hashPassword } from '../../shared/passwords.js'
import { sendTemporaryCredentials, isMailConfigured } from '../mail/mailer.js'
import { writeAudit } from '../audit/audit.repository.js'

const router = Router()
const ROLES = new Set(['capturista', 'personal_seder', 'invitado'])
const KNOWN_ROLES = new Set([...ROLES, 'administrador'])
const resetAttempts = new Map()

function fail(status, code, message) {
  const error = new Error(message)
  error.status = status
  error.code = code
  throw error
}

function stageFailure(stage, code) {
  const error = new Error('User account operation failed.')
  error.status = 500
  error.code = code
  error.stage = stage
  return error
}

function logSafeStageFailure(requestId, stage, code) {
  console.error(JSON.stringify({ requestId, status: 500, stage, code }))
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function usernameBase(fullName, email) {
  return fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 28) || email.split('@')[0].replace(/[^a-z0-9._-]/g, '').slice(0, 28) || 'usuario'
}

async function uniqueUsername(client, base) {
  for (let i = 0; i < 8; i += 1) {
    const username = i === 0 ? base : `${base.slice(0, 24)}${randomInt(1000, 10000)}`
    const { rowCount } = await client.query('SELECT 1 FROM users WHERE username = $1', [username])
    if (!rowCount) return username
  }
  return `${base.slice(0, 22)}${randomUUID().slice(0, 6)}`
}

function trackResetAttempt(key, current, now) {
  for (const [oldKey, value] of resetAttempts) if (value.until <= now) resetAttempts.delete(oldKey)
  while (resetAttempts.size >= 2000 && !resetAttempts.has(key)) resetAttempts.delete(resetAttempts.keys().next().value)
  resetAttempts.set(key, current?.until > now ? { count: current.count + 1, until: current.until } : { count: 1, until: now + 60 * 60_000 })
}

router.use(authenticate, requireRole('administrador'))

router.get('/', async (request, response, next) => {
  try {
    const search = String(request.query.search || '').trim().slice(0, 120)
    const role = String(request.query.role || '')
    const status = String(request.query.status || '')
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(request.query.pageSize, 10) || 10))
    const values = []
    const conditions = []
    if (search) { values.push(`%${search}%`); conditions.push(`(full_name ILIKE $${values.length} OR username ILIKE $${values.length} OR email ILIKE $${values.length})`) }
    if (role && ['administrador', ...ROLES].includes(role)) { values.push(role); conditions.push(`role = $${values.length}`) }
    if (status && ['active', 'disabled'].includes(status)) { values.push(status); conditions.push(`status = $${values.length}`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const count = await pool.query(`SELECT count(*)::int AS total FROM users ${where}`, values)
    const rows = await pool.query(
      `SELECT id, username, full_name AS "fullName", email, role, status, created_at AS "createdAt", last_login_at AS "lastLoginAt"
       FROM users ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    )
    response.json({ users: rows.rows, pagination: { page, pageSize, total: count.rows[0].total } })
  } catch (error) { next(error) }
})

router.post('/', async (request, response, next) => {
  try {
    const fullName = String(request.body?.fullName || '').trim().replace(/\s+/g, ' ')
    const email = String(request.body?.email || '').trim().toLowerCase()
    const role = String(request.body?.role || '')
    if (fullName.length < 3 || fullName.length > 160 || !validEmail(email) || !ROLES.has(role)) {
      return response.status(400).json({ code: 'INVALID_USER', message: 'Revisa nombre, correo y perfil del usuario.', requestId: request.id })
    }
    if (!isMailConfigured()) fail(503, 'MAIL_NOT_CONFIGURED', 'El correo institucional no está configurado. Define SMTP_HOST, SMTP_PORT y SMTP_FROM antes de crear cuentas.')

    let user
    let temporaryPassword
    let client
    try {
      temporaryPassword = createTemporaryPassword()
      const passwordHash = await hashPassword(temporaryPassword)
      client = await pool.connect()
      await client.query('BEGIN')
      const username = await uniqueUsername(client, usernameBase(fullName, email))
      const inserted = await client.query(
        `INSERT INTO users (username, email, full_name, role, status, password_hash, must_change_password, created_by)
         VALUES ($1, $2, $3, $4, 'disabled', $5, true, $6)
         RETURNING id, username, full_name AS "fullName", email, role, status, created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
        [username, email, fullName, role, passwordHash, request.user.id],
      )
      user = inserted.rows[0]
      await client.query('COMMIT')
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => logSafeStageFailure(request.id, 'insert_rollback', 'USER_CREATE_FAILED'))
      if (error.code === '23505') throw error
      throw stageFailure('insert', 'USER_CREATE_FAILED')
    } finally { client?.release() }

    try {
      try {
        await sendTemporaryCredentials({ to: email, fullName, username: user.username, password: temporaryPassword })
      } catch {
        throw stageFailure('delivery', 'USER_EMAIL_DELIVERY_FAILED')
      }

      try {
        const activation = await pool.connect()
        try {
          await activation.query('BEGIN')
          const activated = await activation.query("UPDATE users SET status = 'active', updated_at = now() WHERE id = $1 AND status = 'disabled'", [user.id])
          if (activated.rowCount !== 1) throw stageFailure('activation', 'USER_ACTIVATION_FAILED')
          await writeAudit({ actorUserId: request.user.id, action: 'admin.user.create', targetType: 'user', targetId: user.id, requestId: request.id, metadata: { role }, client: activation })
          await activation.query('COMMIT')
        } catch (error) {
          await activation.query('ROLLBACK').catch(() => logSafeStageFailure(request.id, 'activation_rollback', 'USER_ACTIVATION_FAILED'))
          if (error.stage === 'activation') throw error
          throw stageFailure('activation', 'USER_ACTIVATION_FAILED')
        } finally { activation.release() }
      } catch (error) {
        if (error.stage === 'activation') throw error
        throw stageFailure('activation', 'USER_ACTIVATION_FAILED')
      }
    } catch (operationError) {
      try {
        await pool.query('DELETE FROM users WHERE id = $1', [user.id])
      } catch {
        logSafeStageFailure(request.id, 'cleanup', 'USER_CLEANUP_FAILED')
      }
      throw operationError
    }
    response.status(201).json({ user: { ...user, status: 'active' } })
  } catch (error) {
    if (error.code === '23505') return response.status(409).json({ code: 'USER_EXISTS', message: 'Ya existe una cuenta con esos datos.', requestId: request.id })
    next(error)
  }
})

router.patch('/:id', async (request, response, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
    return response.status(400).json({ code: 'INVALID_USER_ID', message: 'El identificador de cuenta no es válido.' })
  }
  const { role, status } = request.body || {}
  if (request.user.id === request.params.id && (status === 'disabled' || (role && role !== request.user.role))) {
    return response.status(400).json({ code: 'SELF_CHANGE_BLOCKED', message: 'No puedes deshabilitar o cambiar el perfil de tu propia cuenta.' })
  }
  if (role !== undefined && !KNOWN_ROLES.has(role)) return response.status(400).json({ code: 'INVALID_ROLE', message: 'El perfil solicitado no está permitido.' })
  if (status !== undefined && !['active', 'disabled'].includes(status)) return response.status(400).json({ code: 'INVALID_STATUS', message: 'El estado solicitado no está permitido.' })
  if (role === undefined && status === undefined) return response.status(400).json({ code: 'EMPTY_UPDATE', message: 'Indica un perfil o estado para actualizar.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(7342201)')
    const current = await client.query('SELECT id, role, status FROM users WHERE id = $1 FOR UPDATE', [request.params.id])
    if (!current.rowCount) { await client.query('ROLLBACK'); return response.status(404).json({ code: 'USER_NOT_FOUND', message: 'No se encontró la cuenta.' }) }
    if (role === 'administrador' && current.rows[0].role !== 'administrador') {
      await client.query('ROLLBACK')
      return response.status(400).json({ code: 'INVALID_ROLE', message: 'El perfil Administrador no puede asignarse desde la web.' })
    }
    const targetIsActiveAdmin = current.rows[0].role === 'administrador' && current.rows[0].status === 'active'
    const removesActiveAdmin = targetIsActiveAdmin && ((role !== undefined && role !== 'administrador') || status === 'disabled')
    if ((current.rows[0].role === 'administrador' && role !== undefined) || removesActiveAdmin) {
      const { rows: adminCount } = await client.query("SELECT count(*)::int AS total FROM users WHERE role = 'administrador' AND status = 'active'")
      const activeAdminsAfterChange = adminCount[0].total - (removesActiveAdmin ? 1 : 0)
      if (activeAdminsAfterChange < 1) {
        await client.query('ROLLBACK')
        return response.status(409).json({ code: 'LAST_ADMIN', message: 'Debe permanecer al menos una cuenta administradora activa.' })
      }
    }
    const updated = await client.query(
      `UPDATE users SET role = COALESCE($1, role), status = COALESCE($2, status), updated_at = now()
       WHERE id = $3 RETURNING id, username, full_name AS "fullName", email, role, status, created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
      [role ?? null, status ?? null, request.params.id],
    )
    if (status === 'disabled') await client.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [request.params.id])
    await writeAudit({ actorUserId: request.user.id, action: status ? `admin.user.${status}` : 'admin.user.role', targetType: 'user', targetId: request.params.id, requestId: request.id, metadata: { ...(role ? { role } : {}), ...(status ? { status } : {}) }, client })
    await client.query('COMMIT')
    response.json({ user: updated.rows[0] })
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); next(error) } finally { client.release() }
})

router.post('/:id/reset-password', async (request, response, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.params.id)) {
      return response.status(400).json({ code: 'INVALID_USER_ID', message: 'El identificador de cuenta no es válido.' })
    }
    const resetKey = `${request.user.id}:${request.ip}`
    const now = Date.now()
    const attempts = resetAttempts.get(resetKey)
    if (attempts && attempts.until > now && attempts.count >= 5) return response.status(429).json({ code: 'RATE_LIMITED', message: 'Se alcanzó el límite de restablecimientos. Intenta de nuevo más tarde.' })
    trackResetAttempt(resetKey, attempts, now)
    if (!isMailConfigured()) fail(503, 'MAIL_NOT_CONFIGURED', 'El correo institucional no está configurado. Define SMTP_HOST, SMTP_PORT y SMTP_FROM antes de restablecer accesos.')
    const { rows } = await pool.query('SELECT id, username, full_name AS "fullName", email, status FROM users WHERE id = $1', [request.params.id])
    const user = rows[0]
    if (!user) return response.status(404).json({ code: 'USER_NOT_FOUND', message: 'No se encontró la cuenta.' })
    if (user.status !== 'active') return response.status(400).json({ code: 'USER_DISABLED', message: 'Reactiva la cuenta antes de restablecer el acceso.' })
    const client = await pool.connect()
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))', [user.id])
      await client.query('BEGIN')
      const latest = await client.query('SELECT status, email, username, full_name AS "fullName" FROM users WHERE id = $1 FOR UPDATE', [user.id])
      if (!latest.rowCount || latest.rows[0].status !== 'active') {
        await client.query('ROLLBACK')
        return response.status(400).json({ code: 'USER_DISABLED', message: 'La cuenta ya no está activa.' })
      }
      const password = createTemporaryPassword()
      const hash = await hashPassword(password)
      await sendTemporaryCredentials({ to: latest.rows[0].email, fullName: latest.rows[0].fullName, username: latest.rows[0].username, password, reset: true })
      await client.query('UPDATE users SET password_hash = $1, must_change_password = true, updated_at = now() WHERE id = $2', [hash, user.id])
      await client.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [user.id])
      await writeAudit({ actorUserId: request.user.id, action: 'admin.user.reset_password', targetType: 'user', targetId: user.id, requestId: request.id, client })
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error }
    finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [user.id]).catch(() => {})
      client.release()
    }
    response.status(202).json({ message: 'Se envió una contraseña temporal al correo registrado.' })
  } catch (error) { next(error) }
})

export default router
