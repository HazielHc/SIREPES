import { useEffect, useMemo, useState } from 'react'
import LoginScreen from '../screens/login/LoginScreen.jsx'
import MenuScreen from '../screens/menu/MenuScreen.jsx'
import DashboardScreen from '../screens/dashboard/DashboardScreen.jsx'
import RegistrationScreen from '../screens/registration/RegistrationScreen.jsx'
import UserManagementScreen from '../screens/administracion-usuarios/UserManagementScreen.jsx'
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen.jsx'
import { changePassword, getCurrentUser, logoutFromApi } from '../services/authApi.js'
import { usersApi } from '../services/usersApi.js'
import { recordsApi } from '../services/recordsApi.js'

function getPersonName(values = {}) {
  if (values.tipoPersona === 'Moral') return values.razonSocial || 'Persona moral'
  return [values.nombres, values.apellidoPaterno, values.apellidoMaterno].filter(Boolean).join(' ') || 'Persona física'
}

function getLocality(values = {}) {
  return values.localidadUpa || values.localidad || values.municipioUpa || values.municipio || '—'
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const preview = import.meta.env.DEV ? params.get('preview') : null
  const previewModule = ['pesca', 'acuacultura'].includes(preview) ? preview : null
  const [screen, setScreen] = useState(previewModule ? 'dashboard' : preview === 'menu' ? 'menu' : 'login')
  const [activeModule, setActiveModule] = useState(previewModule)
  const [session, setSession] = useState(() => preview
    ? { role: params.get('role') || 'administrador', displayName: 'Administrador', isPreview: true }
    : null)
  const [authLoaded, setAuthLoaded] = useState(Boolean(preview))
  const [records, setRecords] = useState([])
  const [drafts, setDrafts] = useState([])
  const [activeRecord, setActiveRecord] = useState(null)
  const [recordReadOnly, setRecordReadOnly] = useState(false)
  const [recordsBusy, setRecordsBusy] = useState(false)
  const [recordsError, setRecordsError] = useState('')
  const [recordFilters, setRecordFilters] = useState({ search: '', status: '', personType: '' })
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPagination, setRecordsPagination] = useState({ page: 1, pageSize: 50, total: 0 })

  const role = session?.user?.role || session?.role || 'capturista'
  const moduleRecords = useMemo(() => records.filter((record) => record.module === activeModule), [records, activeModule])
  const moduleDrafts = useMemo(() => drafts.filter((draft) => draft.module === activeModule), [drafts, activeModule])

  useEffect(() => {
    if (preview) return
    let active = true
    getCurrentUser()
      .then((result) => {
        if (!active) return
        const user = result.user
        setSession({ user })
        setScreen(user.mustChangePassword ? 'change-password' : 'menu')
      })
      .catch(() => {
        if (!active) return
        setSession(null)
        setScreen('login')
      })
      .finally(() => { if (active) setAuthLoaded(true) })
    return () => { active = false }
  }, [preview])

  useEffect(() => {
    if (screen !== 'dashboard' || !activeModule || !session || session.isPreview) return
    let active = true
    setRecordsBusy(true)
    setRecordsError('')
    recordsApi.list(activeModule, { ...recordFilters, page: recordsPage })
      .then(({ records: loaded = [], pagination = { page: recordsPage, pageSize: 50, total: loaded.length } }) => {
        if (!active) return
        setRecords(loaded.filter((record) => record.status === 'finalizado'))
        setDrafts(loaded.filter((record) => record.status === 'draft'))
        setRecordsPagination(pagination)
      })
      .catch((error) => {
        if (active) {
          const message = error.message || 'No fue posible cargar los expedientes.'
          setRecordsError(error.status >= 500 && error.requestId ? `${message} Referencia: ${error.requestId}` : message)
        }
      })
      .finally(() => { if (active) setRecordsBusy(false) })
    return () => { active = false }
  }, [screen, activeModule, session, recordFilters, recordsPage])

  function openDashboard(module) {
    setActiveModule(module)
    setRecordFilters({ search: '', status: '', personType: '' })
    setRecordsPage(1)
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('dashboard')
  }

  function startNewRecord() {
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('registration')
  }

  async function openRecordDetail(record) {
    setRecordsBusy(true)
    setRecordsError('')
    try {
      const { record: detail } = await recordsApi.get(record.id)
      setActiveRecord({
        ...detail,
        personName: getPersonName(detail.values),
        localidad: getLocality(detail.values),
      })
      setRecordReadOnly(detail.status === 'finalizado')
      setScreen('registration')
    } catch (error) {
      const message = error.message || 'No fue posible abrir el expediente.'
      setRecordsError(error.status >= 500 && error.requestId ? `${message} Referencia: ${error.requestId}` : message)
    } finally {
      setRecordsBusy(false)
    }
  }

  function openDraft(draft) { void openRecordDetail(draft) }
  function openRecord(record) { void openRecordDetail(record) }

  async function saveDraft(payload) {
    const body = {
      module: activeModule,
      values: payload.values,
      currentSectionId: payload.currentSectionId,
      completedSectionIds: payload.completedSectionIds || [],
    }
    const result = payload.recordId
      ? await recordsApi.update(payload.recordId, body)
      : await recordsApi.create(body)
    const saved = {
      ...result.record,
      personName: getPersonName(result.record.values),
      localidad: getLocality(result.record.values),
    }
    if (saved.status === 'finalizado') {
      setDrafts((current) => current.filter((item) => item.id !== saved.id))
      setRecords((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved])
    } else {
      setDrafts((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved])
    }
    setActiveRecord(saved)
  }

  async function submitRecord(payload) {
    const body = {
      module: activeModule,
      values: payload.values,
      currentSectionId: payload.sectionIds?.at(-1) || activeRecord?.currentSectionId || null,
      completedSectionIds: payload.sectionIds || [],
    }
    const draftResult = payload.recordId ? null : await recordsApi.create(body)
    if (draftResult) {
      const draftRecord = {
        ...draftResult.record,
        personName: getPersonName(draftResult.record.values),
        localidad: getLocality(draftResult.record.values),
      }
      setActiveRecord(draftRecord)
      setDrafts((current) => [...current.filter((item) => item.id !== draftRecord.id), draftRecord])
    }
    const recordId = payload.recordId || draftResult.record.id
    const { record: savedRecord } = await recordsApi.finalize(recordId, body)
    const record = {
      ...savedRecord,
      personName: getPersonName(savedRecord.values),
      localidad: getLocality(savedRecord.values),
    }
    setRecords((current) => current.some((item) => item.id === record.id)
      ? current.map((item) => item.id === record.id ? record : item)
      : [...current, record])
    setDrafts((current) => current.filter((item) => item.id !== record.id))
    setActiveRecord(record)
  }

  function backToMenu() {
    setActiveModule(null)
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('menu')
  }

  function logout() {
    if (!session?.isPreview) void logoutFromApi().catch(() => {})
    setSession(null)
    setRecords([])
    setDrafts([])
    setActiveModule(null)
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('login')
  }

  if (!authLoaded) {
    return <main className="grid min-h-dvh place-items-center bg-menu-canvas text-menu-ink"><p role="status" className="rounded-xl border border-menu-line bg-white px-6 py-4 text-sm font-semibold shadow-sm">Verificando sesión…</p></main>
  }

  if (screen === 'change-password' && session) {
    return <ChangePasswordScreen currentUser={session.user} onSubmit={async (values) => {
      const result = await changePassword(values)
      setSession({ user: result.user })
      setScreen('menu')
    }} onLogout={logout} />
  }

  if (screen === 'user-management' && session?.user?.role === 'administrador') {
    return <UserManagementScreen currentUser={session.user} usersApi={usersApi} onBackToMenu={() => setScreen('menu')} onLogout={logout} />
  }

  if (screen === 'registration' && activeModule) {
    return <RegistrationScreen
      module={activeModule}
      role={role}
      record={activeRecord}
      readOnly={recordReadOnly}
      onExit={() => setScreen('dashboard')}
      onSaveDraft={saveDraft}
      onSubmit={submitRecord}
    />
  }

  if (screen === 'dashboard' && activeModule) {
    return <DashboardScreen
      module={activeModule}
      role={role}
      records={moduleRecords}
      drafts={moduleDrafts}
      recordsBusy={recordsBusy}
      recordsError={recordsError}
      recordFilters={recordFilters}
      recordsPagination={recordsPagination}
      onRecordFiltersChange={(next) => { setRecordFilters((current) => ({ ...current, ...next })); setRecordsPage(1) }}
      onRecordsPageChange={setRecordsPage}
      onNewRecord={startNewRecord}
      onOpenDraft={openDraft}
      onOpenRecord={openRecord}
      onBackToMenu={backToMenu}
      onLogout={logout}
    />
  }

  if (screen === 'menu') return <MenuScreen onSelectModule={openDashboard} onLogout={logout} role={role} onOpenUserManagement={role === 'administrador' && !session?.isPreview ? () => setScreen('user-management') : undefined} />

  return <LoginScreen onAuthenticated={(result) => {
    const user = result?.user || result
    setSession({ user })
    setScreen(user?.mustChangePassword ? 'change-password' : 'menu')
  }} />
}

export default App
