const { APP_CONFIG } = require('../config');

class AuditService {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries ?? APP_CONFIG.maxAuditEntries;
    this.entries = [];
    this.nextId = 1;
  }

  record(event) {
    const entry = {
      id: this.nextId,
      createdAt: new Date().toISOString(),
      action: event.action,
      actor: event.actor ?? 'system',
      status: event.status ?? 'success',
      requestId: event.requestId ?? null,
      metadata: event.metadata ?? null
    };

    this.entries.unshift(entry);
    this.nextId += 1;

    if (this.entries.length > this.maxEntries) {
      this.entries.pop();
    }

    return entry;
  }

  list(query = {}) {
    const page = Number.isInteger(query.page) && query.page > 0 ? query.page : 1;
    const limit = Number.isInteger(query.limit) && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const totalItems = this.entries.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;

    return {
      data: this.entries.slice(start, start + limit),
      meta: {
        totalItems,
        totalPages,
        page: safePage,
        limit,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages
      }
    };
  }
}

module.exports = {
  AuditService
};