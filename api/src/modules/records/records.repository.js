import { randomUUID } from 'node:crypto'
import { pool } from '../../db/pool.js'
import { writeAudit } from '../audit/audit.repository.js'

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const physical = { nombres: 'nombres', apellidoPaterno: 'apellido_paterno', apellidoMaterno: 'apellido_materno', curp: 'curp', rfcFisica: 'rfc', fechaNacimiento: 'fecha_nacimiento', edad: 'edad', sexo: 'sexo', lugarNacimiento: 'lugar_nacimiento', municipioNacimiento: 'municipio_nacimiento', estadoNacimiento: 'estado_nacimiento' }
const moral = { razonSocial: 'razon_social', rfcMoral: 'rfc', numeroSocios: 'numero_socios', padronActualizado: 'padron_actualizado', representante: 'representante', curpRepresentante: 'curp_representante', rfcRepresentante: 'rfc_representante', rnpa: 'rnpa' }
const contact = { calle: 'calle', numeroExterior: 'numero_exterior', numeroInterior: 'numero_interior', codigoPostal: 'codigo_postal', localidad: 'localidad', municipio: 'municipio', estado: 'estado', telefono: 'telefono', correo: 'correo' }
const pesca = { rnpa: 'rnpa', estatusPescador: 'estatus_pescador', cooperativa: 'cooperativa', escolaridad: 'escolaridad', experiencia: 'experiencia', especies: 'especies', produccionPescado: 'produccion_pescado', produccionCrustaceos: 'produccion_crustaceos', produccionMoluscos: 'produccion_moluscos', ingresos: 'ingresos', permisos: 'permisos', artesEquipo: 'artes_equipo', actividadAlterna: 'actividad_alterna', actividadAlternaCual: 'actividad_alterna_cual', lugarPesca: 'lugar_pesca', sitioDesembarque: 'sitio_desembarque', observaciones: 'observaciones' }
const boat = { tieneEmbarcacion: 'cuenta_con_embarcacion', nombreEmbarcacion: 'nombre', estadoRegistro: 'estado_registro', matricula: 'matricula', eslora: 'eslora', manga: 'manga', capacidadPersonas: 'capacidad_personas', tieneMotor: 'tiene_motor', potenciaMotor: 'potencia_motor', marcaMotor: 'marca_motor', tiemposMotor: 'tiempos_motor' }
const aqua = { rnpaPersona: 'rnpa_persona', tieneEmbarcacion: 'tiene_embarcacion', tipoEmbarcacion: 'tipo_embarcacion' }
const upa = { nombreUpa: 'nombre', rnpaInstalacion: 'rnpa_instalacion', fechaInicio: 'fecha_inicio', estatusUpa: 'estatus', domicilioUpa: 'domicilio', localidadUpa: 'localidad', municipioUpa: 'municipio', estadoUpa: 'estado', cpUpa: 'codigo_postal', telefonoUpa: 'telefono', correoUpa: 'correo', predio: 'predio', latitud: 'latitud', longitud: 'longitud', areaTotal: 'area_total' }
const infra = { sistemaCultivo: 'sistema_cultivo', numeroEstanques: 'numero_estanques', areaEspejo: 'area_espejo', volumenAgua: 'volumen_agua', energiaElectrica: 'energia_electrica', tipoEnergia: 'tipo_energia', equipoBombeo: 'equipo_bombeo', motores: 'motores', combustible: 'combustible', bombas: 'bombas', material: 'material', aireacion: 'aireacion', tipoAireacion: 'tipo_aireacion', excluidorFauna: 'excluidor_fauna', tipoFauna: 'tipo_fauna', bodega: 'bodega', cuartoFrio: 'cuarto_frio', alimentadorAutomatico: 'alimentador_automatico' }
const production = { especie: 'especie', especieOtra: 'especie_otra', nombreCientifico: 'nombre_cientifico', nombreComun: 'nombre_comun', densidad: 'densidad', organismosCiclo: 'organismos_ciclo', ciclosAnuales: 'ciclos_anuales', faseSiembra: 'fase_siembra', faseCultivo: 'fase_cultivo', actividadesPreoperativas: 'actividades_preoperativas', tiposPreoperativas: 'tipos_preoperativas', actividadesPoscosecha: 'actividades_poscosecha', detallePoscosecha: 'detalle_poscosecha', medicionFisicoquimica: 'medicion_fisicoquimica', parametros: 'parametros', tipoAlimento: 'tipo_alimento', metodoAlimentacion: 'metodo_alimentacion', valorAgregado: 'valor_agregado', detalleValorAgregado: 'detalle_valor_agregado', certificaciones: 'certificaciones', observaciones: 'observaciones' }
const moduleFields = {
  pesca: new Set([...Object.keys(physical), ...Object.keys(moral), ...Object.keys(contact), ...Object.keys(pesca), ...Object.keys(boat), 'tipoPersona', 'mesesPesca']),
  acuacultura: new Set([...Object.keys(physical), ...Object.keys(moral), ...Object.keys(contact), ...Object.keys(aqua), ...Object.keys(upa), ...Object.keys(infra), ...Object.keys(production), 'tipoPersona', 'metodosCultivo', 'metodoOtro', 'aparatosMedicion', 'bitacoras', 'presentacion', 'presentacionOtra', 'permisoConagua', 'permisoConaguaDetalle', 'permisoSemarnat', 'permisoSemarnatDetalle', 'permisoConapesca', 'permisoConapescaDetalle', 'permisoSenasica', 'permisoSenasicaDetalle']),
}
const numberFields = new Set(['edad', 'numeroSocios', 'experiencia', 'produccionPescado', 'produccionCrustaceos', 'produccionMoluscos', 'ingresos', 'eslora', 'manga', 'capacidadPersonas', 'potenciaMotor', 'latitud', 'longitud', 'areaTotal', 'numeroEstanques', 'areaEspejo', 'volumenAgua', 'densidad', 'organismosCiclo', 'ciclosAnuales'])
const integerFields = new Set(['edad', 'numeroSocios', 'experiencia', 'capacidadPersonas', 'numeroEstanques', 'organismosCiclo', 'ciclosAnuales'])
const dateFields = new Set(['fechaNacimiento', 'fechaInicio'])
const multiFields = new Set(['mesesPesca', 'metodosCultivo', 'aparatosMedicion', 'bitacoras'])

