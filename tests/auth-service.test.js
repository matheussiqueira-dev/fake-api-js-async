const test = require('node:test');
const assert = require('node:assert/strict');

const { UnauthorizedError } = require('../src/lib/errors');
const { TokenService } = require('../src/security/token-service');
const { AuthService } = require('../src/services/auth-service');
const { LoginAttemptService, SessionService } = require('../src/services/session-service');

function createAuthService() {
  const tokenService = new TokenService({
    secret: 'unit-test-secret',
    issuer: 'unit-test',
    audience: 'unit-test',
    tokenTtlSeconds: 3600,
    refreshTokenTtlSeconds: 7200
  });

  return new AuthService({
    tokenService,
    sessionService: new SessionService({
      tokenService,
      maxSessionsPerUser: 3
    }),
    loginAttemptService: new LoginAttemptService({
      maxFailedAttempts: 2,
      failedWindowMs: 10_000,
      lockDurationMs: 60_000
    }),
    accounts: [
      {
        id: 1,
        username: 'admin',
        password: 'Admin@123',
        role: 'admin',
        displayName: 'Admin'
      }
    ]
  });
}

test('AuthService authenticates valid credentials and returns access+refresh tokens', () => {
  const authService = createAuthService();

  const result = authService.login({ username: 'admin', password: 'Admin@123' }, { ip: '127.0.0.1' });
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.role, 'admin');
  assert.ok(typeof result.accessToken === 'string' && result.accessToken.split('.').length === 3);
  assert.ok(typeof result.refreshToken === 'string' && result.refreshToken.split('.').length === 3);

  const profile = authService.authenticateAccessToken(result.accessToken);
  assert.equal(profile.username, 'admin');
  assert.equal(profile.role, 'admin');
});

test('AuthService refresh rotates tokens and logout revokes refresh session', () => {
  const authService = createAuthService();

  const loginResult = authService.login({ username: 'admin', password: 'Admin@123' }, { ip: '127.0.0.1' });
  const refreshed = authService.refresh(loginResult.refreshToken, { ip: '127.0.0.1' });

  assert.notEqual(refreshed.accessToken, loginResult.accessToken);
  assert.notEqual(refreshed.refreshToken, loginResult.refreshToken);

  const logoutResult = authService.logout(refreshed.refreshToken);
  assert.equal(logoutResult.revoked, true);

  assert.throws(
    () => authService.refresh(refreshed.refreshToken, { ip: '127.0.0.1' }),
    UnauthorizedError
  );
});

test('AuthService blocks login after repeated failed attempts', () => {
  const authService = createAuthService();

  assert.throws(
    () => authService.login({ username: 'admin', password: 'wrong-password' }, { ip: '127.0.0.1' }),
    UnauthorizedError
  );

  assert.throws(
    () => authService.login({ username: 'admin', password: 'wrong-password' }, { ip: '127.0.0.1' }),
    UnauthorizedError
  );

  assert.throws(
    () => authService.login({ username: 'admin', password: 'Admin@123' }, { ip: '127.0.0.1' }),
    UnauthorizedError
  );
});