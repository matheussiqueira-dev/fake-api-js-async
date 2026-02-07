import {
  DEFAULT_ACTIVE_VIEW,
  DEFAULT_AUDIT_META,
  DEFAULT_META,
  DEFAULT_PREFERENCES,
  DEFAULT_QUERY,
  STORAGE_KEYS
} from './constants.js';
import { loadJsonFromStorage, saveJsonToStorage } from './storage.js';
import {
  normalizeAutoRefreshInterval,
  normalizeDensity,
  normalizeLimit,
  normalizeSortBy,
  normalizeSortOrder,
  normalizeView
} from './utils.js';

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
    density: normalizeDensity(preferences.density),
    focusMode: preferences.focusMode === true,
    autoRefreshEnabled: preferences.autoRefreshEnabled === true,
    autoRefreshIntervalSec: normalizeAutoRefreshInterval(preferences.autoRefreshIntervalSec)
  };
}

function sanitizeSession(session = null) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  if (typeof session.token !== 'string' || !session.user || typeof session.user !== 'object') {
    return null;
  }

  return {
    token: session.token,
    user: {
      id: session.user.id,
      username: session.user.username,
      role: session.user.role,
      displayName: session.user.displayName
    }
  };
}

export function createState() {
  const storedQuery = loadJsonFromStorage(STORAGE_KEYS.filters, DEFAULT_QUERY);
  const storedPreferences = loadJsonFromStorage(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES);
  const storedSession = loadJsonFromStorage(STORAGE_KEYS.session, null);
  const storedIncludeDeleted = loadJsonFromStorage(STORAGE_KEYS.includeDeleted, false);
  const activeViewRaw = window.localStorage.getItem(STORAGE_KEYS.activeView) ?? DEFAULT_ACTIVE_VIEW;

  const state = {
    users: [],
    meta: { ...DEFAULT_META },
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      deletedUsers: 0,
      topDomains: [],
      recentUsers: []
    },
    metrics: {
      totalRequests: 0,
      averageLatencyMs: 0,
      statuses: {},
      routes: {}
    },
    auditLogs: [],
    auditMeta: { ...DEFAULT_AUDIT_META },
    query: sanitizeQuery(storedQuery),
    preferences: sanitizePreferences(storedPreferences),
    session: sanitizeSession(storedSession),
    includeDeleted: storedIncludeDeleted === true,
    activeView: normalizeView(activeViewRaw),
    editingUserId: null,
    pendingAction: null,
    inFlightUsersRequest: 0,
    isRefreshingAllData: false,
    lastSyncAt: null,
    auditSearchTerm: '',
    auditFilteredCount: 0
  };

  return {
    state,
    persistQuery() {
      saveJsonToStorage(STORAGE_KEYS.filters, state.query);
    },
    persistPreferences() {
      saveJsonToStorage(STORAGE_KEYS.preferences, state.preferences);
    },
    persistSession() {
      if (!state.session) {
        window.localStorage.removeItem(STORAGE_KEYS.session);
        return;
      }

      saveJsonToStorage(STORAGE_KEYS.session, state.session);
    },
    persistIncludeDeleted() {
      saveJsonToStorage(STORAGE_KEYS.includeDeleted, state.includeDeleted === true);
    },
    persistActiveView() {
      window.localStorage.setItem(STORAGE_KEYS.activeView, state.activeView);
    }
  };
}

export function resetQuery(state) {
  state.query = { ...DEFAULT_QUERY };
}

export function resetAuditPagination(state) {
  state.auditMeta = { ...DEFAULT_AUDIT_META };
}
