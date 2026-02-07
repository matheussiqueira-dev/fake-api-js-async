const { APP_CONFIG } = require('../config');
const { ConflictError, NotFoundError } = require('../lib/errors');
const { validateId, validateListQuery, validateUserPayload } = require('../lib/validators');

class UserService {
  constructor(options = {}) {
    this.delayMs = Number.isFinite(options.delayMs) ? Math.max(0, options.delayMs) : APP_CONFIG.defaultDelayMs;
    this.failRate = Number.isFinite(options.failRate) ? Math.max(0, Math.min(1, options.failRate)) : APP_CONFIG.defaultFailRate;
    this.pageSize = Number.isFinite(options.pageSize) ? Math.max(1, options.pageSize) : APP_CONFIG.defaultPageSize;

    const seedUsers = Array.isArray(options.seedUsers) ? options.seedUsers : [];
    this.users = seedUsers.map((user) => ({ ...user, email: String(user.email).toLowerCase() }));
    const maxId = this.users.reduce((acc, user) => Math.max(acc, user.id), 0);
    this.nextId = maxId + 1;
  }

  async listUsers(query = {}) {
    await this.#simulateLatency();

    const parsed = validateListQuery(query, {
      page: 1,
      limit: this.pageSize,
      maxLimit: APP_CONFIG.maxPageSize
    });

    const filtered = this.users.filter((user) => {
      if (!parsed.search) {
        return true;
      }

      const haystack = `${user.name} ${user.email}`.toLowerCase();
      return haystack.includes(parsed.search.toLowerCase());
    });

    const sorted = filtered.slice().sort((left, right) => {
      const leftValue = left[parsed.sortBy];
      const rightValue = right[parsed.sortBy];

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
    const data = sorted.slice(start, start + parsed.limit).map((user) => ({ ...user }));

    return {
      data,
      meta: {
        totalItems,
        totalPages,
        page,
        limit: parsed.limit,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      }
    };
  }

  async createUser(payload) {
    await this.#simulateLatency();

    const data = validateUserPayload(payload);
    this.#assertUniqueEmail(data.email);

    const newUser = {
      id: this.nextId,
      name: data.name,
      email: data.email,
      createdAt: new Date().toISOString()
    };

    this.users.push(newUser);
    this.nextId += 1;

    return { ...newUser };
  }

  async updateUser(id, payload) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const data = validateUserPayload(payload, { partial: true });
    const user = this.#findUserById(userId);

    if (Object.prototype.hasOwnProperty.call(data, 'email') && data.email !== user.email) {
      this.#assertUniqueEmail(data.email, userId);
    }

    Object.assign(user, data);

    return { ...user };
  }

  async deleteUser(id) {
    await this.#simulateLatency();

    const userId = validateId(id);
    const index = this.users.findIndex((user) => user.id === userId);

    if (index < 0) {
      throw new NotFoundError(`User with id ${userId} was not found.`);
    }

    const [removed] = this.users.splice(index, 1);

    return {
      message: `User ${removed.name} deleted successfully.`,
      deletedUser: { ...removed }
    };
  }

  async getStats() {
    await this.#simulateLatency();

    const totalUsers = this.users.length;
    const domainCounter = new Map();

    for (const user of this.users) {
      const domain = user.email.split('@')[1] ?? 'unknown';
      domainCounter.set(domain, (domainCounter.get(domain) ?? 0) + 1);
    }

    const topDomains = [...domainCounter.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([domain, count]) => ({ domain, count }));

    const recentUsers = this.users
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 3)
      .map((user) => ({ ...user }));

    return {
      totalUsers,
      topDomains,
      recentUsers
    };
  }

  #findUserById(id) {
    const user = this.users.find((item) => item.id === id);

    if (!user) {
      throw new NotFoundError(`User with id ${id} was not found.`);
    }

    return user;
  }

  #assertUniqueEmail(email, userIdToIgnore = null) {
    const emailInUse = this.users.some((user) => user.email === email && user.id !== userIdToIgnore);

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