import nodemailer from 'nodemailer'

export function isMailConfigured() {
  const port = Number(process.env.SMTP_PORT)
  const hasAuth = Boolean(process.env.SMTP_USER || process.env.SMTP_PASSWORD)
  return Boolean(process.env.SMTP_HOST && Number.isInteger(port) && port >= 1 && port <= 65535
    && process.env.SMTP_FROM && (!hasAuth || (process.env.SMTP_USER && process.env.SMTP_PASSWORD))
    && (!process.env.SMTP_SECURE || ['true', 'false'].includes(process.env.SMTP_SECURE)))
}

export async function sendTemporaryCredentials({ to, fullName, username, password, reset = false }) {
  if (!isMailConfigured()) {
    const error = new Error('El correo institucional no está configurado. Define SMTP_HOST, SMTP_PORT y SMTP_FROM para habilitar esta operación.')
    error.code = 'MAIL_NOT_CONFIGURED'
    error.status = 503
    throw error
  }
  if (process.env.SMTP_SECURE && !['true', 'false'].includes(process.env.SMTP_SECURE)) {
    const error = new Error('SMTP_SECURE debe ser true o false.')
    error.code = 'MAIL_NOT_CONFIGURED'
    error.status = 503
    throw error
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: reset ? 'Restablecimiento de acceso a SIREPES' : 'Acceso inicial a SIREPES',
    text: `Hola ${fullName},\n\n${reset ? 'Se restableció' : 'Se creó'} tu acceso a SIREPES.\nUsuario: ${username}\nContraseña temporal: ${password}\n\nAl ingresar deberás cambiarla antes de continuar.`,
  })
}
