import express from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import recordsRoutes from './modules/records/records.routes.js'
import { query } from './db/pool.js'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'node:crypto'

const app = express()

app.disable('x-powered-by')
app.use((request, response, next) => {
  request.id = randomUUID()
  response.setHeader('X-Request-Id', request.id)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
    if (!request.get('origin') || request.get('origin') !== allowedOrigin) {
      return response.status(403).json({ code: 'ORIGIN_NOT_ALLOWED', message: 'Origen de solicitud no permitido.', requestId: request.id })
    }
  }
  next()
})
app.use(cookieParser())
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'sirepes-api' })
})

app.get('/api/ready', async (_request, response) => {
  try {
    await query('SELECT 1')
    response.json({ status: 'ready', service: 'sirepes-api', database: 'ok' })
  } catch {
    response.status(503).json({ status: 'not_ready', service: 'sirepes-api', database: 'unavailable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/admin/users', usersRoutes)
app.use('/api/records', recordsRoutes)

app.use((error, request, response, _next) => {
  const status = Number(error.status) || 500
  const safeCode = typeof error.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : 'INTERNAL_ERROR'
  if (status >= 500) {
    console.error(JSON.stringify({
      requestId: request.id,
      status,
      stage: typeof error.stage === 'string' && /^[a-z_]{1,32}$/.test(error.stage) ? error.stage : 'api',
      code: safeCode,
    }))
  }
  response.status(status).json({
    code: safeCode,
    message: status >= 500 ? 'Ocurrió un error interno. Inténtalo nuevamente.' : error.message,
    requestId: request.id,
  })
})

app.use((request, response) => {
  response.status(404).json({ code: 'NOT_FOUND', message: 'Recurso no encontrado.', requestId: request.id })
})

export default app
