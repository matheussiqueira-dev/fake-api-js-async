const { UnauthorizedError } = require('../lib/errors');
const { validateLoginPayload } = require('../lib/validators');
const { hashPassword, verifyPassword } = require('../security/password-service');

class AuthService {
  constructor(options) {
    this.tokenService = options.tokenService;
    this.sessionService = options.sessionService;
    this.loginAttemptService = options.loginAttemptService;

    this.accounts = (options.accounts ?? []).map((account) => ({
      id: account.id,
      username: account.username,
      role: account.role,
      displayName: account.displayName,
      passwordHash: hashPassword(account.password)
    }));
  }

  login(payload, metadata = {}) {
    const credentials = validateLoginPayload(payload);
    const attemptKey = `${credentials.username}:${metadata.ip ?? 'unknown'}`;

    this.loginAttemptService?.assertCanAttempt(attemptKey);

    const account = this.accounts.find((item) => item.username === credentials.username);
    if (!account) {
      this.loginAttemptService?.registerFailure(attemptKey);
      throw new UnauthorizedError('Invalid username or password.');
    }

    const validPassword = verifyPassword(credentials.password, account.passwordHash);
    if (!validPassword) {
      this.loginAttemptService?.registerFailure(attemptKey);
      throw new UnauthorizedError('Invalid username or password.');
    }

    this.loginAttemptService?.reset(attemptKey);

    const bundle = this.sessionService.issueSessionTokenBundle({
      id: account.id,
      username: account.username,
      role: account.role
    }, metadata);

    return {
      accessToken: bundle.accessToken,
      refreshToken: bundle.refreshToken,
      tokenType: 'Bearer',
      expiresIn: bundle.accessTokenExpiresIn,
      refreshExpiresIn: bundle.refreshTokenExpiresIn,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
        displayName: account.displayName
      }
    };
  }

  refresh(refreshToken, metadata = {}) {
    const bundle = this.sessionService.refreshSession(refreshToken, metadata);
    const payload = this.tokenService.verifyAccessToken(bundle.accessToken);

    const account = this.accounts.find((item) => item.id === Number.parseInt(payload.sub, 10));
    if (!account) {
      throw new UnauthorizedError('User account not found for this token.');
    }

    return {
      accessToken: bundle.accessToken,
      refreshToken: bundle.refreshToken,
      tokenType: 'Bearer',
      expiresIn: bundle.accessTokenExpiresIn,
      refreshExpiresIn: bundle.refreshTokenExpiresIn,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
        displayName: account.displayName
      }
    };
  }

  logout(refreshToken) {
    return this.sessionService.revokeRefreshToken(refreshToken, 'logout');
  }

  authenticateAccessToken(token) {
    const payload = this.tokenService.verifyAccessToken(token);
    const account = this.accounts.find((item) => item.id === Number.parseInt(payload.sub, 10));

    if (!account) {
      throw new UnauthorizedError('User account not found for this token.');
    }

    return {
      id: account.id,
      username: account.username,
      role: account.role,
      displayName: account.displayName,
      tokenPayload: payload
    };
  }

  getSessionStats() {
    return this.sessionService.getStats();
  }
}

module.exports = {
  AuthService
};