import { DEFAULT_META, DEFAULT_PREFERENCES, DEFAULT_QUERY, STORAGE_KEYS } from './constants.js';
import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';
import { normalizeDensity, normalizeLimit, normalizeSortBy, normalizeSortOrder } from './utils.js';

function sanitizeQuery(query = {}) {
  return {
    search: typeof query.search === 'string' ? query.search.trim() : '',
    sortBy: normalizeSortBy(query.sortBy),
    sortOrder: normalizeSortOrder(query.sortOrder),
    page: Number.isInteger(query.page) && query.page > 0 ? query.page : 1,
    limit: normalizeLimit(query.limit)
  };
}

function sanitizePreferences(preferences = {}) {
  return {
    density: normalizeDensity(preferences.density)
  };
}

export function createState() {
  const storedQuery = loadJsonFromStorage(STORAGE_KEYS.filters, DEFAULT_QUERY);
  const storedPreferences = loadJsonFromStorage(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);

  const state = {
    users: [],
    meta: { ...DEFAULT_META },
    stats: {
      totalUsers: 0,
      topDomains: [],
      recentUsers: []
    },
    query: sanitizeQuery(storedQuery),
    preferences: sanitizePreferences(storedPreferences),
    editingUserId: null,
    pendingDeleteId: null,
    inFlightUsersRequest: 0
  };

  return {
    state,
    persistQuery() {
      saveJsonToStorage(STORAGE_KEYS.filters, state.query);
    },
    persistPreferences() {
      saveJsonToStorage(STORAGE_KEYS.preferences, state.preferences);
    }
  };
}

export function resetQuery(state) {
  state.query = { ...DEFAULT_QUERY };
}