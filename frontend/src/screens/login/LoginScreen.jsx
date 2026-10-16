import { useState } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'
import { loginWithCredentials } from '../../services/authApi.js'

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c.3-3.5 2.8-5.6 6.5-5.6s6.2 2.1 6.5 5.6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7]">
      <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="m4 4 16 16" />}
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[19px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]">
      <path d="M7 3.75h7l4.25 4.3v12.2H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" />
      <path d="M14 4v4.5h4.25M8.5 12h7M8.5 15.5h7" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[19px] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
      <path d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function LoginScreen({ onAuthenticated }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)

    if (!username.trim() || !password) {
      setFeedback({ type: 'error', text: 'Ingresa tu usuario y contraseña para continuar.' })
      return
    }

    setIsSubmitting(true)
    try {
      const session = await loginWithCredentials({ username: username.trim(), password })
      onAuthenticated?.(session)
    } catch {
      setFeedback({
        type: 'error',
        text: 'No fue posible validar el acceso. Verifica tus datos o intenta más tarde.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-auto bg-[#f2f3f5] px-[4.3vw] py-10 font-sans text-[#25232b] [background:radial-gradient(ellipse_at_18%_48%,rgba(112,14,55,0.07),transparent_36%),#f2f3f5] max-[760px]:px-4 max-[760px]:py-[22px] max-[420px]:px-[10px] max-[420px]:py-3">
      <img className="absolute left-5 top-4 z-10 h-10 w-44 object-contain object-left sm:left-[4.3vw] sm:top-6 sm:h-12 sm:w-56" src={sederLogo} alt="Secretaría de Desarrollo Rural de Nayarit" />
      <section aria-label="Acceso a SIREPES" className="grid min-h-[580px] w-[min(100%,1120px)] grid-cols-[41.7%_58.3%] overflow-hidden rounded-[26px] border border-[#261b220e] bg-white shadow-[0_28px_70px_rgba(37,20,29,0.16),0_5px_16px_rgba(37,20,29,0.055)] max-[760px]:min-h-0 max-[760px]:w-[min(100%,540px)] max-[760px]:grid-cols-1 max-[760px]:rounded-[21px]">
        <aside className="relative flex min-w-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#641333_0%,#4b0925_52%,#260414_100%)] px-11 pb-[43px] pt-11 text-white max-[760px]:min-h-[275px] max-[760px]:px-[29px] max-[760px]:pb-6 max-[760px]:pt-7 max-[420px]:min-h-[250px] max-[420px]:px-[22px] max-[420px]:pb-5 max-[420px]:pt-6">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[5px] bg-[linear-gradient(90deg,#b99653,#e0bd70_55%,#a1723a)]" />
          <div className="relative z-10 mb-7 flex items-center gap-[14px] max-[760px]:mb-[18px] max-[420px]:gap-2.5">
            <span className="grid gap-0.5">
              <strong className="text-lg tracking-[.08em]">SIREPES</strong>
              <span className="text-xs text-white/75">Nayarit</span>
            </span>
            <span aria-hidden="true" className="grid size-[63px] shrink-0 place-items-center rounded-[19px] border-2 border-[#c6a04f] font-serif text-[39px] italic text-[#e3c776] max-[760px]:size-[55px] max-[420px]:size-12 max-[420px]:rounded-[15px] max-[420px]:text-[30px]">S</span>
          </div>

          <div className="relative z-10 flex items-center gap-[9px]">
            <span className="inline-flex min-h-[29px] items-center rounded-full border border-[#e1ad5730] bg-[#e1ad572b] px-3 text-xs font-extrabold tracking-[.035em] text-[#e7c46e] max-[420px]:min-h-[25px] max-[420px]:px-[9px] max-[420px]:text-[10px]">PORTAL INSTITUCIONAL</span>
            <span className="inline-flex min-h-[29px] items-center rounded-full border border-white/20 bg-white/15 px-3 text-xs font-extrabold tracking-[.035em] text-white max-[420px]:min-h-[25px] max-[420px]:px-[9px] max-[420px]:text-[10px]">v2.0.0</span>
          </div>

          <div className="relative z-10 mt-[18px] max-[760px]:mt-[14px]">
            <h1 className="mb-[7px] text-[28px] font-extrabold leading-[1.2] tracking-[.015em] text-white max-[760px]:text-[25px]">SIREPES</h1>
            <p className="m-0 text-[15px] font-extrabold uppercase leading-[1.45] tracking-[.025em] text-[#e8c46d] max-[760px]:text-[13px]">Sistema de Registro de Registro<br />de pesca</p>
          </div>

          <div className="relative z-10 mt-auto flex items-center gap-[11px] border-t border-white/15 pt-[34px] max-[760px]:pt-[15px]">
            <span className="flex text-[#e1bd6a]"><ShieldIcon /></span>
            <div className="grid gap-[7px] max-[760px]:gap-1">
              <strong className="text-[13px] tracking-[.045em] text-[#e8c46d] max-[760px]:text-[11px]">SECRETARÍA DE DESARROLLO RURAL</strong>
              <span className="text-xs text-white max-[760px]:text-[10px]">2026. Todos los derechos reservados.</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col px-[8.7%] pb-[42px] pt-[50px] max-[760px]:px-[29px] max-[760px]:pb-7 max-[760px]:pt-8 max-[420px]:px-[22px] max-[420px]:pb-6 max-[420px]:pt-[27px]">
          <header className="flex min-h-[116px] items-start justify-between gap-[15px] max-[760px]:min-h-[105px] max-[420px]:gap-2">
            <div className="pt-[3px]">
            
              <h2 className="mb-[6px] mt-2 text-[29px] font-extrabold leading-[1.1] tracking-[-.035em] text-[#172a43] max-[420px]:text-[26px]">Iniciar Sesión</h2>
              <p className="m-0 max-w-[400px] text-sm leading-[1.5] text-[#1e2c43] max-[420px]:max-w-[245px] max-[420px]:text-xs">Ingresa tus credenciales autorizadas de servidor público.</p>
            </div>
            <span aria-label="Información del sistema" className="-mr-[17px] -mt-[10px] grid size-10 shrink-0 place-items-center rounded-[15px] border border-[#e4eaf2] bg-[#f8fafc] text-[#8da2bd] shadow-[0_2px_5px_rgba(30,50,70,0.08)] max-[420px]:-mr-2">
              <DocumentIcon />
            </span>
          </header>

          <form className="mt-[7px] grid gap-5 max-[760px]:mt-0" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-[9px]">
              <label className="text-sm font-extrabold tracking-[.035em] text-[#697b95] max-[420px]:text-xs" htmlFor="username">USUARIO INSTITUCIONAL</label>
              <div className="flex min-h-[47px] items-center rounded-[14px] border border-[#dce4ef] bg-[#f8fafc] px-[14px] transition focus-within:border-[#9b5572] focus-within:shadow-[0_0_0_3px_rgba(105,14,52,0.09)]">
                <span className="flex shrink-0 text-[#8da2bd]"><UserIcon /></span>
                <input className="h-11 w-full min-w-0 border-0 bg-transparent px-3 text-sm text-[#303443] outline-none placeholder:text-[#91a0b7]" id="username" name="username" type="text" autoComplete="username" placeholder="Ej. admin" value={username} onChange={(event) => setUsername(event.target.value)} disabled={isSubmitting} />
              </div>
            </div>

            <div className="grid gap-[9px]">
              <label className="text-sm font-extrabold tracking-[.035em] text-[#697b95] max-[420px]:text-xs" htmlFor="password">CONTRASEÑA</label>
              <div className="flex min-h-[47px] items-center rounded-[14px] border border-[#dce4ef] bg-[#f8fafc] px-[14px] transition focus-within:border-[#9b5572] focus-within:shadow-[0_0_0_3px_rgba(105,14,52,0.09)]">
                <span className="flex shrink-0 text-[#8da2bd]"><LockIcon /></span>
                <input className="h-11 w-full min-w-0 border-0 bg-transparent px-3 text-sm text-[#303443] outline-none placeholder:text-[#91a0b7]" id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} />
                <button className="grid size-[30px] shrink-0 place-items-center border-0 bg-transparent text-[#8da2bd] hover:text-[#641034] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ae823a] disabled:cursor-wait" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} disabled={isSubmitting}>
                  <EyeIcon hidden={!showPassword} />
                </button>
              </div>
            </div>

            {feedback && (
              <p className={`-mb-[3px] -mt-[5px] text-xs leading-[1.4] ${feedback.type === 'error' ? 'text-[#a32b4c]' : 'text-[#28724e]'}`} role="status" aria-live="polite">
                {feedback.text}
              </p>
            )}

            <button className="mt-[7px] flex min-h-[51px] items-center justify-center gap-3 rounded-[13px] border-0 bg-sirepes-burgundy px-4 text-xs font-extrabold tracking-[.055em] text-white shadow-[0_5px_10px_rgba(86,10,44,0.18)] transition hover:-translate-y-px hover:shadow-[0_8px_16px_rgba(86,10,44,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ae823a] disabled:cursor-wait disabled:opacity-75" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'VALIDANDO…' : 'INGRESAR AL SISTEMA'}</span>
              {!isSubmitting && <span aria-hidden="true" className="text-xl font-normal leading-none text-[#e6c36e]">→</span>}
            </button>
          </form>

          <div className="mb-[18px] mt-[35px] h-px bg-[#edf0f4] max-[760px]:mt-[25px]" />
          <footer className="grid justify-items-center gap-0.5 text-center text-[#687b95]">
            <span className="mb-[5px] rounded-full border border-[#ead7b4] bg-[#fbf8f3] px-[11px] py-1 text-xs font-extrabold text-[#741c40]">SIREPES v2.0.0</span>
            <p className="m-0 text-sm leading-[1.35]">Secretaría de Desarrollo Rural</p>
            <p className="m-0 text-sm leading-[1.35]">Gobierno del Estado de Nayarit</p>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default LoginScreen
