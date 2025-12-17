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
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseIntSafe(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseIntSafe(process.env.REDIS_DB, 0)
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
    ),
    ipHashSalt: process.env.IP_HASH_SALT || 'default-insecure-salt',
    emailVerification: {
      required: parseBoolean(process.env.EMAIL_VERIFICATION_REQUIRED, true),
      tokenExpiryHours: parseIntSafe(
        process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS,
        24
      )
    },
    mentorship: {
      requestExpiryHours: parseIntSafe(
        process.env.MENTORSHIP_REQUEST_EXPIRY_HOURS,
        72
      ),
      reapplyCooldownDays: parseIntSafe(
        process.env.MENTOR_REAPPLY_COOLDOWN_DAYS,
        30
      ),
      maxMessageLength: parseIntSafe(process.env.MAX_MESSAGE_LENGTH, 10000),
      defaultMeetingDurationMinutes: parseIntSafe(
        process.env.DEFAULT_MEETING_DURATION_MINUTES,
        60
      ),
      meetingReminderHours: parseIntSafe(
        process.env.MEETING_REMINDER_HOURS,
        24
      ),
      ipBasedRateLimitPerWeek: parseIntSafe(
        process.env.IP_BASED_RATE_LIMIT_PER_WEEK,
        10
      ),
      contentValidation: {
        enabled: parseBoolean(process.env.CONTENT_VALIDATION_ENABLED, true),
        minQualityScore: parseIntSafe(
          process.env.MIN_CONTENT_QUALITY_SCORE,
          60
        ),
        spamKeywords: (
          process.env.SPAM_KEYWORDS || 'buy now,click here,limited offer'
        )
          .split(',')
          .map((k) => k.trim())
      }
    }
  }
}
