const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../server/create-server');
const { APP_CONFIG } = require('../src/config');
const { seedUsers } = require('../src/data/seed-users');
const { MetricsRegistry } = require('../src/monitoring/metrics-registry');
const { RateLimiter } = require('../src/security/rate-limiter');
const { TokenService } = require('../src/security/token-service');
const { AuditService } = require('../src/services/audit-service');
const { AuthService } = require('../src/services/auth-service');
const { IdempotencyService } = require('../src/services/idempotency-service');
const { LoginAttemptService, SessionService } = require('../src/services/session-service');
const { UserService } = require('../src/services/user-service');

function createTestContext() {
  const authConfig = {
    ...APP_CONFIG.auth,
    secret: 'integration-secret',
    tokenTtlSeconds: 3600,
    refreshTokenTtlSeconds: 7200,
    maxFailedLoginAttempts: 10,
    failedLoginWindowMs: 60000,
    loginLockDurationMs: 60000,
    users: [
      { id: 1, username: 'admin', password: 'Admin@123', role: 'admin', displayName: 'Admin' },
      { id: 2, username: 'viewer', password: 'Viewer@123', role: 'viewer', displayName: 'Viewer' }
    ]
  };

  const tokenService = new TokenService(authConfig);

  return {
    appConfig: {
      ...APP_CONFIG,
      auth: authConfig,
      defaultDelayMs: 0,
      defaultPageSize: 6,
      requestTimeoutMs: 3_000,
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 1_000
      },
      loginRateLimit: {
        windowMs: 60_000,
        maxRequests: 100
      },
      idempotency: {
        ttlMs: 300_000,
        maxEntries: 500
      },
      cors: {
        allowedOrigins: ['http://127.0.0.1:3333', 'http://localhost:3333']
      }
    },
    userService: new UserService({
      seedUsers,
      delayMs: 0,
      failRate: 0,
      pageSize: 6
    }),
    authService: new AuthService({
      tokenService,
      sessionService: new SessionService({ tokenService, maxSessionsPerUser: 5 }),
      loginAttemptService: new LoginAttemptService({
        maxFailedAttempts: 5,
        failedWindowMs: 60_000,
        lockDurationMs: 60_000
      }),
      accounts: authConfig.users
    }),
    auditService: new AuditService({ maxEntries: 200 }),
    metricsRegistry: new MetricsRegistry(),
    rateLimiter: new RateLimiter({ windowMs: 60_000, maxRequests: 1_000 }),
    loginRateLimiter: new RateLimiter({ windowMs: 60_000, maxRequests: 100 }),
    idempotencyService: new IdempotencyService({ ttlMs: 300_000, maxEntries: 500 }),
    logger: {
      log() {},
      error() {}
    }
  };
}

async function startServer() {
  const server = createServer(createTestContext());

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

test('v1 API enforces authentication, supports refresh/logout lifecycle and role-based access', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const unauthorized = await requestJson(baseUrl, '/api/v1/users');
    assert.equal(unauthorized.response.status, 401);

    const adminLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'Admin@123'
      }
    });

    assert.equal(adminLogin.response.status, 200);
    assert.ok(typeof adminLogin.payload.data.refreshToken === 'string');

    const refresh = await requestJson(baseUrl, '/api/v1/auth/refresh', {
      method: 'POST',
      body: {
        refreshToken: adminLogin.payload.data.refreshToken
      }
    });

    assert.equal(refresh.response.status, 200);
    const adminToken = refresh.payload.data.accessToken;
    const adminRefreshToken = refresh.payload.data.refreshToken;

    const me = await requestJson(baseUrl, '/api/v1/auth/me', { token: adminToken });
    assert.equal(me.response.status, 200);
    assert.equal(me.payload.data.username, 'admin');

    const sessionStats = await requestJson(baseUrl, '/api/v1/auth/session-stats', {
      token: adminToken
    });

    assert.equal(sessionStats.response.status, 200);
    assert.ok(typeof sessionStats.payload.data.activeSessions === 'number');

    const viewerLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        username: 'viewer',
        password: 'Viewer@123'
      }
    });

    const viewerToken = viewerLogin.payload.data.accessToken;
    const forbiddenDelete = await requestJson(baseUrl, '/api/v1/users/1', {
      method: 'DELETE',
      token: viewerToken
    });

    assert.equal(forbiddenDelete.response.status, 403);

    const logout = await requestJson(baseUrl, '/api/v1/auth/logout', {
      method: 'POST',
      body: {
        refreshToken: adminRefreshToken
      }
    });

    assert.equal(logout.response.status, 200);
    assert.equal(logout.payload.data.revoked, true);

    const refreshAfterLogout = await requestJson(baseUrl, '/api/v1/auth/refresh', {
      method: 'POST',
      body: {
        refreshToken: adminRefreshToken
      }
    });

    assert.equal(refreshAfterLogout.response.status, 401);

    const legacyEndpoint = await requestJson(baseUrl, '/api/users?page=1&limit=2');
    assert.equal(legacyEndpoint.response.status, 200);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test('v1 API supports idempotent user creation with Idempotency-Key', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const adminLogin = await requestJson(baseUrl, '/api/v1/auth/login', {
      method: 'POST',
      body: {
        username: 'admin',
        password: 'Admin@123'
      }
    });

    const token = adminLogin.payload.data.accessToken;
    const idempotencyKey = 'test-key-12345678';

    const firstCreation = await requestJson(baseUrl, '/api/v1/users', {
      method: 'POST',
      token,
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: {
        name: 'Idempotent User',
        email: 'idempotent.user@example.com'
      }
    });

    const secondCreation = await requestJson(baseUrl, '/api/v1/users', {
      method: 'POST',
      token,
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: {
        name: 'Idempotent User',
        email: 'idempotent.user@example.com'
      }
    });

    assert.equal(firstCreation.response.status, 201);
    assert.equal(secondCreation.response.status, 201);
    assert.equal(firstCreation.payload.data.id, secondCreation.payload.data.id);
    assert.equal(secondCreation.response.headers.get('Idempotency-Replayed'), 'true');

    const conflictingReuse = await requestJson(baseUrl, '/api/v1/users', {
      method: 'POST',
      token,
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: {
        name: 'Different Payload',
        email: 'different.payload@example.com'
      }
    });

    assert.equal(conflictingReuse.response.status, 409);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});