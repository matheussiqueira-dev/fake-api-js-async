const { UnauthorizedError } = require('../lib/errors');
const { validateLoginPayload } = require('../lib/validators');
const { hashPassword, verifyPassword } = require('../security/password-service');

class AuthService {
  constructor(options) {
    this.tokenService = options.tokenService;

    this.accounts = (options.accounts ?? []).map((account) => ({
      id: account.id,
      username: account.username,
      role: account.role,
      displayName: account.displayName,
      passwordHash: hashPassword(account.password)
    }));
  }

  login(payload) {
    const credentials = validateLoginPayload(payload);

    const account = this.accounts.find((item) => item.username === credentials.username);
    if (!account) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    const validPassword = verifyPassword(credentials.password, account.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    const token = this.tokenService.issueToken({
      userId: account.id,
      username: account.username,
      role: account.role
    });

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.tokenTtlSeconds,
      user: {
        id: account.id,
        username: account.username,
        role: account.role,
        displayName: account.displayName
      }
    };
  }

  authenticateAccessToken(token) {
    const payload = this.tokenService.verifyToken(token);
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
}

module.exports = {
  AuthService
};