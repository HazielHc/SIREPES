import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { createRecord, fetchRecord, finalizeRecord, listRecords, updateRecord } from './records.repository.js'

const router = Router()
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

router.use((request, response, next) => {
  response.setHeader('Cache-Control', 'private, no-store')
  next()
})
router.use(authenticate)

router.get('/', async (request, response, next) => {
  try {
    response.json(await listRecords({
      actorId: request.user.id,
      role: request.user.role,
      module: request.query.module,
      search: request.query.search,
      status: request.query.status,
      personType: request.query.personType,
      page: request.query.page,
      pageSize: request.query.pageSize,
      requestId: request.id,
    }))
  } catch (error) { next(error) }
})

router.post('/', async (request, response, next) => {
  try {
    response.status(201).json(await createRecord({ actorId: request.user.id, role: request.user.role, body: request.body, requestId: request.id }))
  } catch (error) { next(error) }
})

router.get('/:id', async (request, response, next) => {
  if (!UUID.test(request.params.id)) return response.status(400).json({ code: 'INVALID_RECORD_ID', message: 'El identificador del expediente no es válido.', requestId: request.id })
  try {
    response.json(await fetchRecord({ actorId: request.user.id, role: request.user.role, id: request.params.id, requestId: request.id }))
  } catch (error) { next(error) }
})

router.patch('/:id', async (request, response, next) => {
  if (!UUID.test(request.params.id)) return response.status(400).json({ code: 'INVALID_RECORD_ID', message: 'El identificador del expediente no es válido.', requestId: request.id })
  try {
    response.json(await updateRecord({ actorId: request.user.id, role: request.user.role, id: request.params.id, body: request.body, requestId: request.id }))
  } catch (error) { next(error) }
})

router.post('/:id/finalize', async (request, response, next) => {
  if (!UUID.test(request.params.id)) return response.status(400).json({ code: 'INVALID_RECORD_ID', message: 'El identificador del expediente no es válido.', requestId: request.id })
  try {
    response.json(await finalizeRecord({ actorId: request.user.id, role: request.user.role, id: request.params.id, body: request.body, requestId: request.id }))
  } catch (error) { next(error) }
})

export default router
