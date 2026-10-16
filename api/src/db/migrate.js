import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './pool.js'

const migrationDirectory = fileURLToPath(new URL('../../../database/migrations/', import.meta.url))
const advisoryLockId = 724195031

export async function runMigrations() {
  const client = await pool.connect()
  let locked = false

  try {
    await client.query('SELECT pg_advisory_lock($1)', [advisoryLockId])
    locked = true

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `)

    const files = (await readdir(migrationDirectory))
      .filter((name) => /^\d{3}_[a-z0-9_-]+\.sql$/i.test(name))
      .sort()

    for (const name of files) {
      const sql = await readFile(path.join(migrationDirectory, name), 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      const recorded = await client.query(
        'SELECT checksum FROM schema_migrations WHERE name = $1',
        [name],
      )

      if (recorded.rowCount > 0) {
        if (recorded.rows[0].checksum !== checksum) {
          throw new Error(`La migración aplicada ${name} fue modificada; crea una migración nueva.`)
        }
        continue
      }

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)',
          [name, checksum],
        )
        await client.query('COMMIT')
        console.log(`Migración aplicada: ${name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    return { migrationCount: files.length }
  } finally {
    if (locked) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [advisoryLockId])
      } catch {
        // Releasing the connection also releases its advisory lock.
      }
    }
    client.release()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runMigrations()
    console.log(`Migraciones verificadas (${result.migrationCount} archivo(s) presentes).`)
  } catch (error) {
    console.error(`No se pudieron ejecutar las migraciones: ${error.message}`)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}
