import { useEffect, useMemo, useRef, useState } from 'react'
import sederLogo from '../../assets/seder-nayarit-recortado.png'

const inputBase = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-sirepes-ink outline-none transition placeholder:text-slate-400 focus:border-sirepes-ink focus:ring-2 focus:ring-sirepes-ink/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600'

function normalizeRole(role) {
  const value = String(role ?? 'capturista').trim().toLocaleLowerCase('es')
  if (['invitado', 'guest'].includes(value)) return 'guest'
  if (['administrador', 'admin', 'administrator'].includes(value)) return 'admin'
  return 'capturer'
}

function fieldIsVisible(field, values) {
  if (!field.visibleWhen) return true
  const actual = values[field.visibleWhen.field]
  return Array.isArray(actual) ? actual.includes(field.visibleWhen.value) : actual === field.visibleWhen.value
}

function isRequired(field) {
  return Boolean(field.required) || field.validation === 'required' || Boolean(field.validation?.required)
}

function plausibleDateSegment(value) {
  const month = Number(value.slice(2, 4))
  const day = Number(value.slice(4, 6))
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

function getFieldError(field, value) {
  const rules = typeof field.validation === 'object' && field.validation ? field.validation : {}
  if (isRequired(field) && (field.type === 'checkbox' ? value !== true : field.type === 'checkbox-group' ? !Array.isArray(value) || value.length === 0 : value == null || String(value).trim() === '')) {
    return rules.message || 'Este campo es obligatorio.'
  }
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return ''
  const text = String(value).trim().toLocaleUpperCase('es-MX')
  if (field.validation === 'curp') {
    if (!/^[A-Z0-9]{18}$/.test(text) || !plausibleDateSegment(text.slice(4, 10))) return 'Revisa los 18 caracteres y la fecha incluida. La autenticidad se verifica ante RENAPO.'
  }
  if (field.validation === 'rfc-fisica' || field.validation === 'rfc-moral') {
    const isMoral = field.validation === 'rfc-moral'
    const length = isMoral ? 12 : 13
    const dateStart = isMoral ? 3 : 4
    const head = isMoral ? 3 : 4
    if (text.length !== length || !new RegExp(`^[A-ZÑ&]{${head}}[0-9]{6}[A-Z0-9]{3}$`).test(text) || !plausibleDateSegment(text.slice(dateStart, dateStart + 6))) {
      return `Revisa la estructura del RFC de ${isMoral ? '12' : '13'} caracteres. El formato no confirma su registro ante el SAT.`
    }
  }
  if (field.validation === 'postal-code' && !/^\d{5}$/.test(text)) return 'Escribe un código postal de 5 dígitos.'
  if (field.validation === 'phone' && !/^\d{10}$/.test(text.replace(/\D/g, ''))) return 'Escribe un teléfono de 10 dígitos.'
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return 'Escribe un correo electrónico válido.'
  if (rules.minLength != null && text.length < rules.minLength) return rules.message || `Escribe al menos ${rules.minLength} caracteres.`
  if (rules.maxLength != null && text.length > rules.maxLength) return rules.message || `Escribe como máximo ${rules.maxLength} caracteres.`
  if (rules.pattern && !new RegExp(rules.pattern).test(text)) return rules.message || 'Revisa el formato de este dato.'
  if (rules.min != null && Number(value) < Number(rules.min)) return rules.message || `El valor mínimo es ${rules.min}.`
  if (rules.max != null && Number(value) > Number(rules.max)) return rules.message || `El valor máximo es ${rules.max}.`
  return ''
}

function optionParts(option) {
  if (typeof option === 'object' && option !== null) {
    return { value: String(option.value ?? option.label ?? ''), label: option.label ?? option.value ?? '' }
  }
  return { value: String(option), label: option }
}

function SectionedForm({
  title,
  subtitle,
  sections = [],
  role = 'capturista',
  onSaveDraft,
  onSubmit,
  onExit,
  initialValues = {},
  currentSectionId,
  completedSectionIds = [],
  initialFinalized = false,
  readOnly = false,
}) {
  const userRole = normalizeRole(role)
  const initialSectionIndex = Math.max(0, sections.findIndex((section) => section.id === currentSectionId))
  const [activeIndex, setActiveIndex] = useState(initialSectionIndex)
  const [values, setValues] = useState(initialValues)
  const [completedSections, setCompletedSections] = useState(() => new Set(completedSectionIds.map((id) => sections.findIndex((section) => section.id === id)).filter((index) => index >= 0)))
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('')
  const [isFinalized, setIsFinalized] = useState(initialFinalized)
  const [isWorking, setIsWorking] = useState(false)
  const errorSummaryRef = useRef(null)
  const activeSection = sections[activeIndex]
  const canEdit = !readOnly && userRole !== 'guest' && (userRole === 'admin' || !isFinalized)
  const isLastSection = activeIndex === sections.length - 1

  const visibleFields = useMemo(
    () => (activeSection?.fields ?? []).filter((field) => fieldIsVisible(field, values)),
    [activeSection, values],
  )
  const invalidFields = visibleFields
    .map((field) => ({ field, message: fieldErrors[field.name] || '' }))
    .filter(({ message }) => message)

  useEffect(() => {
    if (invalidFields.length) errorSummaryRef.current?.focus()
  }, [invalidFields.length])

  function collectErrors(section) {
    const errors = {}
    for (const field of section?.fields ?? []) {
      if (!fieldIsVisible(field, values)) continue
      const message = getFieldError(field, values[field.name])
      if (message) errors[field.name] = message
    }
    return errors
  }

  function validateActiveSection() {
    const errors = collectErrors(activeSection)
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setStatus('Revisa los campos señalados antes de continuar.')
      return false
    }
    return true
  }

  function updateField(name, value) {
    setValues((current) => {
      const next = { ...current, [name]: value }
      if (name === 'tipoPersona') {
        for (const field of sections.flatMap((section) => section.fields)) {
          if (field.visibleWhen?.field === 'tipoPersona' && field.visibleWhen.value !== value) {
            next[field.name] = field.type === 'checkbox-group' ? [] : ''
          }
        }
      }
      return next
    })
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setCompletedSections((current) => new Set([...current].filter((index) => index < activeIndex)))
    setStatus('')
  }

  function goToNext() {
    if (userRole !== 'guest' && !validateActiveSection()) return
    if (userRole !== 'guest') setCompletedSections((current) => new Set([...current, activeIndex]))
    setActiveIndex((index) => Math.min(index + 1, sections.length - 1))
    setFieldErrors({})
    setStatus('')
  }

  function goToSection(index) {
    if (index === activeIndex || (!completedSections.has(index) && userRole !== 'guest' && !readOnly)) return
    setActiveIndex(index)
    setFieldErrors({})
    setStatus('')
  }

  async function saveDraft() {
    setIsWorking(true)
    setStatus('')
    try {
      await onSaveDraft?.({ values, currentSectionId: activeSection?.id, completedSectionIds: [...completedSections].map((index) => sections[index]?.id) })
      setStatus(isFinalized
        ? 'Los cambios del expediente se guardaron en el sistema.'
        : onSaveDraft
          ? 'Borrador guardado y disponible para retomarlo desde el centro de control.'
          : 'No hay una conexión disponible para guardar este borrador.')
    } catch (error) {
      setStatus(`No se pudo guardar el borrador. Puedes seguir editando e intentarlo de nuevo.${error?.requestId ? ` Referencia: ${error.requestId}` : ''}`)
    } finally {
      setIsWorking(false)
    }
  }

  async function finalize(event) {
    event.preventDefault()
    if (!validateActiveSection()) return
    setIsWorking(true)
    setStatus('')
    try {
      await onSubmit?.({ values, sectionIds: sections.map((section) => section.id) })
      setCompletedSections(new Set(sections.map((_, index) => index)))
      setIsFinalized(true)
      setStatus('El expediente se finalizó y quedó guardado en el sistema.')
    } catch (error) {
      setStatus(`No se pudo completar el envío. Tus datos siguen disponibles para corregirlos e intentarlo de nuevo.${error?.requestId ? ` Referencia: ${error.requestId}` : ''}`)
    } finally {
      setIsWorking(false)
    }
  }

  function renderField(field) {
    const value = values[field.name] ?? (field.type === 'checkbox' ? false : '')
    const error = fieldErrors[field.name]
    const helpId = field.help ? `${field.name}-help` : undefined
    const errorId = error ? `${field.name}-error` : undefined
    const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
    const common = {
      id: field.name,
      name: field.name,
      disabled: !canEdit || isWorking,
      'aria-invalid': Boolean(error),
      'aria-describedby': describedBy,
      'aria-required': isRequired(field),
      className: `${inputBase} ${error ? 'border-red-700 focus:border-red-700 focus:ring-red-700/20' : ''}`,
    }

    let control
    if (field.type === 'textarea') {
      control = <textarea {...common} className={`${common.className} min-h-28 resize-y`} placeholder={field.placeholder ?? ''} value={value} onChange={(event) => updateField(field.name, event.target.value)} />
    } else if (field.type === 'select') {
      control = (
        <select {...common} value={value} onChange={(event) => updateField(field.name, event.target.value)}>
          <option value="">{field.placeholder || 'Selecciona una opción'}</option>
          {(field.options ?? []).map((option) => {
            const item = optionParts(option)
            return <option key={item.value} value={item.value}>{item.label}</option>
          })}
        </select>
      )
    } else if (field.type === 'checkbox') {
      control = (
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-menu-line bg-menu-canvas px-3 py-2.5 text-base text-sirepes-ink">
          <input id={field.name} name={field.name} type="checkbox" checked={Boolean(value)} disabled={!canEdit || isWorking} aria-invalid={Boolean(error)} aria-describedby={describedBy} aria-required={isRequired(field)} onChange={(event) => updateField(field.name, event.target.checked)} className="size-5 accent-sirepes-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-not-allowed" />
          <span>{field.placeholder || field.label}</span>
        </label>
      )
    } else if (field.type === 'checkbox-group') {
      const selected = Array.isArray(value) ? value : []
      control = (
        <fieldset className={`grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 ${error ? 'border-red-700' : 'border-menu-line'}`} aria-describedby={describedBy}>
          <legend className="sr-only">{field.label}</legend>
          {(field.options ?? []).map((option) => {
            const item = optionParts(option)
            return (
              <label key={item.value} className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-sirepes-ink hover:bg-menu-canvas">
                <input type="checkbox" checked={selected.includes(item.value)} disabled={!canEdit || isWorking} aria-invalid={Boolean(error)} aria-required={isRequired(field)} onChange={(event) => updateField(field.name, event.target.checked ? [...selected, item.value] : selected.filter((choice) => choice !== item.value))} className="size-4 accent-sirepes-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus" />
                <span>{item.label}</span>
              </label>
            )
          })}
        </fieldset>
      )
    } else if (field.type === 'radio') {
      control = (
        <div className="flex min-h-11 flex-wrap gap-x-6 gap-y-3 rounded-lg border border-menu-line bg-white px-3 py-3" role="radiogroup" aria-labelledby={`${field.name}-label`} aria-describedby={describedBy}>
          {(field.options ?? []).map((option) => {
            const item = optionParts(option)
            return (
              <label key={item.value} className="inline-flex items-center gap-2 text-base text-sirepes-ink">
                <input type="radio" name={field.name} value={item.value} checked={String(value) === item.value} disabled={!canEdit || isWorking} aria-invalid={Boolean(error)} aria-required={isRequired(field)} onChange={() => updateField(field.name, item.value)} className="size-4 accent-sirepes-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-not-allowed" />
                <span>{item.label}</span>
              </label>
            )
          })}
        </div>
      )
    } else {
      const inputType = ['text', 'number', 'email', 'tel', 'date', 'url'].includes(field.type) ? field.type : 'text'
      control = <input {...common} type={inputType} placeholder={field.placeholder ?? ''} value={value} min={field.validation?.min} max={field.validation?.max} maxLength={field.validation?.maxLength} onChange={(event) => updateField(field.name, event.target.value)} />
    }

    return (
      <div className="min-w-0" key={field.name}>
        {field.type !== 'checkbox' && <label className="mb-2 block text-sm font-semibold text-sirepes-ink" id={`${field.name}-label`} htmlFor={field.name}>{field.label}{isRequired(field) && <span className="ml-1 text-sirepes-burgundy" aria-hidden="true">*</span>}{isRequired(field) && <span className="sr-only">, obligatorio</span>}</label>}
        {control}
        {field.unit && <span className="mt-1.5 block text-sm text-menu-muted">Unidad: {field.unit}</span>}
        {field.help && <p className="mt-1.5 text-sm leading-5 text-menu-muted" id={helpId}>{field.help}</p>}
        {error && <p className="mt-1.5 text-sm font-medium text-red-800" id={errorId}>{error}</p>}
      </div>
    )
  }

  if (!sections.length) {
    return <section className="mx-auto w-full max-w-5xl rounded-xl border border-menu-line bg-menu-surface p-6 text-sirepes-ink" aria-live="polite">No hay secciones disponibles para capturar.</section>
  }

  return (
    <main className="min-h-dvh bg-menu-canvas px-4 py-6 font-sans text-sirepes-ink sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
          <div className="flex min-w-0 items-start gap-4">
            <img className="h-10 w-40 shrink-0 object-contain object-left sm:h-12 sm:w-52" src={sederLogo} alt="Secretaría de Desarrollo Rural de Nayarit" />
            <div className="hidden h-12 w-px bg-menu-divider sm:block" aria-hidden="true" />
            <div className="min-w-0">
            <p className="mb-1 text-sm font-semibold text-menu-primary">Registro de Pesca y Acuacultura</p>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-sirepes-ink sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-3xl text-base leading-6 text-menu-muted">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            {onExit && <button type="button" onClick={onExit} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus">Volver al centro de control</button>}
          </div>
        </header>

        <nav aria-label="Secciones del formulario" className="mb-5 overflow-x-auto rounded-xl border border-menu-line bg-menu-surface p-3 sm:mb-6 sm:p-4">
          <ol className="flex min-w-max items-start gap-2 sm:w-full sm:items-center sm:gap-0">
            {sections.map((section, index) => {
              const current = index === activeIndex
              const completed = completedSections.has(index) || (isFinalized && index < sections.length)
              const canVisit = current || completed || userRole === 'guest'
              const stageClass = completed
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : current
                  ? 'border-sirepes-gold bg-sirepes-gold text-sirepes-ink'
                  : 'border-slate-300 bg-slate-100 text-slate-500'
              return (
                <li key={section.id} className="flex items-start sm:min-w-0 sm:flex-1 sm:items-center">
                  <button type="button" onClick={() => goToSection(index)} disabled={!canVisit || current} aria-current={current ? 'step' : undefined} className="group flex min-h-11 max-w-44 items-center gap-2 rounded-lg px-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-default sm:max-w-none sm:px-2">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${stageClass}`} aria-hidden="true">{completed ? '✓' : index + 1}</span>
                    <span className={`max-w-32 text-sm font-semibold leading-4 sm:max-w-40 ${current ? 'text-sirepes-ink' : completed ? 'text-emerald-800' : 'text-slate-500'}`}>{section.label}</span>
                  </button>
                  {index < sections.length - 1 && <span aria-hidden="true" className={`mx-1 mt-[17px] hidden h-px flex-1 sm:block ${completed ? 'bg-emerald-700' : 'bg-slate-300'}`} />}
                </li>
              )
            })}
          </ol>
        </nav>

        <form onSubmit={finalize} noValidate>
          <section className="overflow-hidden rounded-xl border border-menu-line bg-menu-surface shadow-[0_8px_30px_rgb(16_43_78_/_6%)]" aria-labelledby="section-title">
            <header className="border-b border-menu-divider px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="mb-1 text-sm font-semibold text-menu-primary">Sección {activeIndex + 1} de {sections.length}</p>
                  <h2 className="text-xl font-bold leading-tight text-sirepes-ink sm:text-2xl" id="section-title">{activeSection.title || activeSection.label}</h2>
                </div>
                {!canEdit && <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{userRole === 'guest' ? 'Solo lectura' : 'Formulario finalizado'}</span>}
                {userRole === 'admin' && isFinalized && <span className="rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">Edición administrativa</span>}
              </div>
            </header>

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              {invalidFields.length > 0 && (
                <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-live="assertive" className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 outline-none focus-visible:ring-2 focus-visible:ring-red-700">
                  <p className="font-bold">Revisa estos campos para continuar:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                    {invalidFields.map(({ field, message }) => <li key={field.name}><a className="underline underline-offset-2 focus-visible:outline-2" href={`#${field.name}`}>{field.label}: {message}</a></li>)}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                {visibleFields.map(renderField)}
                {!visibleFields.length && <p className="col-span-full text-base text-menu-muted">No hay campos que mostrar en esta sección con las respuestas actuales.</p>}
              </div>
            </div>

            <footer className="flex flex-col gap-4 border-t border-menu-divider bg-menu-canvas/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="m-0 max-w-2xl text-sm leading-5 text-menu-muted">Guarda el borrador para conservar tus avances en el sistema. Solo puedes editar expedientes conforme a tu perfil y permisos.</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button type="button" onClick={() => { setActiveIndex((index) => Math.max(index - 1, 0)); setFieldErrors({}); setStatus('') }} disabled={activeIndex === 0 || isWorking} className="min-h-11 rounded-lg border border-menu-line bg-menu-surface px-4 py-2 text-sm font-semibold text-sirepes-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-not-allowed disabled:opacity-50">Atrás</button>
                {canEdit && <button type="button" onClick={saveDraft} disabled={isWorking} className="min-h-11 rounded-lg border border-menu-primary bg-menu-surface px-4 py-2 text-sm font-semibold text-menu-primary hover:bg-menu-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-wait disabled:opacity-60">{isWorking ? 'Procesando…' : isFinalized ? 'Guardar cambios' : 'Guardar borrador'}</button>}
                {(canEdit || userRole === 'guest') && !isLastSection && <button type="button" onClick={goToNext} disabled={isWorking} className="min-h-11 rounded-lg bg-menu-primary px-5 py-2 text-sm font-bold text-white hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-wait disabled:opacity-60">Siguiente</button>}
                {canEdit && isLastSection && <button type="submit" disabled={isWorking} className="min-h-11 rounded-lg bg-menu-primary px-5 py-2 text-sm font-bold text-white hover:bg-menu-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-menu-focus disabled:cursor-wait disabled:opacity-60">{isWorking ? 'Procesando…' : 'Finalizar'}</button>}
              </div>
            </footer>
          </section>
        </form>

        <p className="mt-4 min-h-6 text-sm text-menu-muted" role="status" aria-live="polite" aria-atomic="true">{status}</p>
      </div>
    </main>
  )
}

export default SectionedForm
