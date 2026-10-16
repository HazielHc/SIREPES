const booleanFromEnv = (name, value, fallback = false) => {
  if (value === undefined || value === '') return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`${name} debe ser "true" o "false".`)
}

export function loadEnv(source = process.env) {
  const nodeEnv = source.NODE_ENV || 'development'
  const port = Number(source.PORT || 3000)
  const databaseUrl = source.DATABASE_URL

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un número entre 1 y 65535.')
  }
  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL. Copia .env.example a .env y configura PostgreSQL.')
  }

  let parsedDatabaseUrl
  try {
    parsedDatabaseUrl = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL debe ser una URL PostgreSQL válida.')
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL debe usar el protocolo postgres:// o postgresql://.')
  }

  return Object.freeze({
    nodeEnv,
    port,
    databaseUrl,
    databaseSsl: booleanFromEnv('DATABASE_SSL', source.DATABASE_SSL),
  })
}

export const env = loadEnv()
