import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 15) {
    const error = new Error('La contraseña debe tener entre 8 y 15 caracteres.')
    error.status = 400
    error.code = 'INVALID_PASSWORD'
    throw error
  }
}

export function hashPassword(password) {
  validatePassword(password)
  return argon2.hash(password, ARGON_OPTIONS)
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function createTemporaryPassword() {
  return randomBytes(12).toString('base64url').slice(0, 15)
}
