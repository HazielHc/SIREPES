# SIREPES

Sistema de Registro Estatal de Pesca y Acuacultura de Nayarit.

## Estructura rápida

```text
SIREPES/
├── frontend/                       # Aplicación React
│   └── src/
│       ├── app/                    # Entrada y composición
│       ├── screens/                # Una carpeta por pantalla
│       │   ├── login/              # Login actual
│       │   ├── administracion-usuarios/
│       │   ├── pesca/
│       │   └── acuacultura/
│       ├── components/ui/          # Componentes reutilizables
│       ├── services/               # Comunicación con la API
│       ├── assets/                 # Logos y recursos gráficos
│       └── styles/                 # Estilos globales
├── api/                            # Servidor API Node.js + Express
│   └── src/
│       ├── modules/                # auth, users, pesca, acuacultura, catálogos
│       ├── middleware/
│       ├── config/
│       ├── db/
│       └── shared/
├── database/
│   ├── migrations/                 # Cambios versionados de PostgreSQL
│   └── seeds/                      # Datos iniciales no sensibles
├── package.json                    # npm workspaces y comandos
└── README.md
```

La documentación de requisitos y arquitectura se conserva fuera del código, en `C:\Users\AtlayPC\Desktop\SIREPES_Documentacion`.

## Ejecutar el proyecto

Desde la carpeta raíz 

```powershell
npm install
npm run dev:frontend
```

En otra terminal:

```powershell
npm run dev:api
```

Para preparar PostgreSQL, instala PostgreSQL, crea una base y un usuario de aplicación. Copia `.env.example` a `.env`, configura `DATABASE_URL` y aplica el esquema:

```powershell
npm run db:migrate
```

Después aprovisiona la primera cuenta administradora desde una terminal interactiva. La contraseña se captura sin mostrarla:

```powershell
npm run db:bootstrap-admin
```

Para aprovisionar administradores adicionales por consola local, ejecuta `npm run db:create-admin`. El panel web no permite asignar el perfil Administrador.

Para crear usuarios desde la pantalla de administración también debes configurar SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` y, si aplica, credenciales) en `.env`. Sin SMTP, el alta y el restablecimiento se deshabilitan con un mensaje claro y no se entrega ninguna contraseña por la API.

La API separa liveness (`/api/health`) de readiness con PostgreSQL (`/api/ready`). Consulta [api/README.md](api/README.md) para preparar la base local.

La interfaz abre normalmente en `http://localhost:5173`. Vite reenvía las llamadas `/api` a Express en `http://localhost:3000`.

## Alcance de esta etapa

Las cuentas, autenticación por cookie de sesión, cambio obligatorio de contraseña temporal, gestión administrativa y auditoría usan PostgreSQL. Los formularios y expedientes todavía se guardan en memoria en el navegador; persistirlos, habilitar la consulta de expedientes por Personal de SEDER y generar PDFs corresponde a la siguiente etapa.
