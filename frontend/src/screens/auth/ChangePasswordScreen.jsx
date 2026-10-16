import { useState } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'

function ChangePasswordScreen({ currentUser, onSubmit, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) return setError('La confirmación no coincide con la nueva contraseña.')
    if (newPassword.length < 8 || newPassword.length > 15) return setError('Usa una contraseña de 8 a 15 caracteres.')
    setSaving(true)
    try { await onSubmit({ currentPassword, newPassword }) }
    catch (requestError) { setError(requestError.message || 'No fue posible cambiar la contraseña.') }
    finally { setSaving(false) }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-menu-canvas px-4 py-8 text-menu-ink">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-menu-line bg-white shadow-[0_22px_70px_rgb(7_26_50_/_14%)]">
        <header className="flex items-center justify-between border-b border-menu-line px-6 py-5">
          <img className="h-10 w-48 object-contain object-left" src={sederLogo} alt="Secretaría de Desarrollo Rural de Nayarit" />
          <button type="button" onClick={onLogout} className="text-sm font-semibold text-menu-primary hover:underline">Cerrar sesión</button>
        </header>
        <form className="grid gap-5 p-6 sm:p-8" onSubmit={submit}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-menu-primary">Primer acceso</p>
            <h1 className="mt-2 text-2xl font-bold">Crea tu contraseña personal</h1>
            <p className="mt-2 text-sm leading-6 text-menu-muted">Hola {currentUser?.fullName}. Para proteger tu cuenta, cambia la contraseña temporal antes de entrar al sistema.</p>
          </div>
          <label className="grid gap-2 text-sm font-semibold">Contraseña temporal actual<input autoComplete="current-password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="min-h-11 rounded-lg border border-menu-line px-3 font-normal outline-none focus:border-menu-primary focus:ring-2 focus:ring-menu-primary/15" /></label>
          <label className="grid gap-2 text-sm font-semibold">Nueva contraseña (8 a 15 caracteres)<input autoComplete="new-password" type="password" required minLength={8} maxLength={15} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="min-h-11 rounded-lg border border-menu-line px-3 font-normal outline-none focus:border-menu-primary focus:ring-2 focus:ring-menu-primary/15" /></label>
          <label className="grid gap-2 text-sm font-semibold">Confirma la nueva contraseña<input autoComplete="new-password" type="password" required minLength={8} maxLength={15} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="min-h-11 rounded-lg border border-menu-line px-3 font-normal outline-none focus:border-menu-primary focus:ring-2 focus:ring-menu-primary/15" /></label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          <button disabled={saving} className="min-h-12 rounded-lg bg-menu-primary px-4 font-bold text-white hover:bg-menu-ink disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar contraseña y continuar'}</button>
        </form>
      </section>
    </main>
  )
}

export default ChangePasswordScreen