function fail(status, code, message) { const error = new Error(message); error.status = status; error.code = code; throw error }
function positiveSafeInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}
function rejectOwnerFields(value) {
  if (['ownerUserId', 'owner_user_id', 'ownerId', 'userId', 'user_id', 'createdBy', 'created_by', 'updatedBy', 'updated_by'].some((key) => Object.hasOwn(value || {}, key))) fail(400, 'OWNER_NOT_ALLOWED', 'La persona propietaria se determina desde la sesión.')
}
function normalizeValues(raw, module) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(400, 'INVALID_RECORD_VALUES', 'Los datos del expediente no tienen un formato válido.')
  rejectOwnerFields(raw)
  const values = { ...raw }
  for (const key of Object.keys(values)) if (!moduleFields[module]?.has(key)) fail(400, 'UNKNOWN_RECORD_FIELD', 'El expediente contiene un campo no reconocido para este módulo.')
  if (values.tipoPersona != null && values.tipoPersona !== '' && !['Física', 'Moral'].includes(values.tipoPersona)) fail(400, 'INVALID_PERSON_TYPE', 'El tipo de persona no es válido.')
  const physicalFields = Object.keys(physical)
  const moralFields = Object.keys(moral).filter((key) => key !== 'rnpa')
  const hasValue = (key) => values[key] != null && values[key] !== ''
  if (values.tipoPersona === 'Física' && moralFields.some(hasValue)) fail(400, 'PERSON_TYPE_FIELD_MISMATCH', 'El expediente contiene datos exclusivos de persona moral.')
  if (values.tipoPersona === 'Moral' && physicalFields.some(hasValue)) fail(400, 'PERSON_TYPE_FIELD_MISMATCH', 'El expediente contiene datos exclusivos de persona física.')
  if (!values.tipoPersona && [...physicalFields, ...moralFields].some(hasValue)) fail(400, 'PERSON_TYPE_REQUIRED_FOR_IDENTITY', 'Selecciona el tipo de persona antes de guardar sus datos de identidad.')
  for (const key of numberFields) {
    if (values[key] == null || values[key] === '') continue
    const number = Number(values[key])
    if (String(values[key]).length > 100 || !Number.isFinite(number) || (integerFields.has(key) && !Number.isInteger(number))) fail(400, 'INVALID_NUMBER', 'Un campo numérico no tiene un formato válido.')
    values[key] = number
  }
  for (const key of dateFields) {
    if (values[key] == null || values[key] === '') continue
    const date = typeof values[key] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(values[key]) ? new Date(`${values[key]}T00:00:00.000Z`) : null
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== values[key]) fail(400, 'INVALID_DATE', 'Una fecha no tiene un formato válido.')
  }
  for (const key of Object.keys(values)) {
    if (multiFields.has(key)) {
      if (values[key] != null && (!Array.isArray(values[key]) || values[key].some((item) => typeof item !== 'string'))) fail(400, 'INVALID_SELECTION', 'Una selección múltiple no tiene un formato válido.')
      if (Array.isArray(values[key])) values[key] = [...new Set(values[key])]
    } else if (!numberFields.has(key) && !dateFields.has(key) && values[key] != null && typeof values[key] !== 'string') fail(400, 'INVALID_FIELD_VALUE', 'Un campo contiene un valor no válido.')
  }
  return values
}
function toPersonType(values) { return values.tipoPersona === 'Física' ? 'fisica' : values.tipoPersona === 'Moral' ? 'moral' : null }
function valueOf(values, key) { return values[key] === undefined || values[key] === '' ? null : values[key] }

