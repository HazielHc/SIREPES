import pg from 'pg'
import { env } from '../config/env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ...(env.databaseSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  application_name: 'sirepes-api',
})

pool.on('error', (error) => {
  // Do not print connection strings or driver error details that may contain secrets.
  console.error(`Error inesperado en el pool PostgreSQL: ${error.code || 'sin código'}`)
})

export const query = (text, values) => pool.query(text, values)
