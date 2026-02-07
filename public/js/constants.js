export const STORAGE_KEYS = Object.freeze({
  filters: 'fake_api_frontend_filters_v2',
  preferences: 'fake_api_frontend_preferences_v2'
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

export const DEFAULT_PREFERENCES = Object.freeze({
  density: 'comfortable'
});

export const MAX_EXPORT_LIMIT = 25;