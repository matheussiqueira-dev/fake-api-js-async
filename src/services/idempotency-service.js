const crypto = require('node:crypto');

const { ConflictError } = require('../lib/errors');

class IdempotencyService {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? 300_000;
    this.maxEntries = options.maxEntries ?? 2_000;
    this.entries = new Map();
  }

  buildFingerprint(input) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
  }

  consume(key, fingerprint) {
    this.#purgeExpiredEntries();

    const entry = this.entries.get(key);
    if (!entry) {
      return {
        hit: false,
        replay: false,
        response: null
      };
    }

    if (entry.fingerprint !== fingerprint) {
      throw new ConflictError('Idempotency key already used with a different request payload.');
    }

    return {
      hit: true,
      replay: true,
      response: entry.response
    };
  }

  storeResponse(key, fingerprint, responsePayload) {
    this.#purgeExpiredEntries();

    if (this.entries.size >= this.maxEntries) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey) {
        this.entries.delete(firstKey);
      }
    }

    this.entries.set(key, {
      fingerprint,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
      response: responsePayload
    });
  }

  #purgeExpiredEntries() {
    const now = Date.now();

    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

module.exports = {
  IdempotencyService
};