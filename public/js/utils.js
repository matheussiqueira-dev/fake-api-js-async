export function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function debounce(callback, waitMs = 250) {
  let timerId = null;

  return (...args) => {
    if (timerId) {
      window.clearTimeout(timerId);
    }

    timerId = window.setTimeout(() => {
      callback(...args);
    }, waitMs);
  };
}

export function clampPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function normalizeDensity(value) {
  return value === 'compact' ? 'compact' : 'comfortable';
}

export function normalizeAutoRefreshInterval(value) {
  const allowed = new Set([15, 30, 60, 120]);
  const normalized = clampPositiveInt(value, 30);
  return allowed.has(normalized) ? normalized : 30;
}

export function normalizeSortBy(value) {
  const allowed = new Set(['id', 'name', 'email', 'createdAt', 'updatedAt']);
  return allowed.has(value) ? value : 'name';
}

export function normalizeSortOrder(value) {
  return value === 'desc' ? 'desc' : 'asc';
}

export function normalizeLimit(value) {
  const allowed = new Set([4, 6, 10]);
  const normalized = clampPositiveInt(value, 6);
  return allowed.has(normalized) ? normalized : 6;
}

export function normalizeView(value) {
  return value === 'audit' ? 'audit' : 'operations';
}

export function toCsv(rows) {
  const header = ['id', 'name', 'email', 'createdAt', 'updatedAt', 'deletedAt'];
  const lines = [header.join(',')];

  for (const row of rows) {
    const values = [
      row.id,
      row.name,
      row.email,
      row.createdAt,
      row.updatedAt,
      row.deletedAt ?? ''
    ].map((value) => {
      const text = String(value ?? '');
      return `"${text.replaceAll('"', '""')}"`;
    });

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 200);
}

export function getPermissionsForRole(role, rolePermissions) {
  return rolePermissions[role] ?? rolePermissions.viewer;
}

export function describeRole(role) {
  if (role === 'admin') {
    return 'Administrador';
  }

  if (role === 'editor') {
    return 'Editor';
  }

  return 'Leitor';
}

export function formatTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}
