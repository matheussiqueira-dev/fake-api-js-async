const crypto = require('node:crypto');

const { APP_CONFIG } = require('../config');
const { UnauthorizedError } = require('../lib/errors');

class SessionService {
  constructor(options = {}) {
    this.tokenService = options.tokenService;
    this.maxSessionsPerUser = options.maxSessionsPerUser ?? APP_CONFIG.auth.maxSessionsPerUser;
    this.sessionsById = new Map();
  }

  issueSessionTokenBundle(user, metadata = {}) {
    this.#purgeExpiredSessions();

    const accessTokenResult = this.tokenService.issueAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    const refreshTokenResult = this.tokenService.issueRefreshToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    this.sessionsById.set(refreshTokenResult.payload.jti, {
      id: refreshTokenResult.payload.jti,
      userId: user.id,
      username: user.username,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAtEpochSeconds: refreshTokenResult.payload.exp,
      revokedAt: null,
      revokedReason: null,
      metadata: {
        ip: metadata.ip ?? null,
        userAgent: metadata.userAgent ?? null
      }
    });

    this.#enforceMaxSessions(user.id);

    return {
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      accessTokenExpiresIn: this.tokenService.tokenTtlSeconds,
      refreshTokenExpiresIn: this.tokenService.refreshTokenTtlSeconds
    };
  }

  refreshSession(refreshToken, metadata = {}) {
    this.#purgeExpiredSessions();

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const session = this.sessionsById.get(payload.jti);

    if (!session || session.revokedAt) {
      throw new UnauthorizedError('Refresh session is invalid or revoked.');
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    if (session.expiresAtEpochSeconds <= nowEpoch) {
      session.revokedAt = new Date().toISOString();
      session.revokedReason = 'expired';
      throw new UnauthorizedError('Refresh session expired.');
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = 'rotated';

    return this.issueSessionTokenBundle({
      id: session.userId,
      username: session.username,
      role: session.role
    }, metadata);
  }

  revokeRefreshToken(refreshToken, reason = 'logout') {
    this.#purgeExpiredSessions();

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const session = this.sessionsById.get(payload.jti);

    if (!session) {
      return {
        revoked: false,
        reason: 'session_not_found',
        username: payload.username ?? null,
        userId: payload.sub ? Number.parseInt(payload.sub, 10) : null
      };
    }

    if (session.revokedAt) {
      return {
        revoked: false,
        reason: 'already_revoked',
        username: session.username,
        userId: session.userId
      };
    }

    session.revokedAt = new Date().toISOString();
    session.revokedReason = reason;

    return {
      revoked: true,
      reason,
      username: session.username,
      userId: session.userId
    };
  }

  getActiveSessionsForUser(userId) {
    this.#purgeExpiredSessions();

    return [...this.sessionsById.values()].filter((session) => session.userId === userId && !session.revokedAt);
  }

  getStats() {
    this.#purgeExpiredSessions();

    const activeSessions = [...this.sessionsById.values()].filter((session) => !session.revokedAt);

    return {
      totalSessions: this.sessionsById.size,
      activeSessions: activeSessions.length,
      revokedSessions: this.sessionsById.size - activeSessions.length
    };
  }

  #enforceMaxSessions(userId) {
    const activeSessions = [...this.sessionsById.values()]
      .filter((session) => session.userId === userId && !session.revokedAt)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

    while (activeSessions.length > this.maxSessionsPerUser) {
      const oldest = activeSessions.shift();
      if (!oldest) {
        break;
      }

      oldest.revokedAt = new Date().toISOString();
      oldest.revokedReason = 'session_limit_exceeded';
    }
  }

  #purgeExpiredSessions() {
    const nowEpoch = Math.floor(Date.now() / 1000);

    for (const [sessionId, session] of this.sessionsById.entries()) {
      if (session.expiresAtEpochSeconds <= nowEpoch && session.revokedAt) {
        this.sessionsById.delete(sessionId);
        continue;
      }

      if (session.expiresAtEpochSeconds <= nowEpoch && !session.revokedAt) {
        session.revokedAt = new Date().toISOString();
        session.revokedReason = 'expired';
      }
    }
  }
}

class LoginAttemptService {
  constructor(options = {}) {
    this.maxFailedAttempts = options.maxFailedAttempts ?? APP_CONFIG.auth.maxFailedLoginAttempts;
    this.failedWindowMs = options.failedWindowMs ?? APP_CONFIG.auth.failedLoginWindowMs;
    this.lockDurationMs = options.lockDurationMs ?? APP_CONFIG.auth.loginLockDurationMs;
    this.store = new Map();
  }

  assertCanAttempt(identifier) {
    const key = this.#normalizeKey(identifier);
    const entry = this.store.get(key);

    if (!entry) {
      return;
    }

    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
      throw new UnauthorizedError('Account temporarily locked due to repeated failed login attempts.');
    }

    if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
      this.store.delete(key);
    }
  }

  registerFailure(identifier) {
    const key = this.#normalizeKey(identifier);
    const now = Date.now();

    const entry = this.store.get(key) ?? {
      firstFailureAt: now,
      failedCount: 0,
      lockedUntil: null
    };

    if (now - entry.firstFailureAt > this.failedWindowMs) {
      entry.firstFailureAt = now;
      entry.failedCount = 0;
      entry.lockedUntil = null;
    }

    entry.failedCount += 1;

    if (entry.failedCount >= this.maxFailedAttempts) {
      entry.lockedUntil = now + this.lockDurationMs;
      entry.failedCount = 0;
    }

    this.store.set(key, entry);
  }

  reset(identifier) {
    const key = this.#normalizeKey(identifier);
    this.store.delete(key);
  }

  #normalizeKey(identifier) {
    return crypto.createHash('sha256').update(String(identifier ?? 'unknown')).digest('hex');
  }
}

module.exports = {
  SessionService,
  LoginAttemptService
};
