const { APP_CONFIG } = require('../config');
const {
  ConflictError,
  NotFoundError,
  ValidationError
} = require('../lib/errors');
const {
  validateBulkUserPayload,
  validateId,
  validateListQuery,
  validateUserPayload
} = require('../lib/validators');

class UserService {
  constructor(options = {}) {
    this.delayMs = Number.isFinite(options.delayMs) ? Math.max(0, options.delayMs) : APP_CONFIG.defaultDelayMs;
    this.failRate = Number.isFinite(options.failRate) ? Math.max(0, Math.min(1, options.failRate)) : APP_CONFIG.defaultFailRate;
    this.pageSize = Number.isFinite(options.pageSize) ? Math.max(1, options.pageSize) : APP_CONFIG.defaultPageSize;

    this.userStore = new Map();

    const seedUsers = Array.isArray(options.seedUsers) ? options.seedUsers : [];
    for (const item of seedUsers) {
      const normalized = this.#normalizeSeedUser(item);
      this.userStore.set(normalized.id, normalized);
    }

    const maxId = [...this.userStore.keys()].reduce((acc, id) => Math.max(acc, id), 0);
    this.nextId = maxId + 1;
  }

  async listUsers(query = {}, options = {}) {
    await this.#simulateLatency();

    const parsed = validateListQuery(query, {
      page: 1,
      limit: this.pageSize,
      maxLimit: APP_CONFIG.maxPageSize
    });

    const includeDeleted = options.includeDeleted === true || parsed.includeDeleted === true;

    const filtered = this.#getUsersArray().filter((user) => {
      if (!includeDeleted && user.deletedAt) {
        return false;
      }

      if (!parsed.search) {
        return true;
      }

      const haystack = `${user.name} ${user.email}`.toLowerCase();
      return haystack.includes(parsed.search.toLowerCase());
    });

    const sorted = filtered.slice().sort((left, right) => {
      const leftValue = left[parsed.sortBy] ?? '';
      const rightValue = right[parsed.sortBy] ?? '';

      if (leftValue < rightValue) {
        return parsed.sortOrder === 'asc' ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return parsed.sortOrder === 'asc' ? 1 : -1;
      }

      return 0;
    });

    const totalItems = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / parsed.limit));
    const page = Math.min(parsed.page, totalPages);
    const start = (page - 1) * parsed.limit;
    const data = sorted.slice(start, start + parsed.limit).map((user) => this.#toPublicUser(user));

    return {
      data,
      meta: {
        totalItems,
        totalPages,
        page,
        limit: parsed.limit,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        includeDeleted
      }
    };
  }

  async getUserById(id, options = {}) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const user = this.#findUserById(userId);

    if (!options.includeDeleted && user.deletedAt) {
      throw new NotFoundError(`User with id ${userId} was not found.`);
    }

    return this.#toPublicUser(user);
  }

  async createUser(payload) {
    await this.#simulateLatency();

    const data = validateUserPayload(payload);
    this.#assertUniqueEmail(data.email);

    const now = new Date().toISOString();
    const newUser = {
      id: this.nextId,
      name: data.name,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    this.userStore.set(newUser.id, newUser);
    this.nextId += 1;

    return this.#toPublicUser(newUser);
  }

  async bulkCreateUsers(payload, options = {}) {
    await this.#simulateLatency();

    const skipDuplicates = options.skipDuplicates !== false;
    const input = validateBulkUserPayload(payload);

    const created = [];
    const skipped = [];

    for (const userData of input) {
      try {
        this.#assertUniqueEmail(userData.email);

        const now = new Date().toISOString();
        const newUser = {
          id: this.nextId,
          name: userData.name,
          email: userData.email,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        };

        this.userStore.set(newUser.id, newUser);
        this.nextId += 1;
        created.push(this.#toPublicUser(newUser));
      } catch (error) {
        if (!skipDuplicates || error.code !== 'CONFLICT') {
          throw error;
        }

        skipped.push({
          reason: error.message,
          email: userData.email
        });
      }
    }

    return {
      created,
      skipped,
      summary: {
        requested: input.length,
        created: created.length,
        skipped: skipped.length
      }
    };
  }

  async updateUser(id, payload) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const data = validateUserPayload(payload, { partial: true });
    const user = this.#findUserById(userId);

    if (user.deletedAt) {
      throw new ValidationError('Cannot update a deleted user. Restore it first.');
    }

    if (Object.prototype.hasOwnProperty.call(data, 'email') && data.email !== user.email) {
      this.#assertUniqueEmail(data.email, userId);
    }

    Object.assign(user, data, { updatedAt: new Date().toISOString() });

    return this.#toPublicUser(user);
  }

  async deleteUser(id) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const user = this.#findUserById(userId);

    if (user.deletedAt) {
      return {
        message: `User ${user.name} is already deleted.`,
        deletedUser: this.#toPublicUser(user)
      };
    }

    const now = new Date().toISOString();
    user.deletedAt = now;
    user.updatedAt = now;

    return {
      message: `User ${user.name} deleted successfully.`,
      deletedUser: this.#toPublicUser(user)
    };
  }

  async restoreUser(id) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const user = this.#findUserById(userId);

    if (!user.deletedAt) {
      return this.#toPublicUser(user);
    }

    user.deletedAt = null;
    user.updatedAt = new Date().toISOString();

    return this.#toPublicUser(user);
  }

  async getStats(options = {}) {
    await this.#simulateLatency();

    const includeDeleted = options.includeDeleted === true;
    const users = this.#getUsersArray().filter((user) => includeDeleted || !user.deletedAt);

    const totalUsers = users.length;
    const activeUsers = users.filter((user) => !user.deletedAt).length;
    const deletedUsers = users.filter((user) => user.deletedAt).length;

    const domainCounter = new Map();
    for (const user of users) {
      const domain = user.email.split('@')[1] ?? 'unknown';
      domainCounter.set(domain, (domainCounter.get(domain) ?? 0) + 1);
    }

    const topDomains = [...domainCounter.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    const recentUsers = users
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 5)
      .map((user) => this.#toPublicUser(user));

    return {
      totalUsers,
      activeUsers,
      deletedUsers,
      topDomains,
      recentUsers
    };
  }

  #getUsersArray() {
    return [...this.userStore.values()];
  }

  #normalizeSeedUser(user) {
    const id = validateId(user.id);
    const name = String(user.name ?? '').trim();
    const email = String(user.email ?? '').trim().toLowerCase();

    const now = new Date().toISOString();
    return {
      id,
      name,
      email,
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? user.createdAt ?? now,
      deletedAt: user.deletedAt ?? null
    };
  }

  #findUserById(id) {
    const user = this.userStore.get(id);

    if (!user) {
      throw new NotFoundError(`User with id ${id} was not found.`);
    }

    return user;
  }

  #toPublicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt
    };
  }

  #assertUniqueEmail(email, userIdToIgnore = null) {
    const emailInUse = this.#getUsersArray()
      .some((user) => user.email === email && user.id !== userIdToIgnore && !user.deletedAt);

    if (emailInUse) {
      throw new ConflictError(`Email ${email} is already in use.`);
    }
  }

  async #simulateLatency() {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.failRate > 0 && Math.random() < this.failRate) {
      const error = new Error('Temporary unavailable service. Please retry.');
      error.statusCode = 503;
      error.code = 'UNAVAILABLE';
      throw error;
    }
  }
}

module.exports = {
  UserService
};