import { useCallback, useEffect, useMemo, useState } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'

const ROLES = [
  { value: 'capturista', label: 'Capturista' },
  { value: 'personal_seder', label: 'Personal de SEDER' },
  { value: 'invitado', label: 'Invitado' },
]

const ROLE_LABELS = {
  administrador: 'Administrador',
  capturista: 'Capturista',
  personal_seder: 'Personal de SEDER',
  invitado: 'Invitado',
}

const PAGE_SIZE = 10

function Icon({ name, className = 'size-5' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.55-2.6L20 12M4 12l2.85 5.6A7 7 0 0 0 18.4 15" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] ${className}`}>
      {paths[name]}
    </svg>
  )
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Sin perfil'
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function formatDate(value) {
  if (!value) return 'Sin acceso'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date)
}

function StatusPill({ status }) {
  const active = status === 'active'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'}`}>
      <span className={`size-1.5 rounded-full ${active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
      {active ? 'Activo' : 'Desactivado'}
    </span>
  )
}

function Modal({ title, description, onClose, children, footer, labelledBy }) {
  useEffect(() => {
    const handleKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgb(7_26_50_/_28%)]">
        <div className="flex items-start justify-between gap-5 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id={labelledBy} className="text-xl font-bold tracking-tight text-menu-ink">{title}</h2>
            {description && <p className="mt-1.5 text-sm leading-5 text-menu-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar ventana" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus"><Icon name="close" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </section>
    </div>
  )
}

function UserManagementScreen({
  currentUser,
  usersApi,
  onBackToMenu,
  onLogout,
}) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visibleRange = useMemo(() => ({
    start: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
    end: Math.min(page * PAGE_SIZE, total),
  }), [page, total])

  const loadUsers = useCallback(async () => {
    if (!usersApi?.listUsers) {
      setLoading(false)
      setError('La consulta de cuentas todavía no está conectada.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await usersApi.listUsers({ search, role: roleFilter, status: statusFilter, page, pageSize: PAGE_SIZE })
      const rows = Array.isArray(result) ? result : result?.users || result?.items || []
      setUsers(rows)
      setTotal(Number(result?.pagination?.total ?? result?.total ?? rows.length))
    } catch (requestError) {
      setUsers([])
      setTotal(0)
      setError(getErrorMessage(requestError, 'No fue posible cargar las cuentas. Intenta de nuevo.'))
    } finally {
      setLoading(false)
    }
  }, [usersApi, search, roleFilter, statusFilter, page])

  useEffect(() => { loadUsers() }, [loadUsers])

  const runAction = async (action, successMessage) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await action()
      setModal(null)
      setNotice(successMessage)
      await loadUsers()
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'No se pudo completar la acción.'))
    } finally {
      setSaving(false)
    }
  }

  const applySearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const openCreate = () => setModal({ type: 'create', fullName: '', email: '', role: 'capturista' })
  const openEdit = (user) => setModal({ type: 'edit', user, role: user.role, status: user.status })
  const openReset = (user) => setModal({ type: 'reset', user })

  const isAdmin = currentUser?.role === 'administrador'
  if (!isAdmin) {
    return (
      <main className="grid min-h-dvh place-items-center bg-menu-canvas px-5 py-10 font-sans text-menu-ink">
        <section className="max-w-md rounded-2xl border border-menu-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700"><Icon name="alert" className="size-6" /></span>
          <h1 className="mt-4 text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-sm leading-6 text-menu-muted">Solo el perfil Administrador puede gestionar las cuentas del sistema.</p>
          <button type="button" onClick={onBackToMenu} className="mt-6 min-h-11 rounded-lg bg-menu-primary px-4 text-sm font-semibold text-white hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Volver al menú</button>
        </section>
      </main>
    )
  }

  const roleOptions = (includeAdmin = false) => [
    ...(includeAdmin ? [{ value: 'administrador', label: 'Administrador' }] : []),
    ...ROLES,
  ]

  return (
    <main className="min-h-dvh bg-menu-canvas font-sans text-menu-ink">
      <header className="border-b border-menu-divider bg-white shadow-[0_4px_18px_rgb(7_26_50_/_5%)]">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img className="h-10 w-40 object-contain object-left sm:h-12 sm:w-52" src={sederLogo} alt="Secretaría de Desarrollo Rural de Nayarit" />
            <span aria-hidden="true" className="hidden h-10 w-px bg-menu-divider sm:block" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.13em] text-menu-accent">SIREPES</p>
              <h1 className="truncate text-base font-bold text-menu-ink sm:text-lg">Administración de usuarios</h1>
            </div>
          </div>
          <nav aria-label="Acciones de cuenta" className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-menu-soft px-3 py-2 text-sm font-semibold text-menu-primary sm:inline-flex"><Icon name="shield" className="size-4" />Administrador</span>
            <button type="button" onClick={onBackToMenu} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Menú principal</button>
            {onLogout && <button type="button" onClick={onLogout} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Cerrar sesión</button>}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-10">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-menu-accent">Control de acceso institucional</p>
            <h2 className="mt-1 text-[clamp(26px,3vw,36px)] font-bold leading-tight tracking-[-.025em] text-menu-ink">Cuentas del sistema</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-menu-muted">Administra quién puede ingresar a SIREPES y qué funciones tiene disponibles.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-menu-primary px-4 text-sm font-semibold text-white shadow-[0_5px_12px_rgb(16_43_78_/_18%)] hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">
            <Icon name="plus" className="size-[18px]" /> Crear usuario
          </button>
        </section>

        <section aria-label="Resumen de usuarios" className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-menu-line bg-white p-4 shadow-[0_3px_12px_rgb(16_43_78_/_4%)]">
            <span className="grid size-11 place-items-center rounded-xl bg-menu-soft text-menu-primary"><Icon name="users" /></span>
            <div><p className="text-xs font-semibold text-menu-muted">Cuentas encontradas</p><p className="mt-0.5 text-2xl font-bold tabular-nums text-menu-ink">{loading ? '—' : total}</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-menu-line bg-white p-4 shadow-[0_3px_12px_rgb(16_43_78_/_4%)]">
            <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><span className="size-2.5 rounded-full bg-emerald-600" /></span>
            <div><p className="text-xs font-semibold text-menu-muted">En esta página</p><p className="mt-0.5 text-2xl font-bold tabular-nums text-menu-ink">{loading ? '—' : users.length}</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-menu-line bg-white p-4 shadow-[0_3px_12px_rgb(16_43_78_/_4%)]">
            <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="shield" /></span>
            <div><p className="text-xs font-semibold text-menu-muted">Tu perfil</p><p className="mt-0.5 text-lg font-bold text-menu-ink">Administrador</p></div>
          </div>
        </section>

        {notice && <div role="status" className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"><Icon name="check" className="size-4" />{notice}<button type="button" onClick={() => setNotice('')} className="ml-auto rounded px-2 py-1 text-emerald-900 underline underline-offset-2">Cerrar</button></div>}
        {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"><Icon name="alert" className="mt-0.5 size-4 shrink-0" /><span>{error}</span><button type="button" onClick={() => setError('')} className="ml-auto rounded px-2 py-1 font-semibold underline underline-offset-2">Cerrar</button></div>}

        <section className="mt-6 overflow-hidden rounded-xl border border-menu-line bg-white shadow-[0_6px_24px_rgb(16_43_78_/_5%)]" aria-labelledby="accounts-heading">
          <div className="flex flex-col gap-4 border-b border-menu-divider p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 id="accounts-heading" className="text-base font-bold text-menu-ink">Directorio de cuentas</h3>
              <p className="mt-1 text-sm text-menu-muted">Busca por nombre, usuario o correo electrónico.</p>
            </div>
            <form onSubmit={applySearch} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto" role="search" aria-label="Buscar usuarios">
              <label className="relative min-w-0 flex-1 sm:min-w-[240px] lg:w-[290px]">
                <span className="sr-only">Buscar por nombre, usuario o correo</span>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar usuarios…" className="min-h-11 w-full rounded-lg border border-menu-line bg-white pl-10 pr-3 text-sm text-menu-ink outline-none placeholder:text-slate-400 focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20" />
              </label>
              <button type="submit" className="min-h-11 rounded-lg border border-menu-line bg-white px-4 text-sm font-semibold text-menu-primary hover:bg-menu-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Buscar</button>
            </form>
          </div>

          <div className="flex flex-col gap-3 border-b border-menu-divider bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <span className="text-xs font-bold text-menu-muted">Filtrar por</span>
            <label className="flex items-center gap-2 text-sm text-menu-muted">
              <span className="sr-only">Perfil</span>
              <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }} className="min-h-9 rounded-md border border-menu-line bg-white px-2.5 text-sm text-menu-ink outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">
                <option value="">Todos los perfiles</option>
                {roleOptions(true).map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-menu-muted">
              <span className="sr-only">Estado</span>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }} className="min-h-9 rounded-md border border-menu-line bg-white px-2.5 text-sm text-menu-ink outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">
                <option value="">Todos los estados</option><option value="active">Activo</option><option value="disabled">Desactivado</option>
              </select>
            </label>
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setRoleFilter(''); setStatusFilter(''); setPage(1) }} className="min-h-9 self-start rounded-md px-2.5 text-sm font-semibold text-menu-accent hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus sm:ml-auto">Limpiar filtros</button>
            <button type="button" onClick={loadUsers} disabled={loading} aria-label="Actualizar lista" className="grid size-9 place-items-center self-start rounded-md text-menu-primary hover:bg-menu-soft disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus"><Icon name="refresh" className={`size-[17px] ${loading ? 'animate-spin' : ''}`} /></button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-menu-muted">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Usuario</th>
                  <th scope="col" className="px-4 py-3.5">Perfil</th>
                  <th scope="col" className="px-4 py-3.5">Estado</th>
                  <th scope="col" className="px-4 py-3.5">Fecha de alta</th>
                  <th scope="col" className="px-4 py-3.5">Último acceso</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-menu-divider">
                {loading && <tr><td colSpan="6" className="px-5 py-14 text-center text-sm text-menu-muted"><span className="inline-flex items-center gap-2"><Icon name="refresh" className="size-4 animate-spin" />Cargando cuentas…</span></td></tr>}
                {!loading && users.length === 0 && <tr><td colSpan="6" className="px-5 py-14 text-center">
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-menu-soft text-menu-primary"><Icon name="users" /></span>
                  <p className="mt-3 text-sm font-semibold text-menu-ink">No hay cuentas para mostrar</p>
                  <p className="mt-1 text-sm text-menu-muted">Prueba con otros filtros o crea una cuenta nueva.</p>
                  <button type="button" onClick={openCreate} className="mt-4 text-sm font-bold text-menu-accent underline underline-offset-4">Crear usuario</button>
                </td></tr>}
                {!loading && users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-menu-soft text-sm font-bold text-menu-primary">{(user.fullName || user.full_name || user.username || '?').trim().charAt(0).toUpperCase()}</span>
                        <span className="min-w-0"><span className="block truncate text-sm font-bold text-menu-ink">{user.fullName || user.full_name || 'Nombre sin registrar'}</span><span className="mt-0.5 block truncate text-xs text-menu-muted">{user.username || '—'} · {user.email || 'Sin correo'}</span></span>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-menu-primary"><Icon name="shield" className="size-4 text-menu-accent" />{getRoleLabel(user.role)}</span></td>
                    <td className="px-4 py-4"><StatusPill status={user.status} /></td>
                    <td className="px-4 py-4 text-sm text-menu-muted">{formatDate(user.createdAt || user.created_at)}</td>
                    <td className="px-4 py-4 text-sm text-menu-muted">{formatDate(user.lastLoginAt || user.last_login_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(user)} className="min-h-9 rounded-md px-2.5 text-xs font-bold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Editar acceso</button>
                        <div className="group relative">
                          <button type="button" aria-label={`Más acciones para ${user.fullName || user.username}`} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus"><Icon name="more" /></button>
                          <div className="invisible absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-menu-line bg-white p-1 text-left opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                            <button type="button" onClick={() => openReset(user)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-menu-ink hover:bg-menu-canvas"><Icon name="refresh" className="size-4" />Restablecer acceso</button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-menu-divider px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-menu-muted">{total ? <>Mostrando <strong className="font-semibold text-menu-ink">{visibleRange.start}–{visibleRange.end}</strong> de <strong className="font-semibold text-menu-ink">{total}</strong> cuentas</> : 'Sin resultados'}</p>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="min-h-9 rounded-md border border-menu-line px-3 text-sm font-semibold text-menu-primary hover:bg-menu-canvas disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Anterior</button>
              <span aria-live="polite" className="min-w-20 text-center text-xs font-semibold text-menu-muted">Página {page} de {pageCount}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-menu-line px-3 text-sm font-semibold text-menu-primary hover:bg-menu-canvas disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Siguiente <Icon name="chevron" className="size-4" /></button>
            </div>
          </div>
        </section>
        <p className="mt-4 text-center text-xs text-menu-muted">Los cambios de perfil y estado se aplican al guardar y quedan registrados para auditoría.</p>
      </div>

      {modal?.type === 'create' && <Modal title="Crear cuenta" description="Se enviará un acceso temporal al correo indicado. La persona deberá crear una contraseña al ingresar por primera vez." onClose={() => !saving && setModal(null)} labelledBy="create-user-title" footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={saving} className="min-h-10 rounded-lg px-4 text-sm font-semibold text-menu-primary hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
        <button type="submit" form="create-user-form" disabled={saving} className="min-h-10 rounded-lg bg-menu-primary px-4 text-sm font-semibold text-white hover:bg-menu-ink disabled:opacity-60">{saving ? 'Creando…' : 'Crear cuenta'}</button>
      </>}>
        <form id="create-user-form" className="grid gap-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const fullName = String(form.get('fullName') || '').trim(); const email = String(form.get('email') || '').trim(); const role = String(form.get('role') || ''); void runAction(() => usersApi.createUser({ fullName, email, role }), 'Cuenta creada. Se inició el envío de las credenciales temporales.') }}>
          <label className="grid gap-1.5 text-sm font-semibold text-menu-ink">Nombre completo<input required name="fullName" autoFocus maxLength="160" value={modal.fullName} onChange={(event) => setModal({ ...modal, fullName: event.target.value })} placeholder="Nombre y apellidos" className="min-h-11 rounded-lg border border-menu-line px-3 font-normal outline-none placeholder:text-slate-400 focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-menu-ink">Correo electrónico<input required name="email" type="email" maxLength="254" value={modal.email} onChange={(event) => setModal({ ...modal, email: event.target.value })} placeholder="nombre@institucion.gob.mx" className="min-h-11 rounded-lg border border-menu-line px-3 font-normal outline-none placeholder:text-slate-400 focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-menu-ink">Perfil<select required name="role" value={modal.role} onChange={(event) => setModal({ ...modal, role: event.target.value })} className="min-h-11 rounded-lg border border-menu-line bg-white px-3 font-normal outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">{roleOptions().map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          <p className="flex items-start gap-2 rounded-lg bg-menu-canvas p-3 text-xs leading-5 text-menu-muted"><Icon name="mail" className="mt-0.5 size-4 shrink-0 text-menu-accent" />El nombre de usuario se generará automáticamente y se enviará junto con la contraseña temporal.</p>
        </form>
      </Modal>}

      {modal?.type === 'edit' && <Modal title="Actualizar acceso" description={modal.user.fullName || modal.user.full_name || modal.user.username} onClose={() => !saving && setModal(null)} labelledBy="edit-user-title" footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={saving} className="min-h-10 rounded-lg px-4 text-sm font-semibold text-menu-primary hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
        <button type="submit" form="edit-user-form" disabled={saving} className="min-h-10 rounded-lg bg-menu-primary px-4 text-sm font-semibold text-white hover:bg-menu-ink disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </>}>
        <form id="edit-user-form" className="grid gap-4" onSubmit={(event) => { event.preventDefault(); const payload = { role: modal.role, status: modal.status }; void runAction(() => usersApi.updateUser(modal.user.id, payload), 'Se actualizaron los permisos de la cuenta.') }}>
          <div className="rounded-lg bg-menu-canvas px-3.5 py-3 text-sm"><span className="block font-semibold text-menu-ink">{modal.user.username || 'Usuario'}</span><span className="mt-1 block text-menu-muted">{modal.user.email || 'Sin correo'}</span></div>
          <label className="grid gap-1.5 text-sm font-semibold text-menu-ink">Perfil<select value={modal.role} onChange={(event) => setModal({ ...modal, role: event.target.value })} className="min-h-11 rounded-lg border border-menu-line bg-white px-3 font-normal outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20">{roleOptions(true).map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-semibold text-menu-ink">Estado<select value={modal.status} onChange={(event) => setModal({ ...modal, status: event.target.value })} className="min-h-11 rounded-lg border border-menu-line bg-white px-3 font-normal outline-none focus:border-menu-focus focus:ring-2 focus:ring-menu-focus/20"><option value="active">Activo: puede ingresar</option><option value="disabled">Desactivado: acceso bloqueado</option></select></label>
          <p className="text-xs leading-5 text-menu-muted">Al guardar se aplicarán los permisos del nuevo perfil. Desactivar la cuenta impide nuevos accesos.</p>
        </form>
      </Modal>}

      {modal?.type === 'reset' && <Modal title="Restablecer acceso" description="Se emitirá una nueva contraseña temporal y se invalidarán las sesiones activas." onClose={() => !saving && setModal(null)} labelledBy="reset-user-title" footer={<>
        <button type="button" onClick={() => setModal(null)} disabled={saving} className="min-h-10 rounded-lg px-4 text-sm font-semibold text-menu-primary hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
        <button type="button" onClick={() => void runAction(() => usersApi.resetPassword(modal.user.id), 'Se solicitó el restablecimiento. La nueva contraseña temporal se enviará por correo.')} disabled={saving} className="min-h-10 rounded-lg bg-menu-primary px-4 text-sm font-semibold text-white hover:bg-menu-ink disabled:opacity-60">{saving ? 'Solicitando…' : 'Restablecer contraseña'}</button>
      </>}>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-amber-700"><Icon name="alert" /></span><div><p className="text-sm font-bold">{modal.user.fullName || modal.user.full_name || modal.user.username}</p><p className="mt-1 text-sm leading-5">La persona tendrá que cambiar esta contraseña en su siguiente inicio de sesión.</p></div></div>
      </Modal>}
    </main>
  )
}

export default UserManagementScreen

/**
 * Integración esperada:
 * <UserManagementScreen currentUser={session.user} usersApi={usersApi}
 *   onBackToMenu={() => setScreen('menu')} onLogout={logout} />
 *
 * usersApi.listUsers({ search, role, status, page, pageSize }) debe devolver
 * { users: [], pagination: { total } } (también se admite { items, total } o
 * un arreglo). createUser({ fullName, email, role }), updateUser(id, { role,
 * status }) y resetPassword(id) deben rechazar con Error si falla la API.
 * Los usuarios retornados exponen id, username, fullName, email, role,
 * status, createdAt y lastLoginAt; se admiten las claves snake_case de DB.
 */
