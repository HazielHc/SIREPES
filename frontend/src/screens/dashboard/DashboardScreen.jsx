import { useMemo } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'

function Icon({ name, className = 'size-5' }) {
  const paths = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    document: <><path d="M7 3.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 4v4h4M8.5 13h7M8.5 16.5h7" /></>,
    draft: <><path d="M5 4.5h14M5 9h14M5 13.5h8" /><path d="M17 15.5v5m-2.5-2.5h5" /><path d="M4 2.5h16a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" /></>,
    back: <><path d="M19 12H5m6 7-7-7 7-7" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.4-3.5 2.8-5.5 7-5.5s6.6 2 7 5.5" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]`}>{paths[name]}</svg>
}

function readValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function getFolio(record) {
  return readValue(record, ['folio', 'numeroFolio', 'numeroRegistro', 'registryNumber', 'code', 'id'])
}

function getHolder(record) {
  return readValue(record, ['personName', 'razonSocial']) || '—'
}

function getLocality(record) {
  return readValue(record, ['localidad', 'municipio', 'locality', 'municipality']) || '—'
}

function getStatus(record) {
  const raw = readValue(record, ['estatus', 'estado', 'status', 'state'])
  if (!raw) return ''
  const normalized = String(raw).toLocaleLowerCase('es')
  const known = {
    draft: 'Borrador', borrador: 'Borrador', pending: 'Pendiente', pendiente: 'Pendiente',
    active: 'Activo', activo: 'Activo', complete: 'Completado', completed: 'Completado',
    completado: 'Completado', finalized: 'Finalizado', finalizado: 'Finalizado',
  }
  return known[normalized] || String(raw)
}

function getUpdatedAt(record) {
  return readValue(record, ['fechaActualizacion', 'updatedAt', 'updated_at', 'fechaRegistro', 'createdAt', 'created_at'])
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
}

function roleLabel(role) {
  const normalized = String(role ?? '').toLocaleLowerCase('es')
  if (['admin', 'administrador', 'administrator'].includes(normalized)) return 'Administrador'
  if (['guest', 'invitado'].includes(normalized)) return 'Invitado'
  if (['capturer', 'capturista'].includes(normalized)) return 'Capturista'
  return role || 'Usuario'
}

