const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../server/create-server');
const { APP_CONFIG } = require('../src/config');
const { seedUsers } = require('../src/data/seed-users');
const { MetricsRegistry } = require('../src/monitoring/metrics-registry');
const { RateLimiter } = require('../src/security/rate-limiter');
const { TokenService } = require('../src/security/token-service');
const { AuthService } = require('../src/services/auth-service');
const { AuditService } = require('../src/services/audit-service');
const { UserService } = require('../src/services/user-service');

function createTestContext() {
  const authConfig = {
    ...APP_CONFIG.auth,
    secret: 'integration-secret',
    tokenTtlSeconds: 3600,
    users: [
      { id: 1, username: 'admin', password: 'Admin@123', role: 'admin', displayName: 'Admin' },
      { id: 2, username: 'viewer', password: 'Viewer@123', role: 'viewer', displayName: 'Viewer' }
    ]
  };

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
      tokenService: new TokenService(authConfig),
      accounts: authConfig.users
    }),
    auditService: new AuditService({ maxEntries: 200 }),
    metricsRegistry: new MetricsRegistry(),
    rateLimiter: new RateLimiter({ windowMs: 60_000, maxRequests: 1_000 }),
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
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json();
  return { response, payload };
}

test('v1 API enforces authentication and role-based access', async () => {
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
    const adminToken = adminLogin.payload.data.accessToken;

    const listUsers = await requestJson(baseUrl, '/api/v1/users', {
      token: adminToken
    });

    assert.equal(listUsers.response.status, 200);
    assert.ok(Array.isArray(listUsers.payload.data));

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

    const deletedByAdmin = await requestJson(baseUrl, '/api/v1/users/1', {
      method: 'DELETE',
      token: adminToken
    });

    assert.equal(deletedByAdmin.response.status, 200);

    const restoredByAdmin = await requestJson(baseUrl, '/api/v1/users/1/restore', {
      method: 'POST',
      token: adminToken
    });

    assert.equal(restoredByAdmin.response.status, 200);

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