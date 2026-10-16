# SIREPES: diseño de cuentas, permisos y consulta de expedientes

**Fecha:** 2026-10-15  
**Estado:** Borrador para revisión del usuario  
**Alcance:** primera etapa de persistencia y autenticación; acceso de consulta para Personal de SEDER

## Intención

SIREPES ya tiene pantallas de acceso, selección de módulo, captura y centro de control, pero las cuentas, sesiones y expedientes aún no se guardan en PostgreSQL. Esta etapa crea una base segura para que el administrador dé de alta a las personas usuarias y para que cada perfil reciba únicamente las capacidades definidas. También establece el acceso de solo lectura de Personal de SEDER a expedientes finalizados y su descarga individual en PDF.

La interfaz React se comunicará exclusivamente con Express. La API aplica autenticación, validación y permisos; ocultar una acción en la interfaz nunca se considera autorización suficiente.

## Metas

- Persistir cuentas y sesiones con migraciones PostgreSQL reproducibles.
- Habilitar el inicio y cierre de sesión reales y el cambio obligatorio de contraseña temporal al primer acceso.
- Dar al administrador una sección exclusiva para listar, crear, cambiar rol, deshabilitar/reactivar y solicitar restablecimiento de contraseña de cuentas.
- Registrar altas y cambios administrativos en una bitácora sin contraseñas, tokens ni datos sensibles innecesarios.
- Aplicar los cuatro perfiles acordados en la API: Administrador, Capturista, Personal de SEDER e Invitado.
- Permitir a Personal de SEDER localizar, consultar y descargar como PDF un expediente finalizado por archivo.

## Fuera de alcance de esta etapa

- Modelar y persistir todos los campos de los formularios de Pesca y Acuacultura, salvo lo necesario para identificar, filtrar y autorizar los expedientes consultables.
- Exportación masiva, exportar borradores, adjuntos, aprobaciones institucionales o firma electrónica.
- Restablecimiento de contraseña autónomo por correo, MFA, integración con identidad estatal y separación territorial por municipio.
- Cambiar la composición visual ya aprobada de las pantallas existentes.

## Perfiles y permisos

| Perfil | Ver/listar | Crear | Editar | Eliminar/desactivar | Exportar PDF | Administrar cuentas |
|---|---|---|---|---|---|---|
| Administrador | Todos los módulos y expedientes | Sí | Sí, incluidos expedientes finalizados | Sí, sujeto a auditoría y reglas del último administrador | Sí | Sí |
| Capturista | Pesca y Acuacultura | Sí | Borradores propios hasta finalizar; después solo consulta | No | No | No |
| Personal de SEDER | Expedientes finalizados de Pesca y Acuacultura; búsqueda por nombre, localidad y tipo de persona | No | No | No | Sí, un expediente por PDF | No |
| Invitado | Vista de consulta de todo el sistema | No | No | No | No, por defecto | No |

Personal de SEDER podrá abrir el expediente completo en modo lectura. El PDF contendrá los datos registrados del expediente finalizado, su folio, módulo y estado, más fecha de generación y paginación. No incluirá borradores, contraseñas, tokens ni metadatos internos. La API deberá enviar el PDF como descarga privada, sin caché pública, y auditar la exportación. La auditoría registra actor, expediente, fecha, resultado y módulo, pero nunca copia los datos personales ni el archivo PDF.

El alcance de consulta será estatal para Pesca y Acuacultura; no habrá filtrado por municipio o área en esta etapa. Las reglas de captura y la edición de expedientes finalizados reflejan acuerdos anteriores del usuario. Invitado mantiene consulta sin exportación; ese permiso es una decisión conservadora de este diseño.

## Experiencia administrativa

