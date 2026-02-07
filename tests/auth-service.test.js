const test = require('node:test');
const assert = require('node:assert/strict');

const { UnauthorizedError } = require('../src/lib/errors');
const { TokenService } = require('../src/security/token-service');
const { AuthService } = require('../src/services/auth-service');

test('AuthService authenticates valid credentials and returns JWT token', () => {
  const authService = new AuthService({
    tokenService: new TokenService({
      secret: 'unit-test-secret',
      issuer: 'unit-test',
      audience: 'unit-test',
      tokenTtlSeconds: 3600
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

  const result = authService.login({ username: 'admin', password: 'Admin@123' });
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.role, 'admin');
  assert.ok(typeof result.accessToken === 'string' && result.accessToken.split('.').length === 3);

  const profile = authService.authenticateAccessToken(result.accessToken);
  assert.equal(profile.username, 'admin');
  assert.equal(profile.role, 'admin');
});

test('AuthService rejects invalid credentials', () => {
  const authService = new AuthService({
    tokenService: new TokenService({
      secret: 'unit-test-secret',
      issuer: 'unit-test',
      audience: 'unit-test',
      tokenTtlSeconds: 3600
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

  assert.throws(
    () => authService.login({ username: 'admin', password: 'wrong-password' }),
    UnauthorizedError
  );
});