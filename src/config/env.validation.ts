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

  // Content Validation
  CONTENT_VALIDATION_ENABLED: Joi.boolean().default(true),
  MIN_CONTENT_QUALITY_SCORE: Joi.number().min(0).max(100).default(60),
  SPAM_KEYWORDS: Joi.string()
    .allow('')
    .default('buy now,click here,limited offer'),

  GENAI_API_KEY: Joi.string().required(),
  GENAI_MODEL: Joi.string().default('gemini-2.5-flash'),
  GENAI_TEMPERATURE: Joi.number().min(0).max(2).default(0.4),
  GENAI_TOP_P: Joi.number().min(0).max(1).default(0.95),
  GENAI_TOP_K: Joi.number().min(1).max(200).default(32),
  GENAI_MAX_OUTPUT_TOKENS: Joi.number().min(64).max(65536).default(32768),

  // Mentorship configuration
  MENTORSHIP_REQUEST_EXPIRY_HOURS: Joi.number().min(1).default(72),
  MENTOR_REAPPLY_COOLDOWN_DAYS: Joi.number().min(0).default(30),
  MAX_MESSAGE_LENGTH: Joi.number().min(100).max(50000).default(10000),
  DEFAULT_MEETING_DURATION_MINUTES: Joi.number().min(15).max(480).default(60),
  MEETING_REMINDER_HOURS: Joi.number().min(1).max(168).default(24),
  IP_BASED_RATE_LIMIT_PER_WEEK: Joi.number().min(1).max(100).default(10)
})