1. Un administrador autenticado abre «Administración de usuarios» desde la navegación del sistema. Los demás perfiles no verán esa entrada y, aun si solicitan directamente sus rutas, la API denegará acceso.
2. La lista muestra nombre, usuario, correo, perfil, estado, fecha de creación y último acceso, con búsqueda y filtros por perfil y estado.
3. «Crear usuario» solicita nombre, correo y perfil. El servidor normaliza y valida el correo, genera un nombre de usuario único y una contraseña temporal de un solo uso.
4. La cuenta y el evento de auditoría se escriben en una transacción. La contraseña solo existe en memoria para generar el hash y entregar el mensaje; no se devuelve como contraseña permanente ni se guarda en texto claro.
5. El sistema envía usuario y contraseña temporal al correo mediante SMTP configurado por entorno. Si el envío falla, la cuenta no queda como utilizable sin que el administrador conozca el resultado; el comportamiento transaccional de correo se resolverá con una cola/outbox sencilla o una operación compensatoria que evite credenciales huérfanas.
6. En el primer acceso correcto, la sesión se restringe al cambio de contraseña. Hasta completar el cambio, el usuario no podrá navegar a módulos ni usar endpoints de datos.
7. El administrador puede cambiar perfil, deshabilitar/reactivar y solicitar una nueva contraseña temporal. Deshabilitar o restablecer revoca sesiones activas. No se borran físicamente cuentas que ya tengan actividad.

## Primer administrador

No existirá un endpoint público para crear una cuenta administradora. El primer administrador se aprovisionará con un comando de inicialización que lee datos desde entrada segura/variables de entorno y guarda solamente un hash. El comando no imprimirá contraseñas, no reemplazará una cuenta existente y fallará de forma explícita si ya hay administrador.

## Modelo de datos inicial

### `users`

- `id UUID PRIMARY KEY`.
- `username` y `email` normalizados y únicos.
- `full_name` obligatorio.
- `role` restringido a `administrador`, `capturista`, `personal_seder`, `invitado`.
- `status` restringido a `active` o `disabled`.
- `password_hash` obligatorio (Argon2id); nunca contraseña plana o reversible.
- `must_change_password`, `password_changed_at`, `last_login_at`.
- `created_by` autorreferenciado, `created_at`, `updated_at`.

### `auth_sessions`

Sesiones opacas aleatorias, almacenadas en servidor con un hash del identificador, usuario, expiración, revocación y fechas de creación/último uso. El navegador recibe únicamente una cookie `HttpOnly`, `SameSite=Lax`; `Secure` se activa en HTTPS. Cambiar contraseña, deshabilitar cuenta y cerrar sesión revocan la sesión correspondiente.

### `audit_events`

Bitácora append-only de actor, acción, tipo e identificador del objetivo, resultado, fecha UTC y metadatos limitados. Se registran como mínimo alta, cambio de perfil, activación/desactivación, restablecimiento de acceso, inicio/cierre de sesión, acceso a expediente y exportación PDF. Nunca se incluyen contraseña, hash, token, PDF o contenido completo de formularios.

Los primeros endpoints de expedientes expondrán una lista paginada con filtros permitidos (`name`, `locality`, `personType`, `module`), detalle por identificador y PDF por expediente. El servidor comprueba rol, estado de la cuenta, módulo, estado finalizado e identidad del expediente antes de responder. La respuesta no incluye borradores a Personal de SEDER ni a Invitado.

## Estructura técnica

- PostgreSQL como almacenamiento; SQL versionado bajo `database/migrations` y seeds solo para catálogos/datos ficticios.
- `pg` con consultas parametrizadas y transacciones; la API conserva módulos separados para autenticación, usuarios, expedientes y reportes.
- Variables de entorno para conexión y SMTP; `.env.example` contiene nombres y ejemplos inocuos, nunca secretos. La interfaz no recibe acceso de base de datos.
- Middleware común carga la sesión y verifica que la cuenta siga activa. Las rutas usan permisos por capacidad y deniegan por defecto.
- Índices únicos sobre username/email normalizados, estado/rol para administración, y columnas normalizadas de nombre/localidad/tipo/módulo/estado para la búsqueda inicial. Limitar tamaño de página y aplicar consultas parametrizadas.

## Seguridad y operación

