import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'sirepes_session'
export const SESSION_HOURS = Math.min(168, Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 12))

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function digestSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function setSessionCookie(response, token, expiresAt) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(response) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}
