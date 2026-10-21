import SectionedForm from '../../components/ui/SectionedForm.jsx'
import { pescaSections } from '../pesca/pescaSections.js'
import { acuaculturaSections } from '../acuacultura/acuaculturaSections.js'

function RegistrationScreen({ module, role, record, readOnly = false, onExit, onSaveDraft, onSubmit }) {
  const isPesca = module === 'pesca'
  const sections = isPesca ? pescaSections : acuaculturaSections
  const moduleName = isPesca ? 'Pesca' : 'Acuacultura'
  const recordStatus = String(record?.status || '').toLocaleLowerCase('es')
  const isFinalized = ['submitted', 'finalized', 'finalizado'].includes(recordStatus)
  const title = readOnly
    ? `Expediente de ${moduleName.toLocaleLowerCase('es')}`
    : recordStatus === 'draft'
      ? `Editar borrador de ${moduleName.toLocaleLowerCase('es')}`
      : isFinalized
        ? `Editar expediente de ${moduleName.toLocaleLowerCase('es')}`
        : `Nuevo registro de ${moduleName.toLocaleLowerCase('es')}`

  return (
    <>
      {import.meta.env.DEV && (
        <p className="m-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950" role="note">
          Vista de desarrollo · perfil {role} · usa una sesión activa para guardar cambios en PostgreSQL.
        </p>
      )}
      <SectionedForm
        title={title}
        subtitle="Completa la información por secciones. Solo se muestran los campos aplicables al tipo de persona y a las respuestas indicadas."
        sections={sections}
        role={role}
        onExit={onExit}
        initialValues={record?.values || {}}
        currentSectionId={record?.currentSectionId}
        completedSectionIds={record?.completedSectionIds || (isFinalized ? sections.map((section) => section.id) : [])}
        initialFinalized={isFinalized}
        readOnly={readOnly}
        onSaveDraft={(payload) => onSaveDraft?.({ ...payload, recordId: record?.id, module })}
        onSubmit={(payload) => onSubmit?.({ ...payload, recordId: record?.id, module })}
      />
    </>
  )
}

export default RegistrationScreen
