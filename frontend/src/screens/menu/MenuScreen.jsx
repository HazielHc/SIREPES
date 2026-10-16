import { useState } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'

function FishIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-9 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
      <path d="M8 24c6-9 18-12 27-5l6-5v20l-6-5c-9 7-21 4-27-5Z" />
      <path d="M17 19c2 3 2 7 0 10M31 22h.1" />
    </svg>
  )
}

function WavesIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-9 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
      <path d="M7 18c5 0 5-5 10-5s5 5 10 5 5-5 10-5" />
      <path d="M7 27c5 0 5-5 10-5s5 5 10 5 5-5 10-5" />
      <path d="M7 36c5 0 5-5 10-5s5 5 10 5 5-5 10-5" />
    </svg>
  )
}

function RoleShieldIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]"><path d="M10 2.5 16 5v4.2c0 3.5-2.5 6.2-6 8.3-3.5-2.1-6-4.8-6-8.3V5l6-2.5Z" /><path d="m7.4 9.8 1.8 1.8 3.5-3.7" /></svg>
}

function MenuScreen({ onSelectModule, onLogout, onOpenUserManagement, role = 'administrador' }) {
  const [selectedModule, setSelectedModule] = useState(null)
  const modules = [
    {
      id: 'pesca',
      title: 'Pesca',
      description: 'Registros del sector pesquero estatal.',
      Icon: FishIcon,
    },
    {
      id: 'acuacultura',
      title: 'Acuacultura',
      description: 'Unidades de producción del sector acuícola.',
      Icon: WavesIcon,
    },
  ]

  return (
    <main className="flex min-h-dvh flex-col bg-menu-canvas font-sans text-menu-ink">
      <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-menu-divider bg-menu-surface px-5 py-3.5 shadow-[0_4px_18px_rgb(7_26_50_/_6%)] sm:min-h-[82px] sm:px-8 lg:px-[6vw]">
        <div className="flex min-w-0 items-center gap-4">
          <img className="h-10 w-36 object-contain object-left sm:h-12 sm:w-52" src={sederLogo} alt="Secretaría de Desarrollo Rural de Nayarit" />
          <span aria-hidden="true" className="hidden h-10 w-px bg-menu-divider sm:block" />
          <span className="grid size-[42px] place-items-center rounded-[11px] bg-menu-ink font-serif text-[25px] italic text-white" aria-hidden="true">S</span>
          <span className="grid gap-px">
            <strong className="text-lg tracking-[.09em]">SIREPES</strong>
            <span className="text-[13px] text-menu-muted">Gobierno del Estado de Nayarit</span>
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-full bg-menu-canvas px-3 py-2 text-sm font-semibold capitalize text-menu-primary sm:inline-flex">
            <RoleShieldIcon />{role}
          </span>
          {onOpenUserManagement && <button type="button" onClick={onOpenUserManagement} className="min-h-11 rounded-lg border border-menu-line bg-white px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Administrar usuarios</button>}
          {onLogout && <button type="button" onClick={onLogout} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Cerrar sesión</button>}
        </div>
      </header>

      <section className="my-auto w-[min(100%_-_40px,920px)] self-center py-[60px] text-center sm:py-[76px]" aria-labelledby="menu-heading">
        <p className="mb-3 text-[13px] font-bold tracking-[.14em] text-menu-primary">Sistema estatal de registro</p>
        <h1 id="menu-heading" className="m-0 text-[clamp(30px,4vw,42px)] font-bold leading-[1.15] tracking-[-.025em] text-menu-ink">¿Qué módulo deseas consultar?</h1>
        <p className="mt-3.5 text-base text-menu-muted sm:text-[17px]">Selecciona el área para abrir su registro.</p>

        <div className="mt-[30px] grid grid-cols-1 gap-3.5 text-left sm:mt-[42px] sm:grid-cols-2 sm:gap-5">
          {modules.map(({ id, title, description, Icon }) => (
            <button
              className="group flex min-h-[130px] w-full cursor-pointer items-center gap-[18px] rounded-[14px] border border-menu-line bg-menu-surface px-5 py-5 text-left text-menu-ink shadow-[0_5px_18px_rgb(16_43_78_/_5%)] aria-pressed:border-menu-primary aria-pressed:ring-2 aria-pressed:ring-menu-primary/20 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-menu-focus motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-menu-hover hover:shadow-[0_12px_26px_rgb(16_43_78_/_11%)] sm:min-h-[164px] sm:px-[23px] sm:py-[26px]"
              key={id}
              type="button"
              aria-pressed={selectedModule === id}
              onClick={() => {
                setSelectedModule(id)
                onSelectModule?.(id)
              }}
            >
              <span className="grid size-[58px] shrink-0 place-items-center rounded-[13px] bg-menu-soft text-menu-primary"><Icon /></span>
              <span className="grid min-w-0 flex-1 gap-[7px]">
                <strong className="text-[23px] leading-[1.2] text-menu-ink">{title}</strong>
                <span className="text-[15px] leading-[1.45] text-menu-muted">{description}</span>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[22px] shrink-0 fill-none stroke-menu-accent [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-menu-muted" role="status" aria-live="polite" aria-atomic="true">
          {selectedModule
            ? `Abriendo el registro de ${selectedModule === 'pesca' ? 'Pesca' : 'Acuacultura'}.`
            : 'Elige Pesca o Acuacultura para comenzar.'}
        </p>
      </section>

      <footer className="flex flex-col items-center justify-between gap-2.5 border-t border-menu-divider bg-menu-surface px-5 py-5 text-center text-[13px] text-menu-muted sm:flex-row sm:gap-4 sm:px-8 lg:px-[6vw]">
        <span>SIREPES · Registro Estatal de Pesca y Acuacultura</span>
        <span>Nayarit, México</span>
      </footer>
    </main>
  )
}

export default MenuScreen