- Hash adaptativo Argon2id con parámetros configurados para el servidor; validar política de longitud/fortaleza sin imponer reglas visuales como control único.
- Respuestas de login genéricas, límite de intentos, límites de frecuencia para restablecimiento y exportación, y límites de tamaño de solicitudes.
- Cookie de sesión `HttpOnly`; nada de contraseña, token de acceso ni sesión en `localStorage`.
- No permitir degradar/desactivar al último administrador activo. Cada ruta administrativa vuelve a comprobar permisos en backend.
- PDFs y vistas de expediente responden con `Cache-Control: private, no-store`; nombres de archivo no contienen CURP, RFC ni nombre completo.
- Las migraciones deben ejecutarse explícitamente y reportar errores sin ocultarlos. Los respaldos y retención de bitácora quedan sujetos a política institucional.

## Fases de implementación

1. Configurar PostgreSQL, migraciones, conexión y health check de DB.
2. Crear bootstrap del primer administrador, autenticación, sesiones, cambio de contraseña y middleware/permisos.
3. Construir endpoints y pantalla exclusiva de gestión de usuarios, correo de acceso temporal y bitácora.
4. Persistir expedientes de los formularios existentes; añadir filtros y detalle de consulta para Personal de SEDER.
5. Generar PDF individual únicamente para expedientes finalizados y probar permisos de extremo a extremo.

## Criterios de aceptación

- Solo una cuenta administradora puede dar de alta o modificar otras cuentas; no se puede autoasignar rol administrador vía API.
- El bootstrap crea el primer administrador de forma segura y no se ejecuta dos veces sobre datos existentes.
- Las contraseñas temporales no aparecen en la base, logs o respuestas posteriores y obligan a cambiarla antes de acceder a módulos.
- Una cuenta deshabilitada no puede iniciar ni mantener una sesión efectiva.
- Los cuatro perfiles reciben el comportamiento de la matriz tanto desde UI como llamando directamente a endpoints.
- Personal de SEDER encuentra expedientes finalizados usando nombre/localidad/tipo, consulta el detalle en modo lectura y descarga un PDF individual; no puede crear, editar, eliminar ni exportar un borrador.
- Invitado consulta sin crear ni editar y no descarga PDFs.
- Alta, cambios de perfil/estado, accesos relevantes y exportaciones quedan auditados sin secretos ni contenido personal completo.
- La lista se pagina y la búsqueda no expone expedientes fuera del alcance autorizado.

## Decisiones pendientes y supuestos

- **Correo SMTP:** el borrador requiere correo institucional, pero el proveedor y las credenciales no están configurados. El producto se implementará detrás de variables de entorno; el envío real requiere que SEDER proporcione esos parámetros.
- **Datos de perfil:** se proponen nombre completo, correo y perfil como campos obligatorios; teléfono y dependencia quedan fuera hasta confirmar necesidad.
- **Usuario generado:** nombre de usuario derivado del nombre, normalizado y desambiguado con sufijo cuando ya exista; el servidor es la autoridad.
- **Invitado:** se conserva lectura visual general acordada antes, sin descarga PDF por defecto.
- **Sesión:** tiempo de expiración configurable, sin recordar sesión de forma permanente; valor final se asigna como parámetro operativo antes de producción.
- **Permisos del administrador:** se mantienen todas las acciones ya acordadas; borrado físico de cuentas queda sustituido por desactivación para conservar auditoría.
- **PDF:** un expediente finalizado individual por descarga, según la decisión explícita del usuario.
- **Persistencia de expedientes:** el formulario actual trabaja en memoria; los filtros y PDF de SEDER no serán reales hasta que la persistencia de registros esté implementada en la fase 4.

## Preguntas a resolver antes de producción

- Proveedor, remitente y política de correo institucional SMTP.
- Política institucional de vigencia de sesión, retención de auditoría y respaldos.
- Política de restablecimiento autónomo a futuro y vigencia de credenciales temporales.
- Confirmación final de campos de cuenta adicionales (dependencia/teléfono) y datos del PDF que deben ocultarse por sensibilidad.
