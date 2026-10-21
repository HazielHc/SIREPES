CREATE TABLE expedientes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), modulo text NOT NULL CHECK(modulo IN ('pesca','acuacultura')),
 tipo_persona text CHECK(tipo_persona IN ('fisica','moral')), estado text NOT NULL DEFAULT 'borrador' CHECK(estado IN ('borrador','finalizado')),
 owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, folio text, current_section_id text,
 completed_section_ids text[] NOT NULL DEFAULT '{}', form_version smallint NOT NULL DEFAULT 1 CHECK(form_version>0),
 created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), finalized_at timestamptz,
 CHECK((estado='borrador' AND finalized_at IS NULL) OR (estado='finalizado' AND finalized_at IS NOT NULL))
);
CREATE INDEX expedientes_owner_status_updated_idx ON expedientes(owner_user_id,estado,updated_at DESC);
CREATE INDEX expedientes_module_status_updated_idx ON expedientes(modulo,estado,updated_at DESC);
CREATE INDEX expedientes_finalized_idx ON expedientes(updated_at DESC) WHERE estado='finalizado';
CREATE TABLE personas_fisicas (
 expediente_id uuid PRIMARY KEY REFERENCES expedientes(id),
 nombres text,apellido_paterno text,apellido_materno text,curp text,rfc text,fecha_nacimiento date,edad integer,sexo text,lugar_nacimiento text,municipio_nacimiento text,estado_nacimiento text
);
CREATE TABLE personas_morales (
 expediente_id uuid PRIMARY KEY REFERENCES expedientes(id),
 razon_social text,rfc text,numero_socios integer,padron_actualizado text,representante text,curp_representante text,rfc_representante text,rnpa text
);
CREATE TABLE persona_contacto (
 expediente_id uuid PRIMARY KEY REFERENCES expedientes(id),
 calle text,numero_exterior text,numero_interior text,codigo_postal text,localidad text,municipio text,estado text,telefono text,correo text
);
CREATE TABLE pesca_detalles (
 expediente_id uuid PRIMARY KEY REFERENCES expedientes(id),
 rnpa text,estatus_pescador text,cooperativa text,escolaridad text,experiencia integer,especies text,produccion_pescado numeric,produccion_crustaceos numeric,produccion_moluscos numeric,ingresos numeric,
 permisos text,artes_equipo text,actividad_alterna text,actividad_alterna_cual text,lugar_pesca text,sitio_desembarque text,observaciones text
);
CREATE TABLE pesca_meses (expediente_id uuid NOT NULL REFERENCES pesca_detalles(expediente_id),mes smallint NOT NULL CHECK(mes BETWEEN 1 AND 12),PRIMARY KEY(expediente_id,mes));
CREATE TABLE embarcaciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),expediente_id uuid NOT NULL REFERENCES pesca_detalles(expediente_id),
 cuenta_con_embarcacion text,nombre text,estado_registro text,matricula text,eslora numeric,manga numeric,capacidad_personas integer,tiene_motor text,potencia_motor numeric,marca_motor text,tiempos_motor text
);
CREATE INDEX embarcaciones_expediente_idx ON embarcaciones(expediente_id);
CREATE TABLE acuacultura_detalles (expediente_id uuid PRIMARY KEY REFERENCES expedientes(id),rnpa_persona text,tiene_embarcacion text,tipo_embarcacion text);
CREATE TABLE upas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),expediente_id uuid NOT NULL REFERENCES acuacultura_detalles(expediente_id),
 nombre text,rnpa_instalacion text,fecha_inicio date,estatus text,domicilio text,localidad text,municipio text,estado text,codigo_postal text,telefono text,correo text,predio text,latitud numeric,longitud numeric,area_total numeric
);
CREATE INDEX upas_expediente_idx ON upas(expediente_id);
CREATE TABLE upa_permisos (upa_id uuid NOT NULL REFERENCES upas(id),autoridad text NOT NULL CHECK(autoridad IN ('conagua','semarnat','conapesca','senasica')),tiene_permiso text,detalle text,PRIMARY KEY(upa_id,autoridad));
CREATE TABLE upa_infraestructura (
 upa_id uuid PRIMARY KEY REFERENCES upas(id),sistema_cultivo text,numero_estanques integer,area_espejo numeric,volumen_agua numeric,energia_electrica text,tipo_energia text,equipo_bombeo text,motores text,combustible text,bombas text,material text,aireacion text,tipo_aireacion text,excluidor_fauna text,tipo_fauna text,bodega text,cuarto_frio text,alimentador_automatico text
);
CREATE TABLE upa_metodos_cultivo (upa_id uuid NOT NULL REFERENCES upas(id),metodo text NOT NULL,descripcion_otro text,PRIMARY KEY(upa_id,metodo));
CREATE TABLE upa_aparatos_medicion (upa_id uuid NOT NULL REFERENCES upas(id),aparato text NOT NULL,PRIMARY KEY(upa_id,aparato));
CREATE TABLE upa_bitacoras (upa_id uuid NOT NULL REFERENCES upas(id),bitacora text NOT NULL,PRIMARY KEY(upa_id,bitacora));
CREATE TABLE upa_producciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),upa_id uuid NOT NULL REFERENCES upas(id),especie text,especie_otra text,nombre_cientifico text,nombre_comun text,densidad numeric,organismos_ciclo integer,ciclos_anuales integer,fase_siembra text,fase_cultivo text,
 actividades_preoperativas text,tipos_preoperativas text,actividades_poscosecha text,detalle_poscosecha text,medicion_fisicoquimica text,parametros text,tipo_alimento text,metodo_alimentacion text,valor_agregado text,detalle_valor_agregado text,certificaciones text,observaciones text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upa_producciones_upa_idx ON upa_producciones(upa_id);
CREATE TABLE upa_presentaciones (produccion_id uuid NOT NULL REFERENCES upa_producciones(id),presentacion text NOT NULL,presentacion_otra text,PRIMARY KEY(produccion_id,presentacion));
ALTER TABLE audit_events ADD COLUMN record_id uuid REFERENCES expedientes(id);
CREATE INDEX audit_events_record_created_idx ON audit_events(record_id,created_at DESC) WHERE record_id IS NOT NULL;
