const crypto = require('node:crypto');

const { UnauthorizedError } = require('../lib/errors');

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padding = normalized.length % 4;
  const padded = normalized + (padding === 0 ? '' : '='.repeat(4 - padding));
  return Buffer.from(padded, 'base64').toString('utf-8');
}

class TokenService {
  constructor(options) {
    this.secret = options.secret;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.tokenTtlSeconds = options.tokenTtlSeconds;
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds;
  }

  issueAccessToken(payload) {
    return this.#issueToken(payload, {
      tokenType: 'access',
      ttlSeconds: this.tokenTtlSeconds
    });
  }

  issueRefreshToken(payload) {
    return this.#issueToken(payload, {
      tokenType: 'refresh',
      ttlSeconds: this.refreshTokenTtlSeconds
    });
  }

  verifyAccessToken(token) {
    return this.verifyToken(token, { expectedType: 'access' });
  }

  verifyRefreshToken(token) {
    return this.verifyToken(token, { expectedType: 'refresh' });
  }

  verifyToken(token, options = {}) {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Invalid access token.');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Invalid access token format.');
    }

    const [encodedHeader, encodedBody, providedSignature] = parts;
    const expectedSignature = this.#createSignature(`${encodedHeader}.${encodedBody}`);

    if (!safeCompare(providedSignature, expectedSignature)) {
      throw new UnauthorizedError('Invalid access token signature.');
    }

    let payload = null;
    try {
      payload = JSON.parse(base64UrlDecode(encodedBody));
    } catch {
      throw new UnauthorizedError('Invalid access token payload.');
    }
    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== this.issuer || payload.aud !== this.audience) {
      throw new UnauthorizedError('Token issuer or audience is invalid.');
    }

    if (payload.exp <= now) {
      throw new UnauthorizedError('Access token expired.');
    }

    if (payload.iat > now + 10) {
      throw new UnauthorizedError('Token issue time is invalid.');
    }

    if (options.expectedType && payload.tokenType !== options.expectedType) {
      throw new UnauthorizedError('Token type is invalid for this operation.');
    }

    return payload;
  }

  #issueToken(payload, options) {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const body = {
      sub: String(payload.userId),
      username: payload.username,
      role: payload.role,
      tokenType: options.tokenType,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + options.ttlSeconds,
      iss: this.issuer,
      aud: this.audience
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedBody = base64UrlEncode(JSON.stringify(body));
    const signature = this.#createSignature(`${encodedHeader}.${encodedBody}`);

    return {
      token: `${encodedHeader}.${encodedBody}.${signature}`,
      payload: body
    };
  }

  #createSignature(content) {
    return crypto
      .createHmac('sha256', this.secret)
      .update(content)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  TokenService
};
