const { APP_CONFIG } = require('../config');
const { seedUsers } = require('../data/seed-users');
const { MetricsRegistry } = require('../monitoring/metrics-registry');
const { RequestLogger } = require('../monitoring/request-logger');
const { RateLimiter } = require('../security/rate-limiter');
const { TokenService } = require('../security/token-service');
const { AuthService } = require('../services/auth-service');
const { AuditService } = require('../services/audit-service');
const { UserService } = require('../services/user-service');

function createAppContext() {
  const tokenService = new TokenService(APP_CONFIG.auth);

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
      accounts: APP_CONFIG.auth.users
    }),
    auditService: new AuditService({
      maxEntries: APP_CONFIG.maxAuditEntries
    }),
    metricsRegistry: new MetricsRegistry(),
    rateLimiter: new RateLimiter(APP_CONFIG.rateLimit),
    logger: new RequestLogger()
  };
}

module.exports = {
  createAppContext
};