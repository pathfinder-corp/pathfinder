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
      model: process.env.GENAI_MODEL ?? 'gemini-3-flash-preview',
      maxOutputTokens: parseIntSafe(process.env.GENAI_MAX_OUTPUT_TOKENS, 65536)
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
      )
    },
    contentValidation: {
      spamKeywords: (
        process.env.CONTENT_VALIDATION_SPAM_KEYWORDS ||
        'buy now,click here,limited offer,urgent,act now,win prize,free money,make money fast,work from home,guaranteed income'
      )
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
      minQualityScore: parseIntSafe(
        process.env.CONTENT_VALIDATION_MIN_QUALITY_SCORE,
        60
      ),
      enableAiValidation: parseBoolean(
        process.env.CONTENT_VALIDATION_ENABLE_AI,
        true
      ),
      enableCaching: parseBoolean(
        process.env.CONTENT_VALIDATION_ENABLE_CACHE,
        true
      ),
      cacheTtlSeconds: parseIntSafe(
        process.env.CONTENT_VALIDATION_CACHE_TTL_SECONDS,
        3600
      ),
      weights: {
        repeatedCharacters: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_REPEATED_CHARS,
          30
        ),
        spamKeyword: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_SPAM_KEYWORD,
          20
        ),
        suspiciousUrls: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_SUSPICIOUS_URLS,
          25
        ),
        lowDiversity: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_LOW_DIVERSITY,
          20
        ),
        excessiveSpecialChars: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_EXCESSIVE_SPECIAL_CHARS,
          15
        ),
        gibberish: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_GIBBERISH,
          30
        ),
        tooShort: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_TOO_SHORT,
          20
        ),
        aiSpamDetection: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_AI_SPAM,
          40
        ),
        sensitiveContent: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_SENSITIVE_CONTENT,
          50
        ),
        arrayFieldSpam: parseIntSafe(
          process.env.CONTENT_VALIDATION_WEIGHT_ARRAY_FIELD_SPAM,
          25
        )
      },
      thresholds: {
        minTextLength: parseIntSafe(
          process.env.CONTENT_VALIDATION_MIN_TEXT_LENGTH,
          100
        ),
        minWordDiversity: 0.3,
        maxSpecialCharRatio: 0.15,
        minVowelRatio: 0.15,
        maxVowelRatio: 0.6,
        maxArrayDuplicateRatio: 0.5
      }
    },
    upload: {
      maxFileSizeBytes: parseIntSafe(
        process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
        5 * 1024 * 1024
      ),
      maxDocumentsPerApplication: parseIntSafe(
        process.env.UPLOAD_MAX_DOCUMENTS_PER_APPLICATION,
        10
      ),
      allowedMimeTypes: (
        process.env.UPLOAD_ALLOWED_MIME_TYPES ||
        [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          // PDF
          'application/pdf',
          // Microsoft Word
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          // Microsoft Excel
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          // Microsoft PowerPoint
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // OpenDocument formats
          'application/vnd.oasis.opendocument.text',
          'application/vnd.oasis.opendocument.spreadsheet',
          'application/vnd.oasis.opendocument.presentation'
        ].join(',')
      )
        .split(',')
        .map((t) => t.trim())
    },
    imagekit: {
      enabled: parseBoolean(process.env.IMAGEKIT_ENABLED, true),
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
      urlEndpoint:
        process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/3dteacher',
      folder: process.env.IMAGEKIT_FOLDER || '/mentor-documents'
    }
  }
}
