# API SIREPES

## Configuración local

1. Instala PostgreSQL y crea una base `sirepes` y un usuario de aplicación con permisos sobre esa base.
2. En la raíz del proyecto, copia `.env.example` a `.env` y configura `DATABASE_URL`.
3. Instala las dependencias desde la raíz con `npm install`.
4. Aplica las migraciones con `npm run db:migrate`.
5. Inicia la API con `npm run dev:api`.
6. En una terminal interactiva, crea el primer administrador con `npm run db:bootstrap-admin`.

La API escucha en `http://localhost:3000` por defecto. `GET /api/health` comprueba que el proceso responde; `GET /api/ready` comprueba también la conexión a PostgreSQL y responde `503` si la base no está disponible. No devuelve detalles de conexión.

## Migraciones

Las migraciones SQL ordenadas viven en `database/migrations`. El runner usa un bloqueo advisory de PostgreSQL, guarda nombre y SHA-256 en `schema_migrations`, y aplica cada archivo en una transacción. Si una migración aplicada cambia, se detiene y pide agregar una migración nueva. Para ejecutar manualmente:

```powershell
npm run db:migrate
```

Las variables reales deben permanecer en `.env` (ignorado por Git). No uses credenciales de producción para desarrollo.

## Cuentas y correo

El primer administrador se crea con el comando privado de bootstrap y su contraseña no se imprime. Las cuentas posteriores se crean desde la interfaz de administración. Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM` para que se envíe una contraseña temporal. El servicio no devuelve contraseñas temporales en las respuestas. La cuenta se activa después de la entrega del correo y el usuario debe cambiar la contraseña en su primer acceso.

Para crear otra cuenta administradora, usa `npm run db:create-admin` desde la raíz del proyecto. Es una operación local e interactiva; la contraseña no se muestra y no se puede asignar el perfil Administrador desde la API web.

Sesiones almacenadas en PostgreSQL se entregan en cookie `HttpOnly`, `SameSite=Lax`, con vigencia definida por `SESSION_TTL_HOURS`; en producción la cookie usa `Secure`. Define `FRONTEND_ORIGIN` si la interfaz se publica en otro origen.
