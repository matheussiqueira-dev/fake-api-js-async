const { APP_CONFIG } = require('../config');

class AuditService {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries ?? APP_CONFIG.maxAuditEntries;
    this.maxPageSize = options.maxPageSize ?? 100;
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
    const limit = Number.isInteger(query.limit) && query.limit > 0
      ? Math.min(query.limit, this.maxPageSize)
      : 20;

    const search = String(query.search ?? '').trim().toLowerCase();
    const action = String(query.action ?? '').trim().toLowerCase();
    const actor = String(query.actor ?? '').trim().toLowerCase();
    const status = String(query.status ?? '').trim().toLowerCase();
    const requestId = String(query.requestId ?? '').trim().toLowerCase();
    const since = query.since ? Date.parse(query.since) : null;
    const until = query.until ? Date.parse(query.until) : null;

    const filtered = this.entries.filter((entry) => {
      if (action && entry.action.toLowerCase() !== action) {
        return false;
      }

      if (actor && entry.actor.toLowerCase() !== actor) {
        return false;
      }

      if (status && entry.status.toLowerCase() !== status) {
        return false;
      }

      if (requestId && String(entry.requestId ?? '').toLowerCase() !== requestId) {
        return false;
      }

      if (since && Date.parse(entry.createdAt) < since) {
        return false;
      }

      if (until && Date.parse(entry.createdAt) > until) {
        return false;
      }

      if (search) {
        const metadataText = entry.metadata ? JSON.stringify(entry.metadata) : '';
        const haystack = `${entry.action} ${entry.actor} ${entry.status} ${entry.requestId ?? ''} ${metadataText}`
          .toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
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
