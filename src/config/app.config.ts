export default () => ({
  port: parseInt(process.env.PORT ?? '8000', 10) || 8000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d'
  },
  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    },
    from: process.env.MAIL_FROM || 'noreply@pathfinder.com'
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  passwordResetTokenExpiry: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY ?? '60', 10)
})