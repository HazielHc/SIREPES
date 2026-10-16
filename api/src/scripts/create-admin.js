import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { pool } from '../db/pool.js'
import { hashPassword, validatePassword } from '../shared/passwords.js'

function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    stdout.write(prompt)
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Ejecuta el comando desde una terminal interactiva para ocultar la contraseña.'))
      return
    }
    let value = ''
    const cleanup = () => { stdin.off('data', onData); stdin.setRawMode(false); stdin.pause() }
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { cleanup(); reject(new Error('Operación cancelada.')); return }
        if (char === '\r' || char === '\n') { cleanup(); stdout.write('\n'); resolve(value); return }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else value += char
      }
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
  })
}

const rl = readline.createInterface({ input: stdin, output: stdout })
let client
try {
  const fullName = (await rl.question('Nombre del administrador: ')).trim().replace(/\s+/g, ' ')
  const username = (await rl.question('Usuario: ')).trim().toLowerCase()
  const email = (await rl.question('Correo institucional: ')).trim().toLowerCase()
  rl.close()
  const password = await askHidden('Contraseña (8 a 15 caracteres; no se mostrará): ')
  const confirmation = await askHidden('Confirma la contraseña: ')
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
  validatePassword(password)
  if (fullName.length < 3 || fullName.length > 160 || username.length < 3 || username.length > 120
      || !/^[a-z0-9._-]+$/.test(username) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Nombre, usuario o correo inválido.')
  }

  const passwordHash = await hashPassword(password)
  client = await pool.connect()
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(7342201)')
  const inserted = await client.query(
    `INSERT INTO users (username, email, full_name, role, status, password_hash, must_change_password)
     VALUES ($1, $2, $3, 'administrador', 'active', $4, false)
     RETURNING id, username, full_name AS "fullName"`,
    [username, email, fullName, passwordHash],
  )
  await client.query(
    `INSERT INTO audit_events (action, target_type, target_id, result, metadata)
     VALUES ('admin.user.create.local', 'user', $1, 'success', '{"role":"administrador"}'::jsonb)`,
    [inserted.rows[0].id],
  )
  await client.query('COMMIT')
  console.log(`Cuenta administradora creada: ${inserted.rows[0].username} (${inserted.rows[0].fullName}).`)
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {})
  if (error.code === '23505') console.error('No se pudo crear la cuenta: el usuario o el correo ya están registrados.')
  else console.error(`No se pudo crear el administrador: ${error.message}`)
  process.exitCode = 1
} finally {
  rl.close()
  client?.release()
  await pool.end()
}
