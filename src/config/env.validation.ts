import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(8000),

  DATABASE_HOST: Joi.string().hostname().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(false),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('7d'),

  MAIL_HOST: Joi.string().allow('').default(''),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().allow('').default(''),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  CORS_ENABLED: Joi.boolean().default(true),
  CORS_ORIGINS: Joi.string().allow(''),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  CORS_METHODS: Joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'),
  CORS_MAX_AGE: Joi.number().default(86400),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  ENABLE_SWAGGER: Joi.boolean().default(true),
  PASSWORD_RESET_TOKEN_EXPIRY: Joi.number().default(60),

  // Email Verification
  EMAIL_VERIFICATION_REQUIRED: Joi.boolean().default(true),
  EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: Joi.number()
    .min(1)
    .max(168)
    .default(24),

  // IP Tracking & Privacy
  IP_HASH_SALT: Joi.string().min(16).required(),

  // Redis Configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // Generative AI Configuration
  GENAI_API_KEYS: Joi.string().required(),
  GENAI_MODEL: Joi.string().default('gemini-3-flash-preview'),
  GENAI_MAX_OUTPUT_TOKENS: Joi.number().min(64).max(65536).default(65536),

  // Mentorship configuration
  MENTORSHIP_REQUEST_EXPIRY_HOURS: Joi.number().min(1).default(72),
  MENTOR_REAPPLY_COOLDOWN_DAYS: Joi.number().min(0).default(30),
  MAX_MESSAGE_LENGTH: Joi.number().min(100).max(50000).default(10000),
  DEFAULT_MEETING_DURATION_MINUTES: Joi.number().min(15).max(480).default(60),
  MEETING_REMINDER_HOURS: Joi.number().min(1).max(168).default(24),
  IP_BASED_RATE_LIMIT_PER_WEEK: Joi.number().min(1).max(100).default(10),

  // Content Validation Configuration
  CONTENT_VALIDATION_SPAM_KEYWORDS: Joi.string()
    .allow('')
    .default(
      'buy now,click here,limited offer,urgent,act now,win prize,free money,make money fast,work from home,guaranteed income'
    ),
  CONTENT_VALIDATION_MIN_QUALITY_SCORE: Joi.number()
    .min(0)
    .max(100)
    .default(60),
  CONTENT_VALIDATION_ENABLE_AI: Joi.boolean().default(true),
  CONTENT_VALIDATION_ENABLE_CACHE: Joi.boolean().default(true),
  CONTENT_VALIDATION_CACHE_TTL_SECONDS: Joi.number()
    .min(60)
    .max(86400)
    .default(3600),
  CONTENT_VALIDATION_MIN_TEXT_LENGTH: Joi.number()
    .min(50)
    .max(500)
    .default(100),
  CONTENT_VALIDATION_WEIGHT_REPEATED_CHARS: Joi.number()
    .min(0)
    .max(100)
    .default(30),
  CONTENT_VALIDATION_WEIGHT_SPAM_KEYWORD: Joi.number()
    .min(0)
    .max(100)
    .default(20),
  CONTENT_VALIDATION_WEIGHT_SUSPICIOUS_URLS: Joi.number()
    .min(0)
    .max(100)
    .default(25),
  CONTENT_VALIDATION_WEIGHT_LOW_DIVERSITY: Joi.number()
    .min(0)
    .max(100)
    .default(20),
  CONTENT_VALIDATION_WEIGHT_EXCESSIVE_SPECIAL_CHARS: Joi.number()
    .min(0)
    .max(100)
    .default(15),
  CONTENT_VALIDATION_WEIGHT_GIBBERISH: Joi.number().min(0).max(100).default(30),
  CONTENT_VALIDATION_WEIGHT_TOO_SHORT: Joi.number().min(0).max(100).default(20),
  CONTENT_VALIDATION_WEIGHT_AI_SPAM: Joi.number().min(0).max(100).default(41),
  CONTENT_VALIDATION_WEIGHT_SENSITIVE_CONTENT: Joi.number()
    .min(0)
    .max(100)
    .default(50),
  CONTENT_VALIDATION_WEIGHT_ARRAY_FIELD_SPAM: Joi.number()
    .min(0)
    .max(100)
    .default(25),

  UPLOAD_DOCUMENTS_PATH: Joi.string().default('./uploads/documents'),
  UPLOAD_MAX_FILE_SIZE_BYTES: Joi.number()
    .min(1024) // 1KB minimum
    .max(50 * 1024 * 1024) // 50MB maximum
    .default(5 * 1024 * 1024), // 5MB default
  UPLOAD_MAX_DOCUMENTS_PER_APPLICATION: Joi.number().min(1).max(50).default(10),
  UPLOAD_ALLOWED_MIME_TYPES: Joi.string().default(
    [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation'
    ].join(',')
  )
})