async function upsert(client, table, keyColumn, keyValue, mapping, values) {
  const entries = Object.entries(mapping)
  const columns = [keyColumn, ...entries.map(([, column]) => column)]
  const params = [keyValue, ...entries.map(([key]) => valueOf(values, key))]
  const placeholders = params.map((_, index) => `$${index + 1}`).join(',')
  const updates = entries.map(([, column]) => `${column}=EXCLUDED.${column}`).join(',')
  await client.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT (${keyColumn}) DO UPDATE SET ${updates}`, params)
}
async function replaceMulti(client, table, parentColumn, parentId, valueColumn, values) {
  await client.query(`DELETE FROM ${table} WHERE ${parentColumn}=$1`, [parentId])
  for (const value of values || []) {
    if (table === 'pesca_meses') {
      const month = MONTHS.indexOf(value) + 1
      if (!month) fail(400, 'INVALID_MONTH', 'La selección de meses contiene un valor no válido.')
      await client.query('INSERT INTO pesca_meses (expediente_id,mes) VALUES ($1,$2)', [parentId, month])
    } else await client.query(`INSERT INTO ${table} (${parentColumn},${valueColumn}) VALUES ($1,$2)`, [parentId, value])
  }
}
async function writeForm(client, id, module, values) {
  const kind = toPersonType(values)
  await upsert(client, 'persona_contacto', 'expediente_id', id, contact, values)
  if (kind === 'fisica') {
    await client.query('DELETE FROM personas_morales WHERE expediente_id=$1', [id])
    await upsert(client, 'personas_fisicas', 'expediente_id', id, physical, values)
  } else if (kind === 'moral') {
    await client.query('DELETE FROM personas_fisicas WHERE expediente_id=$1', [id])
    await upsert(client, 'personas_morales', 'expediente_id', id, moral, values)
  } else {
    await client.query('DELETE FROM personas_fisicas WHERE expediente_id=$1', [id])
    await client.query('DELETE FROM personas_morales WHERE expediente_id=$1', [id])
  }
  if (module === 'pesca') {
    await upsert(client, 'pesca_detalles', 'expediente_id', id, pesca, values)
    await replaceMulti(client, 'pesca_meses', 'expediente_id', id, 'mes', values.mesesPesca)
    await client.query('DELETE FROM embarcaciones WHERE expediente_id=$1', [id])
    if (Object.keys(boat).some((key) => values[key] != null && values[key] !== '')) {
      const entries = Object.entries(boat)
      const params = [id, ...entries.map(([key]) => valueOf(values, key))]
      await client.query(`INSERT INTO embarcaciones (expediente_id,${entries.map(([, column]) => column).join(',')}) VALUES (${params.map((_, index) => `$${index + 1}`).join(',')})`, params)
    }
    return
  }
  await upsert(client, 'acuacultura_detalles', 'expediente_id', id, aqua, values)
  const foundUpa = await client.query('SELECT id FROM upas WHERE expediente_id=$1 ORDER BY id LIMIT 1 FOR UPDATE', [id])
  const upaId = foundUpa.rows[0]?.id || randomUUID()
  if (!foundUpa.rowCount) await client.query('INSERT INTO upas (id,expediente_id) VALUES ($1,$2)', [upaId, id])
  const upaEntries = Object.entries(upa)
  await client.query(`UPDATE upas SET ${upaEntries.map(([, column], index) => `${column}=$${index + 2}`).join(',')} WHERE id=$1`, [upaId, ...upaEntries.map(([key]) => valueOf(values, key))])
  const permissions = [['conagua', 'permisoConagua', 'permisoConaguaDetalle'], ['semarnat', 'permisoSemarnat', 'permisoSemarnatDetalle'], ['conapesca', 'permisoConapesca', 'permisoConapescaDetalle'], ['senasica', 'permisoSenasica', 'permisoSenasicaDetalle']]
  await client.query('DELETE FROM upa_permisos WHERE upa_id=$1', [upaId])
  for (const [authority, answer, detail] of permissions) if (values[answer] != null || values[detail] != null) await client.query('INSERT INTO upa_permisos (upa_id,autoridad,tiene_permiso,detalle) VALUES ($1,$2,$3,$4)', [upaId, authority, valueOf(values, answer), valueOf(values, detail)])
  await upsert(client, 'upa_infraestructura', 'upa_id', upaId, infra, values)
  await replaceMulti(client, 'upa_metodos_cultivo', 'upa_id', upaId, 'metodo', values.metodosCultivo)
  if (values.metodosCultivo?.includes('Otro') && values.metodoOtro) await client.query("UPDATE upa_metodos_cultivo SET descripcion_otro=$2 WHERE upa_id=$1 AND metodo='Otro'", [upaId, values.metodoOtro])
  await replaceMulti(client, 'upa_aparatos_medicion', 'upa_id', upaId, 'aparato', values.aparatosMedicion)
  await replaceMulti(client, 'upa_bitacoras', 'upa_id', upaId, 'bitacora', values.bitacoras)
  const foundProduction = await client.query('SELECT id FROM upa_producciones WHERE upa_id=$1 ORDER BY created_at,id LIMIT 1 FOR UPDATE', [upaId])
  const productionId = foundProduction.rows[0]?.id || randomUUID()
  if (!foundProduction.rowCount) await client.query('INSERT INTO upa_producciones (id,upa_id) VALUES ($1,$2)', [productionId, upaId])
  const productionEntries = Object.entries(production)
  await client.query(`UPDATE upa_producciones SET ${productionEntries.map(([, column], index) => `${column}=$${index + 2}`).join(',')} WHERE id=$1`, [productionId, ...productionEntries.map(([key]) => valueOf(values, key))])
  await client.query('DELETE FROM upa_presentaciones WHERE produccion_id=$1', [productionId])
  if (values.presentacion) await client.query('INSERT INTO upa_presentaciones (produccion_id,presentacion,presentacion_otra) VALUES ($1,$2,$3)', [productionId, values.presentacion, valueOf(values, 'presentacionOtra')])
}

async function readMapping(client, table, keyColumn, id, mapping) {
  const { rows } = await client.query(`SELECT ${Object.values(mapping).join(',')} FROM ${table} WHERE ${keyColumn}=$1`, [id])
  return rows[0] ? Object.fromEntries(Object.entries(mapping).map(([key, column]) => [key, rows[0][column]])) : {}
}
async function readRecord(client, id) {
  const { rows } = await client.query('SELECT id,modulo,tipo_persona,estado,folio,current_section_id,completed_section_ids,created_at,updated_at,finalized_at FROM expedientes WHERE id=$1', [id])
  const row = rows[0]
  if (!row) return null
  const values = { tipoPersona: row.tipo_persona === 'fisica' ? 'Física' : row.tipo_persona === 'moral' ? 'Moral' : '' }
  Object.assign(values, await readMapping(client, 'persona_contacto', 'expediente_id', id, contact))
  if (row.tipo_persona === 'fisica') Object.assign(values, await readMapping(client, 'personas_fisicas', 'expediente_id', id, physical))
  if (row.tipo_persona === 'moral') Object.assign(values, await readMapping(client, 'personas_morales', 'expediente_id', id, moral))
  if (row.modulo === 'pesca') {
    Object.assign(values, await readMapping(client, 'pesca_detalles', 'expediente_id', id, pesca))
    const { rows: months } = await client.query('SELECT mes FROM pesca_meses WHERE expediente_id=$1 ORDER BY mes', [id])
    values.mesesPesca = months.map(({ mes }) => MONTHS[mes - 1])
    const { rows: boats } = await client.query('SELECT * FROM embarcaciones WHERE expediente_id=$1 ORDER BY id LIMIT 1', [id])
    if (boats[0]) for (const [key, column] of Object.entries(boat)) values[key] = boats[0][column]
  } else {
    Object.assign(values, await readMapping(client, 'acuacultura_detalles', 'expediente_id', id, aqua))
    const { rows: upas } = await client.query('SELECT * FROM upas WHERE expediente_id=$1 ORDER BY id LIMIT 1', [id])
    if (upas[0]) {
      const u = upas[0]
      for (const [key, column] of Object.entries(upa)) values[key] = u[column]
      const { rows: permissions } = await client.query('SELECT autoridad,tiene_permiso,detalle FROM upa_permisos WHERE upa_id=$1', [u.id])
      const permissionKeys = { conagua: ['permisoConagua','permisoConaguaDetalle'], semarnat: ['permisoSemarnat','permisoSemarnatDetalle'], conapesca: ['permisoConapesca','permisoConapescaDetalle'], senasica: ['permisoSenasica','permisoSenasicaDetalle'] }
      for (const permission of permissions) { const keys = permissionKeys[permission.autoridad]; values[keys[0]] = permission.tiene_permiso; values[keys[1]] = permission.detalle }
      Object.assign(values, await readMapping(client, 'upa_infraestructura', 'upa_id', u.id, infra))
      for (const [table, column, key] of [['upa_metodos_cultivo','metodo','metodosCultivo'],['upa_aparatos_medicion','aparato','aparatosMedicion'],['upa_bitacoras','bitacora','bitacoras']]) {
        const { rows: selected } = await client.query(`SELECT ${column}${table === 'upa_metodos_cultivo' ? ',descripcion_otro' : ''} FROM ${table} WHERE upa_id=$1 ORDER BY ${column}`, [u.id])
        values[key] = selected.map((item) => item[column])
        if (table === 'upa_metodos_cultivo') values.metodoOtro = selected.find((item) => item[column] === 'Otro')?.descripcion_otro || ''
      }
      const { rows: products } = await client.query('SELECT * FROM upa_producciones WHERE upa_id=$1 ORDER BY created_at,id LIMIT 1', [u.id])
      if (products[0]) {
        for (const [key, column] of Object.entries(production)) values[key] = products[0][column]
        const { rows: presentations } = await client.query('SELECT presentacion,presentacion_otra FROM upa_presentaciones WHERE produccion_id=$1 ORDER BY presentacion', [products[0].id])
        values.presentacion = presentations[0]?.presentacion || ''
        values.presentacionOtra = presentations[0]?.presentacion_otra || ''
      }
    }
  }
  return { id: row.id, module: row.modulo, personType: row.tipo_persona, status: row.estado === 'borrador' ? 'draft' : 'finalizado', folio: row.folio, values, currentSectionId: row.current_section_id, completedSectionIds: row.completed_section_ids || [], createdAt: row.created_at, updatedAt: row.updated_at, finalizedAt: row.finalized_at }
}
function sectionState(body = {}) {
  const currentSectionId = body?.currentSectionId == null ? null : String(body.currentSectionId).slice(0, 80)
  const completedSectionIds = body?.completedSectionIds == null ? [] : body.completedSectionIds
  if (!Array.isArray(completedSectionIds) || completedSectionIds.some((value) => typeof value !== 'string' || value.length > 80)) fail(400, 'INVALID_SECTION_STATE', 'El avance del formulario no tiene un formato válido.')
  return { currentSectionId, completedSectionIds: [...new Set(completedSectionIds)] }
}
async function save(client, id, actorId, module, body) {
  const state = sectionState(body)
  const values = normalizeValues(body.values, module)
  const kind = toPersonType(values)
  await client.query('UPDATE expedientes SET tipo_persona=$1,current_section_id=$2,completed_section_ids=$3,updated_by=$4,updated_at=now() WHERE id=$5', [kind, state.currentSectionId, state.completedSectionIds, actorId, id])
  await writeForm(client, id, module, values)
  return readRecord(client, id)
}

export async function listRecords({ actorId, role, module, requestId, search = '', status = '', personType = '', page = 1, pageSize = 50 }) {
  if (!['administrador','capturista','personal_seder'].includes(role)) fail(403, 'FORBIDDEN', 'No tienes permiso para consultar expedientes.')
  if (module && !['pesca','acuacultura'].includes(module)) fail(400, 'INVALID_MODULE', 'El módulo indicado no es válido.')
  if (status && !['draft','finalizado'].includes(status)) fail(400, 'INVALID_STATUS', 'El estado indicado no es válido.')
  if (personType && !['fisica','moral'].includes(personType)) fail(400, 'INVALID_PERSON_TYPE', 'El tipo de persona indicado no es válido.')
  const requestedPage = positiveSafeInteger(page, 1)
  const safePageSize = Math.min(100, positiveSafeInteger(pageSize, 50))
  const params = []; const filters = []
  if (role === 'capturista') { params.push(actorId); filters.push(`e.owner_user_id=$${params.length}`) }
  if (role === 'personal_seder') filters.push("e.estado='finalizado'")
  if (module) { params.push(module); filters.push(`e.modulo=$${params.length}`) }
  if (status) { params.push(status === 'draft' ? 'borrador' : 'finalizado'); filters.push(`e.estado=$${params.length}`) }
  if (personType) { params.push(personType); filters.push(`e.tipo_persona=$${params.length}`) }
  const safeSearch = String(search).trim().slice(0, 120)
  if (safeSearch) { params.push(`%${safeSearch}%`); const index = params.length; filters.push(`(e.folio ILIKE $${index} OR concat_ws(' ',pf.nombres,pf.apellido_paterno,pf.apellido_materno) ILIKE $${index} OR pm.razon_social ILIKE $${index} OR pc.localidad ILIKE $${index} OR pc.municipio ILIKE $${index} OR u.localidad ILIKE $${index})`) }
  const from = `FROM expedientes e LEFT JOIN personas_fisicas pf ON pf.expediente_id=e.id LEFT JOIN personas_morales pm ON pm.expediente_id=e.id
     LEFT JOIN persona_contacto pc ON pc.expediente_id=e.id
     LEFT JOIN LATERAL (SELECT localidad FROM upas WHERE expediente_id=e.id ORDER BY id LIMIT 1) u ON true`
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const { rows: countRows } = await pool.query(`SELECT count(*)::int AS total ${from} ${where}`, params)
  const total = countRows[0].total
  const safePage = Math.min(requestedPage, Math.max(1, Math.ceil(total / safePageSize)))
  const pagedParams = [...params, safePageSize, (safePage - 1) * safePageSize]
  const { rows } = await pool.query(
    `SELECT e.id,e.modulo,e.tipo_persona,e.estado,e.folio,e.current_section_id,e.completed_section_ids,e.created_at,e.updated_at,e.finalized_at,
     COALESCE(NULLIF(trim(concat_ws(' ',pf.nombres,pf.apellido_paterno,pf.apellido_materno)),''),pf.nombres,pm.razon_social,'') AS person_name,
     COALESCE(u.localidad,pc.localidad,pc.municipio,'') AS localidad ${from} ${where} ORDER BY e.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    pagedParams,
  )
  await writeAudit({ actorUserId: actorId, action: 'record.list', targetType: 'record_collection', result: 'success', module: module || null, requestId, metadata: { resultCount: rows.length } })
  return { records: rows.map((row) => ({
    id: row.id,
    module: row.modulo,
    personType: row.tipo_persona,
    status: row.estado === 'borrador' ? 'draft' : 'finalizado',
    folio: row.folio,
    personName: row.person_name,
    localidad: row.localidad,
    currentSectionId: row.current_section_id,
    completedSectionIds: row.completed_section_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finalizedAt: row.finalized_at,
  })), pagination: { page: safePage, pageSize: safePageSize, total } }
}
export async function fetchRecord({ actorId, role, id, requestId }) {
  if (!['administrador','capturista','personal_seder'].includes(role)) fail(403, 'FORBIDDEN', 'No tienes permiso para consultar expedientes.')
  const { rows } = await pool.query('SELECT owner_user_id,estado,modulo FROM expedientes WHERE id=$1', [id])
  if (!rows[0] || (role === 'capturista' && rows[0].owner_user_id !== actorId) || (role === 'personal_seder' && rows[0].estado !== 'finalizado')) fail(404, 'RECORD_NOT_FOUND', 'No se encontró el expediente.')
  await writeAudit({ actorUserId: actorId, action: 'record.view', targetType: 'record', targetId: id, recordId: id, module: rows[0].modulo, requestId, metadata: {} })
  return { record: await readRecord(pool, id) }
}
export async function createRecord({ actorId, role, body, requestId }) {
  if (!['administrador','capturista'].includes(role)) fail(403, 'FORBIDDEN', 'No tienes permiso para crear expedientes.')
  rejectOwnerFields(body)
  const module = body?.module
  if (!['pesca','acuacultura'].includes(module)) fail(400, 'INVALID_MODULE', 'El módulo indicado no es válido.')
  const values = normalizeValues(body?.values, module); const state = sectionState(body); const id = randomUUID()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO expedientes (id,modulo,tipo_persona,owner_user_id,created_by,updated_by,current_section_id,completed_section_ids) VALUES ($1,$2,$3,$4,$4,$4,$5,$6)', [id,module,toPersonType(values),actorId,state.currentSectionId,state.completedSectionIds])
    await writeForm(client,id,module,values)
    const record = await readRecord(client, id)
    await writeAudit({ actorUserId: actorId, action: 'record.draft.create', targetType: 'record', targetId: id, recordId: id, module, requestId, metadata: { fieldCount: Object.keys(values).length }, client })
    await client.query('COMMIT')
    return { record }
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
async function mutate({ actorId, role, id, body, requestId, finalize = false }) {
  if (!['administrador','capturista'].includes(role)) fail(403,'FORBIDDEN','No tienes permiso para modificar expedientes.')
  rejectOwnerFields(body)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query('SELECT owner_user_id,modulo,estado FROM expedientes WHERE id=$1 FOR UPDATE',[id])
    const row = rows[0]
    if (!row || (role === 'capturista' && row.owner_user_id !== actorId)) fail(404,'RECORD_NOT_FOUND','No se encontró el expediente.')
    if (row.estado !== 'borrador') fail(403,'FINALIZED_RECORD_LOCKED','El expediente finalizado no puede modificarse mientras la política de reapertura no esté definida.')
    if (body?.module !== undefined && body.module !== row.modulo) fail(400,'MODULE_IMMUTABLE','El módulo del expediente no se puede cambiar.')
    await save(client,id,actorId,row.modulo,body)
    if (finalize) await client.query("UPDATE expedientes SET estado='finalizado',finalized_at=COALESCE(finalized_at,now()),updated_at=now(),updated_by=$2 WHERE id=$1",[id,actorId])
    const record = await readRecord(client,id)
    await writeAudit({ actorUserId: actorId, action: finalize ? 'record.finalize' : 'record.update', targetType: 'record', targetId: id, recordId: id, module: row.modulo, requestId, metadata: { fieldCount: Object.keys(body.values).length }, client })
    await client.query('COMMIT')
    return { record }
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}
export function updateRecord(options) { return mutate(options) }
export function finalizeRecord(options) { return mutate({ ...options, finalize: true }) }
