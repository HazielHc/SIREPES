import { useEffect, useMemo, useState } from 'react'
import LoginScreen from '../screens/login/LoginScreen.jsx'
import MenuScreen from '../screens/menu/MenuScreen.jsx'
import DashboardScreen from '../screens/dashboard/DashboardScreen.jsx'
import RegistrationScreen from '../screens/registration/RegistrationScreen.jsx'
import UserManagementScreen from '../screens/administracion-usuarios/UserManagementScreen.jsx'
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen.jsx'
import { changePassword, getCurrentUser, logoutFromApi } from '../services/authApi.js'
import { usersApi } from '../services/usersApi.js'

function getPersonName(values = {}) {
  if (values.tipoPersona === 'Moral') return values.razonSocial || 'Persona moral'
  return [values.nombres, values.apellidoPaterno, values.apellidoMaterno].filter(Boolean).join(' ') || 'Persona física'
}

function getLocality(values = {}) {
  return values.localidadUpa || values.localidad || values.municipioUpa || values.municipio || '—'
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
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

  function openDashboard(module) {
    setActiveModule(module)
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('dashboard')
  }

  function startNewRecord() {
    setActiveRecord(null)
    setRecordReadOnly(false)
    setScreen('registration')
  }

  function openDraft(draft) {
    setActiveRecord(draft)
    setRecordReadOnly(false)
    setScreen('registration')
  }

  function openRecord(record) {
    setActiveRecord(record)
    setRecordReadOnly(!['admin', 'administrator', 'administrador'].includes(String(role).toLocaleLowerCase('es')))
    setScreen('registration')
  }

  function saveDraft(payload) {
    const previous = payload.recordId ? drafts.find((draft) => draft.id === payload.recordId) : null
    const updatedAt = new Date().toISOString()
    const draft = {
      ...(previous || activeRecord || {}),
      id: payload.recordId || makeId(`${activeModule}-draft`),
      module: activeModule,
      status: 'draft',
      folio: previous?.folio || activeRecord?.folio || `BOR-${activeModule === 'pesca' ? 'PES' : 'ACU'}-${Date.now().toString().slice(-6)}`,
      personName: getPersonName(payload.values),
      localidad: getLocality(payload.values),
      values: payload.values,
      currentSectionId: payload.currentSectionId,
      completedSectionIds: payload.completedSectionIds || [],
      updatedAt,
    }

    const editingFinalRecord = records.some((record) => record.id === payload.recordId)
    if (editingFinalRecord) {
      setRecords((current) => current.map((record) => record.id === draft.id ? { ...draft, status: 'finalizado' } : record))
      setActiveRecord({ ...draft, status: 'finalizado' })
    } else {
      setDrafts((current) => current.some((item) => item.id === draft.id)
        ? current.map((item) => item.id === draft.id ? draft : item)
        : [...current, draft])
      setActiveRecord(draft)
    }
  }

  function submitRecord(payload) {
    const updatedAt = new Date().toISOString()
    const previousRecord = records.find((record) => record.id === payload.recordId)
    const draft = drafts.find((item) => item.id === payload.recordId)
    const record = {
      ...(previousRecord || draft || activeRecord || {}),
      id: payload.recordId || makeId(`${activeModule}-record`),
      module: activeModule,
      status: 'finalizado',
      folio: previousRecord?.folio || draft?.folio || activeRecord?.folio || `${activeModule === 'pesca' ? 'PES' : 'ACU'}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      personName: getPersonName(payload.values),
      localidad: getLocality(payload.values),
      values: payload.values,
      currentSectionId: payload.sectionIds?.at(-1),
      completedSectionIds: payload.sectionIds || [],
      updatedAt,
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
      isPreview={Boolean(session?.isPreview)}
      records={moduleRecords}
      drafts={moduleDrafts}
      onNewRecord={startNewRecord}
      onOpenDraft={openDraft}
      onOpenRecord={openRecord}
      onDeleteRecord={(record) => setRecords((current) => current.filter((item) => item.id !== record.id))}
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
