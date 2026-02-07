import { MAX_EXPORT_LIMIT } from './constants.js';

async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message ?? 'Request failed.');
    error.statusCode = response.status;
    error.code = payload?.error?.code ?? 'REQUEST_FAILED';
    throw error;
  }

  return payload;
}

export function checkHealth() {
  return request('/api/health');
}

export function fetchUsers(query) {
  const params = new URLSearchParams({
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    page: String(query.page),
    limit: String(query.limit)
  });

  return request(`/api/users?${params.toString()}`);
}

export function fetchStats() {
  return request('/api/stats');
}

export function createUser(payload) {
  return request('/api/users', {
    method: 'POST',
    body: payload
  });
}

export function updateUser(userId, payload) {
  return request(`/api/users/${userId}`, {
    method: 'PUT',
    body: payload
  });
}

export function removeUser(userId) {
  return request(`/api/users/${userId}`, {
    method: 'DELETE'
  });
}

export async function fetchAllUsersForExport(query) {
  const allUsers = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const payload = await fetchUsers({
      ...query,
      page: currentPage,
      limit: MAX_EXPORT_LIMIT
    });

    allUsers.push(...payload.data);
    totalPages = payload.meta.totalPages;
    currentPage += 1;
  } while (currentPage <= totalPages);

  return allUsers;
}