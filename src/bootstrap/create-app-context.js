const { APP_CONFIG } = require('../config');
const { seedUsers } = require('../data/seed-users');
const { MetricsRegistry } = require('../monitoring/metrics-registry');
const { RequestLogger } = require('../monitoring/request-logger');
const { RateLimiter } = require('../security/rate-limiter');
const { TokenService } = require('../security/token-service');
const { AuditService } = require('../services/audit-service');
const { AuthService } = require('../services/auth-service');
const { IdempotencyService } = require('../services/idempotency-service');
const { LoginAttemptService, SessionService } = require('../services/session-service');
const { UserService } = require('../services/user-service');

function createAppContext() {
  if (APP_CONFIG.nodeEnv === 'production' && APP_CONFIG.auth.secret === 'change-this-in-production-secret') {
    throw new Error('AUTH_SECRET must be set in production.');
  }

  const tokenService = new TokenService(APP_CONFIG.auth);

  const sessionService = new SessionService({
    tokenService,
    maxSessionsPerUser: APP_CONFIG.auth.maxSessionsPerUser
  });

  const loginAttemptService = new LoginAttemptService({
    maxFailedAttempts: APP_CONFIG.auth.maxFailedLoginAttempts,
    failedWindowMs: APP_CONFIG.auth.failedLoginWindowMs,
    lockDurationMs: APP_CONFIG.auth.loginLockDurationMs
  });

  return {
    appConfig: APP_CONFIG,
    userService: new UserService({
      seedUsers,
      delayMs: APP_CONFIG.defaultDelayMs,
      failRate: APP_CONFIG.defaultFailRate,
      pageSize: APP_CONFIG.defaultPageSize
    }),
    authService: new AuthService({
      tokenService,
      sessionService,
      loginAttemptService,
      accounts: APP_CONFIG.auth.users
    }),
    auditService: new AuditService({
      maxEntries: APP_CONFIG.maxAuditEntries,
      maxPageSize: APP_CONFIG.maxAuditPageSize
    }),
    metricsRegistry: new MetricsRegistry(),
    rateLimiter: new RateLimiter(APP_CONFIG.rateLimit),
    loginRateLimiter: new RateLimiter(APP_CONFIG.loginRateLimit),
    idempotencyService: new IdempotencyService(APP_CONFIG.idempotency),
    logger: new RequestLogger()
  };
}

module.exports = {
  createAppContext
};
