import { MAX_EXPORT_LIMIT } from './constants.js';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
  };

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Request failed.');
    error.statusCode = response.status;
    error.code = payload?.error?.code ?? 'REQUEST_FAILED';
    error.details = payload?.error?.details ?? null;
    throw error;
  }

  return payload;
}

export async function checkHealth() {
  const payload = await request('/api/v1/health');
  return payload.data;
}

export async function login(payload) {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    body: payload
  });

  return response.data;
}

export async function getCurrentUser(token) {
  const response = await request('/api/v1/auth/me', { token });
  return response.data;
}

export async function fetchUsers(query, token) {
  const params = new URLSearchParams({
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: String(query.page),
    limit: String(query.limit),
    includeDeleted: String(query.includeDeleted === true)
  });

  const response = await request(`/api/v1/users?${params.toString()}`, { token });

  return {
    data: response.data,
    meta: response.meta
  };
}

export async function fetchStats(token, includeDeleted = false) {
  const params = new URLSearchParams({
    includeDeleted: String(includeDeleted)
  });

  const response = await request(`/api/v1/stats?${params.toString()}`, { token });
  return response.data;
}

export async function createUser(payload, token) {
  const response = await request('/api/v1/users', {
    method: 'POST',
    body: payload,
    token
  });

  return response.data;
}

export async function updateUser(userId, payload, token) {
  const response = await request(`/api/v1/users/${userId}`, {
    method: 'PUT',
    body: payload,
    token
  });

  return response.data;
}

export async function removeUser(userId, token) {
  const response = await request(`/api/v1/users/${userId}`, {
    method: 'DELETE',
    token
  });

  return response.data;
}

export async function restoreUser(userId, token) {
  const response = await request(`/api/v1/users/${userId}/restore`, {
    method: 'POST',
    token
  });

  return response.data;
}

export async function fetchAuditLogs(query, token) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit)
  });

  const response = await request(`/api/v1/audit-logs?${params.toString()}`, { token });

  return {
    data: response.data,
    meta: response.meta
  };
}

export async function fetchMetrics(token) {
  const response = await request('/api/v1/metrics', { token });
  return response.data;
}

export async function fetchAllUsersForExport(query, token) {
  const allUsers = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const payload = await fetchUsers({
      ...query,
      page: currentPage,
      limit: MAX_EXPORT_LIMIT
    }, token);

    allUsers.push(...payload.data);
    totalPages = payload.meta.totalPages;
    currentPage += 1;
  } while (currentPage <= totalPages);

  return allUsers;
}