const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  return value === 'true'
}

const parseIntSafe = (value: string | undefined, defaultValue: number) => {
  const parsed = parseInt(value ?? '', 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

const parseNumberSafe = (value: string | undefined, defaultValue: number) => {
  const parsed = parseFloat(value ?? '')
  return Number.isNaN(parsed) ? defaultValue : parsed
}

const resolveCorsOrigins = () => {
  const rawOrigins = process.env.CORS_ORIGINS

  if (rawOrigins && rawOrigins.trim().length > 0) {
    return rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }

  return [process.env.FRONTEND_URL ?? 'http://localhost:3000']
}

export default () => {
  const origins = resolveCorsOrigins()

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    app: {
      port: parseIntSafe(process.env.PORT, 8000)
    },
    database: {
      host: process.env.DATABASE_HOST,
      port: parseIntSafe(process.env.DATABASE_PORT, 5432),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      synchronize: parseBoolean(process.env.DATABASE_SYNCHRONIZE, false),
      logging: parseBoolean(process.env.DATABASE_LOGGING, false),
      ssl: parseBoolean(process.env.DATABASE_SSL, false),
      sslRejectUnauthorized: parseBoolean(
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
        false
      )
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '7d'
    },
    mail: {
      host: process.env.MAIL_HOST || '',
      port: parseIntSafe(process.env.MAIL_PORT, 587),
      secure: parseBoolean(process.env.MAIL_SECURE, false),
      auth: {
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASSWORD || ''
      },
      from: process.env.MAIL_FROM || ''
    },
    cors: {
      enabled: parseBoolean(process.env.CORS_ENABLED, true),
      origins,
      credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
      methods:
        process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      maxAge: parseIntSafe(process.env.CORS_MAX_AGE, 86_400)
    },
    throttle: {
      ttl: parseIntSafe(process.env.THROTTLE_TTL, 60),
      limit: parseIntSafe(process.env.THROTTLE_LIMIT, 100)
    },
    genai: {
      apiKey: process.env.GENAI_API_KEY ?? '',
      model: process.env.GENAI_MODEL ?? 'gemini-2.5-flash',
      temperature: parseNumberSafe(process.env.GENAI_TEMPERATURE, 0.4),
      topP: parseNumberSafe(process.env.GENAI_TOP_P, 0.95),
      topK: parseIntSafe(process.env.GENAI_TOP_K, 32),
      maxOutputTokens: parseIntSafe(process.env.GENAI_MAX_OUTPUT_TOKENS, 32768)
    },
    documentation: {
      enabled: parseBoolean(process.env.ENABLE_SWAGGER, true),
      path: process.env.SWAGGER_PATH || 'api/docs'
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    passwordResetTokenExpiry: parseIntSafe(
      process.env.PASSWORD_RESET_TOKEN_EXPIRY,
      60
    )
  }
}
