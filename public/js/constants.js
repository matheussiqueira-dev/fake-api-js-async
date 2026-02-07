export const STORAGE_KEYS = Object.freeze({
  filters: 'fake_api_frontend_filters_v3',
  preferences: 'fake_api_frontend_preferences_v3',
  session: 'fake_api_frontend_session_v3',
  activeView: 'fake_api_frontend_active_view_v3',
  includeDeleted: 'fake_api_frontend_include_deleted_v3'
});

export const DEFAULT_QUERY = Object.freeze({
  search: '',
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 6
});

export const DEFAULT_META = Object.freeze({
  page: 1,
  totalPages: 1,
  totalItems: 0,
  limit: 6,
  hasPreviousPage: false,
  hasNextPage: false
});

export const DEFAULT_AUDIT_META = Object.freeze({
  page: 1,
  totalPages: 1,
  totalItems: 0,
  limit: 10,
  hasPreviousPage: false,
  hasNextPage: false
});

export const DEFAULT_PREFERENCES = Object.freeze({
  density: 'comfortable'
});

export const DEFAULT_ACTIVE_VIEW = 'operations';

export const ROLE_PERMISSIONS = Object.freeze({
  viewer: Object.freeze({
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canRestore: false,
    canReadAudit: false,
    canReadMetrics: false,
    canToggleDeleted: false
  }),
  editor: Object.freeze({
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canRestore: false,
    canReadAudit: false,
    canReadMetrics: false,
    canToggleDeleted: false
  }),
  admin: Object.freeze({
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canRestore: true,
    canReadAudit: true,
    canReadMetrics: true,
    canToggleDeleted: true
  })
});

export const MAX_EXPORT_LIMIT = 25;