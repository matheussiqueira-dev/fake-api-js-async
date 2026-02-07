const APP_CONFIG = Object.freeze({
  appName: 'fake-api-js-async',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  defaultDelayMs: 450,
  defaultFailRate: 0,
  defaultPageSize: 6,
  maxPageSize: 25,
  maxBodyBytes: 1_000_000,
  maxAuditEntries: 1_000,
  maxAuditPageSize: 100,
  requestTimeoutMs: 10_000,
  auth: {
    issuer: 'fake-api-js-async',
    audience: 'fake-api-dashboard',
    tokenTtlSeconds: Number.parseInt(process.env.AUTH_TOKEN_TTL_SECONDS ?? '7200', 10),
    refreshTokenTtlSeconds: Number.parseInt(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS ?? '604800', 10),
    secret: process.env.AUTH_SECRET ?? 'change-this-in-production-secret',
    maxFailedLoginAttempts: Number.parseInt(process.env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS ?? '5', 10),
    failedLoginWindowMs: Number.parseInt(process.env.AUTH_FAILED_LOGIN_WINDOW_MS ?? '900000', 10),
    loginLockDurationMs: Number.parseInt(process.env.AUTH_LOGIN_LOCK_DURATION_MS ?? '900000', 10),
    maxSessionsPerUser: Number.parseInt(process.env.AUTH_MAX_SESSIONS_PER_USER ?? '5', 10),
    users: [
      {
        id: 1,
        username: process.env.ADMIN_USERNAME ?? 'admin',
        password: process.env.ADMIN_PASSWORD ?? 'Admin@123',
        role: 'admin',
        displayName: 'Administrator'
      },
      {
        id: 2,
        username: process.env.EDITOR_USERNAME ?? 'editor',
        password: process.env.EDITOR_PASSWORD ?? 'Editor@123',
        role: 'editor',
        displayName: 'Editor'
      },
      {
        id: 3,
        username: process.env.VIEWER_USERNAME ?? 'viewer',
        password: process.env.VIEWER_PASSWORD ?? 'Viewer@123',
        role: 'viewer',
        displayName: 'Viewer'
      }
    ]
  },
  rateLimit: {
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    maxRequests: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '120', 10)
  },
  loginRateLimit: {
    windowMs: Number.parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    maxRequests: Number.parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS ?? '15', 10)
  },
  idempotency: {
    ttlMs: Number.parseInt(process.env.IDEMPOTENCY_TTL_MS ?? '300000', 10),
    maxEntries: Number.parseInt(process.env.IDEMPOTENCY_MAX_ENTRIES ?? '2000', 10)
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:3333,http://localhost:3333')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
});

module.exports = { APP_CONFIG };
