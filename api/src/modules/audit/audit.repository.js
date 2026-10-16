import { pool } from '../../db/pool.js'

export async function writeAudit({ actorUserId = null, action, targetType = null, targetId = null, result = 'success', module = null, requestId = null, metadata = {}, client = pool }) {
  try {
    await client.query(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, result, module, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [actorUserId, action, targetType, targetId == null ? null : String(targetId), result, module, requestId, JSON.stringify(metadata)],
    )
  } catch (error) {
    // Audit writes are operationally important. Surface the failure without payloads/secrets.
    console.error('No se pudo guardar un evento de auditoría:', error.code || error.name)
    throw error
  }
}