function StatusPill({ status }) {
  if (!status) return <span className="text-sm text-menu-muted">—</span>
  const normalized = status.toLocaleLowerCase('es')
  const color = ['completado', 'finalizado'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : ['pendiente', 'borrador'].includes(normalized)
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-menu-line bg-menu-canvas text-menu-muted'
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${color}`}>{status}</span>
}

function DashboardScreen({
  module = 'pesca',
  role,
  records = [],
  drafts = [],
  recordsBusy = false,
  recordsError = '',
  recordFilters = { search: '', status: '', personType: '' },
  recordsPagination = { page: 1, pageSize: 50, total: 0 },
  onRecordFiltersChange,
  onRecordsPageChange,
  onNewRecord,
  onOpenDraft,
  onOpenRecord,
  onBackToMenu,
  onLogout,
}) {
  const searchTerm = recordFilters.search || ''
  const selectedStatus = recordFilters.status || ''
  const selectedPersonType = recordFilters.personType || ''
  const isAcuacultura = String(module).toLocaleLowerCase('es').includes('acuac')
  const moduleLabel = isAcuacultura ? 'Acuacultura' : 'Pesca'
  const moduleSection = isAcuacultura ? 'Unidades acuícolas' : 'Unidades pesqueras'
  const safeRecords = Array.isArray(records) ? records : []
  const safeDrafts = Array.isArray(drafts) ? drafts : []
  const isGuest = ['guest', 'invitado'].includes(String(role ?? '').toLocaleLowerCase('es'))
  const isAdmin = ['admin', 'administrador', 'administrator'].includes(String(role ?? '').toLocaleLowerCase('es'))
  const isCapturer = ['capturer', 'capturista'].includes(String(role ?? '').toLocaleLowerCase('es'))
  const canCreateRecords = isAdmin || isCapturer
  const roleIconName = isAdmin ? 'shield' : 'user'
  const totalPages = Math.max(1, Math.ceil(recordsPagination.total / recordsPagination.pageSize))
  const pageStart = recordsPagination.total === 0 ? 0 : (recordsPagination.page - 1) * recordsPagination.pageSize + 1
  const pageEnd = Math.min(recordsPagination.page * recordsPagination.pageSize, recordsPagination.total)
  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('es')
    return safeRecords.filter((record) => {
      const matchesSearch = !query || [getFolio(record), getHolder(record), getLocality(record), getStatus(record)]
        .some((value) => String(value).toLocaleLowerCase('es').includes(query))
      const matchesStatus = !selectedStatus || record.status === selectedStatus
      const matchesPersonType = !selectedPersonType || record.personType === selectedPersonType
      return matchesSearch && matchesStatus && matchesPersonType
    })
  }, [safeRecords, searchTerm, selectedStatus, selectedPersonType])

  function handleOpenRecord(record) {
    onOpenRecord?.(record)
  }

  function handleOpenDraft(draft) {
    onOpenDraft?.(draft)
  }

  return (
    <div className="min-h-dvh bg-menu-canvas font-sans text-sirepes-ink">
      <header className="border-b border-menu-divider bg-white shadow-[0_5px_22px_rgb(7_26_50_/_8%)]">
        <div className="mx-auto flex min-h-[82px] max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <img src={sederLogo} alt="Secretaría de Desarrollo Rural del Gobierno de Nayarit" className="h-auto w-[156px] max-w-[40vw] object-contain object-left sm:w-[205px]" />
            <span className="hidden h-10 w-px bg-menu-divider sm:block" aria-hidden="true" />
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold tracking-wide text-menu-ink">SIREPES</p>
              <p className="m-0 truncate text-xs text-menu-muted">Sistema de Registro de Pesca y Acuacultura</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-menu-canvas px-3 text-sm font-semibold text-menu-primary"><Icon name={roleIconName} className="size-4" />{roleLabel(role)}</span>
            {onBackToMenu && <button type="button" onClick={onBackToMenu} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-menu-focus">Módulos</button>}
            {onLogout && <button type="button" onClick={onLogout} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-menu-focus">Cerrar sesión</button>}
          </div>
        </div>
        <nav aria-label="Navegación del módulo" className="bg-menu-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_10%)]">
          <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto px-4 sm:px-7 lg:px-10">
            <a href="#centro-control" aria-current="page" className="flex min-h-12 shrink-0 items-center gap-2 border-b-2 border-sky-300 px-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white"><Icon name="grid" />Centro de control</a>
            <a href="#registros" className="flex min-h-12 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white"><Icon name="document" />{moduleSection}</a>
            <a href="#borradores" className="flex min-h-12 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white"><Icon name="draft" />Borradores{safeDrafts.length > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{safeDrafts.length}</span>}</a>
          </div>
        </nav>
      </header>

        <main id="centro-control" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
          {recordsError && <p className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm leading-5 text-red-900" role="alert">{recordsError}</p>}
          {recordsBusy && <p className="mb-5 text-sm text-menu-muted" role="status">Cargando registros guardados…</p>}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-sm font-semibold text-menu-primary">Módulo de {moduleLabel}</p>
              <h1 className="m-0 text-2xl font-bold leading-tight tracking-tight text-sirepes-ink sm:text-3xl">Centro de control</h1>
              <p className="mb-0 mt-2 max-w-2xl text-base leading-6 text-menu-muted">Administra los registros y borradores disponibles para este módulo.</p>
            </div>
            {canCreateRecords && onNewRecord && <button type="button" onClick={onNewRecord} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-menu-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgb(7_26_50_/_18%)] transition-colors hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus sm:w-auto"><Icon name="plus" />Nuevo registro</button>}
          </div>

          <section aria-label="Resumen del módulo" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <article className="rounded-xl border border-menu-line bg-menu-surface p-4 shadow-[0_4px_16px_rgb(7_26_50_/_5%)] sm:p-5">
              <p className="m-0 text-sm font-medium text-menu-muted">Coincidencias</p>
              <p className="mb-0 mt-2 text-3xl font-bold tabular-nums text-menu-ink">{recordsPagination.total}</p>
            </article>
            <article className="rounded-xl border border-menu-line bg-menu-surface p-4 shadow-[0_4px_16px_rgb(7_26_50_/_5%)] sm:p-5">
              <p className="m-0 text-sm font-medium text-menu-muted">Borradores en esta página</p>
              <p className="mb-0 mt-2 text-3xl font-bold tabular-nums text-sirepes-ink">{safeDrafts.length}</p>
            </article>
            <article className="rounded-xl border border-menu-line bg-menu-surface p-4 shadow-[0_4px_16px_rgb(7_26_50_/_5%)] sm:p-5">
              <p className="m-0 text-sm font-medium text-menu-muted">Finalizados en esta página</p>
              <p className="mb-0 mt-2 text-3xl font-bold tabular-nums text-emerald-700">{safeRecords.filter((record) => ['completado', 'finalizado'].includes(getStatus(record).toLocaleLowerCase('es'))).length}</p>
            </article>
          </section>

          <section id="registros" aria-labelledby="records-title" className="mb-6 overflow-hidden rounded-xl border border-menu-line bg-menu-surface">
            <div className="flex flex-col gap-4 border-b border-menu-divider px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div>
                <h2 id="records-title" className="m-0 text-lg font-bold text-sirepes-ink">{moduleSection}</h2>
                <p className="mb-0 mt-1 text-sm text-menu-muted">Consulta y filtra los registros del módulo.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_190px] lg:w-[min(100%,510px)]">
                <label className="relative block">
                  <span className="sr-only">Buscar por folio, nombre o localidad</span>
                  <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-menu-muted" />
                  <input type="search" value={searchTerm} onChange={(event) => onRecordFiltersChange?.({ search: event.target.value })} placeholder="Buscar folio, nombre o localidad" className="min-h-11 w-full rounded-lg border border-menu-line bg-menu-surface pl-10 pr-3 text-base text-sirepes-ink outline-none placeholder:text-slate-400 focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20" />
                </label>
                <label className="relative block">
                  <span className="sr-only">Filtrar por estatus</span>
                  <Icon name="filter" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-menu-muted" />
                  <select value={selectedStatus} onChange={(event) => onRecordFiltersChange?.({ status: event.target.value })} className="min-h-11 w-full appearance-none rounded-lg border border-menu-line bg-menu-surface pl-10 pr-3 text-base text-sirepes-ink outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">
                    <option value="">Todos los estatus</option>
                    <option value="draft">Borrador</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </label>
                <label className="relative block">
                  <span className="sr-only">Filtrar por tipo de persona</span>
                  <select value={selectedPersonType} onChange={(event) => onRecordFiltersChange?.({ personType: event.target.value })} className="min-h-11 w-full appearance-none rounded-lg border border-menu-line bg-menu-surface px-3 text-base text-sirepes-ink outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">
                    <option value="">Todos los tipos</option>
                    <option value="fisica">Persona física</option>
                    <option value="moral">Persona moral</option>
                  </select>
                </label>
              </div>
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">{filteredRecords.length} registros visibles.</p>
            {filteredRecords.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
                <div className="max-w-md">
                  <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-menu-soft text-menu-primary"><Icon name={searchTerm || selectedStatus ? 'search' : 'document'} className="size-6" /></span>
                  <h3 className="m-0 text-base font-bold text-sirepes-ink">{safeRecords.length === 0 ? 'Aún no hay registros' : 'No se encontraron resultados'}</h3>
                  <p className="mb-0 mt-2 text-sm leading-5 text-menu-muted">{safeRecords.length === 0 ? 'Cuando existan registros de este módulo, aparecerán aquí.' : 'Prueba con otro folio, localidad o estatus.'}</p>
                  {recordsPagination.total > 0 && <button type="button" onClick={() => onRecordFiltersChange?.({ search: '', status: '', personType: '' })} className="mt-4 min-h-10 rounded-lg px-3 text-sm font-semibold text-menu-primary underline underline-offset-4 hover:text-sirepes-burgundy focus-visible:outline-2 focus-visible:outline-menu-focus">Limpiar filtros</button>}
                  {safeRecords.length === 0 && canCreateRecords && onNewRecord && <button type="button" onClick={onNewRecord} className="mt-4 min-h-11 rounded-lg bg-menu-primary px-4 text-sm font-bold text-white hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Crear registro</button>}
                </div>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead className="bg-menu-canvas text-xs font-bold text-menu-muted">
                      <tr><th scope="col" className="px-6 py-3.5">Folio</th><th scope="col" className="px-6 py-3.5">Titular/Unidad</th><th scope="col" className="px-6 py-3.5">Localidad</th><th scope="col" className="px-6 py-3.5">Estatus</th><th scope="col" className="px-6 py-3.5">Actualización</th><th scope="col" className="px-6 py-3.5"><span className="sr-only">Acciones</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-menu-divider">
                      {filteredRecords.map((record, index) => {
                        const folio = getFolio(record)
                        return <tr key={String(folio || index)} className="transition-colors hover:bg-menu-canvas/70">
                          <th scope="row" className="px-6 py-4 text-sm font-semibold text-sirepes-ink">{folio || '—'}</th>
                          <td className="max-w-64 px-6 py-4 text-sm text-menu-muted"><span className="block truncate" title={String(getHolder(record))}>{getHolder(record)}</span></td>
                          <td className="px-6 py-4 text-sm text-menu-muted">{getLocality(record)}</td>
                          <td className="px-6 py-4"><StatusPill status={getStatus(record)} /></td>
                          <td className="px-6 py-4 text-sm text-menu-muted">{formatDate(getUpdatedAt(record))}</td>
                          <td className="px-6 py-4"><button type="button" onClick={() => handleOpenRecord(record)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-menu-focus">Abrir</button></td>
                        </tr>
                      })}
                    </tbody>
                  </table>
                </div>
                <ul className="m-0 grid list-none divide-y divide-menu-divider p-0 md:hidden">
                  {filteredRecords.map((record, index) => {
                    const folio = getFolio(record)
                    return <li key={String(folio || index)} className="flex min-w-0 items-center gap-2 px-3 py-2">
                      <button type="button" onClick={() => handleOpenRecord(record)} className="flex min-h-20 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-1 py-2 text-left hover:bg-menu-canvas focus-visible:outline-2 focus-visible:outline-menu-focus">
                        <span className="grid min-w-0 gap-1.5"><strong className="truncate text-sm text-sirepes-ink">{folio || 'Registro'}</strong><span className="truncate text-sm text-menu-muted">{getHolder(record)}</span><span className="truncate text-xs text-menu-muted">{getLocality(record)} · {formatDate(getUpdatedAt(record))}</span></span>
                        <StatusPill status={getStatus(record)} />
                      </button>
                    </li>
                  })}
                </ul>
              </>
            )}
          </section>

          <nav aria-label="Paginación de expedientes" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-menu-line bg-menu-surface px-4 py-3">
            <p className="m-0 text-sm text-menu-muted">Mostrando {pageStart}–{pageEnd} de {recordsPagination.total} expedientes</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onRecordsPageChange?.(recordsPagination.page - 1)} disabled={recordsPagination.page <= 1 || recordsBusy} className="min-h-10 rounded-lg border border-menu-line px-3 text-sm font-semibold text-menu-primary disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
              <span className="min-w-24 text-center text-sm text-menu-muted">Página {recordsPagination.page} de {totalPages}</span>
              <button type="button" onClick={() => onRecordsPageChange?.(recordsPagination.page + 1)} disabled={recordsPagination.page >= totalPages || recordsBusy} className="min-h-10 rounded-lg border border-menu-line px-3 text-sm font-semibold text-menu-primary disabled:cursor-not-allowed disabled:opacity-50">Siguiente</button>
            </div>
          </nav>

          <section id="borradores" aria-labelledby="drafts-title" className="overflow-hidden rounded-xl border border-menu-line bg-menu-surface">
            <div className="border-b border-menu-divider px-4 py-4 sm:px-6 sm:py-5">
              <h2 id="drafts-title" className="m-0 text-lg font-bold text-sirepes-ink">Borradores</h2>
              <p className="mb-0 mt-1 text-sm text-menu-muted">Capturas parciales que puedes retomar.</p>
            </div>
            {safeDrafts.length === 0 ? (
              <p className="m-0 px-5 py-7 text-sm text-menu-muted">No hay borradores disponibles.</p>
            ) : (
              <ul className="m-0 divide-y divide-menu-divider p-0">
                {safeDrafts.map((draft, index) => {
                  const folio = getFolio(draft)
                  const label = folio || 'Borrador sin folio'
                  return <li key={String(folio || draft.id || index)}>
                    <button type="button" onClick={() => handleOpenDraft(draft)} className="flex min-h-[68px] w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-menu-canvas focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-menu-focus sm:px-6">
                      <span className="min-w-0"><strong className="block truncate text-sm text-sirepes-ink">{label}</strong><span className="mt-1 block text-xs text-menu-muted">{formatDate(getUpdatedAt(draft))}</span></span>
                      <StatusPill status={getStatus(draft) || 'Borrador'} />
                    </button>
                  </li>
                })}
              </ul>
            )}
          </section>
        </main>
    </div>
  )
}

export default DashboardScreen
