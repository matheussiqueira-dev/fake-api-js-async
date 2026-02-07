export function getElements() {
  return {
    body: document.body,
    mainContent: document.getElementById('mainContent'),
    healthStatus: document.getElementById('healthStatus'),
    refreshBtn: document.getElementById('refreshBtn'),
    densityToggleBtn: document.getElementById('densityToggleBtn'),

    navButtons: Array.from(document.querySelectorAll('[data-view-target]')),
    operationsView: document.querySelector('[data-view="operations"]'),
    auditView: document.querySelector('[data-view="audit"]'),

    authGate: document.getElementById('authGate'),
    appContent: document.getElementById('appContent'),
    loginForm: document.getElementById('loginForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginUsernameError: document.getElementById('loginUsernameError'),
    loginPasswordError: document.getElementById('loginPasswordError'),
    loginSubmitBtn: document.getElementById('loginSubmitBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    sessionUsername: document.getElementById('sessionUsername'),
    sessionRole: document.getElementById('sessionRole'),

    totalUsersValue: document.getElementById('totalUsersValue'),
    activeUsersLabel: document.getElementById('activeUsersLabel'),
    deletedUsersValue: document.getElementById('deletedUsersValue'),
    topDomainValue: document.getElementById('topDomainValue'),
    topDomainCount: document.getElementById('topDomainCount'),
    avgLatencyValue: document.getElementById('avgLatencyValue'),
    requestCountValue: document.getElementById('requestCountValue'),

    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    filtersForm: document.getElementById('filtersForm'),
    searchInput: document.getElementById('searchInput'),
    sortBySelect: document.getElementById('sortBySelect'),
    sortOrderSelect: document.getElementById('sortOrderSelect'),
    limitSelect: document.getElementById('limitSelect'),
    includeDeletedField: document.getElementById('includeDeletedField'),
    includeDeletedInput: document.getElementById('includeDeletedInput'),
    feedback: document.getElementById('feedback'),

    usersRegion: document.getElementById('usersRegion'),
    usersTableBody: document.getElementById('usersTableBody'),
    usersCards: document.getElementById('usersCards'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    paginationLabel: document.getElementById('paginationLabel'),

    userForm: document.getElementById('userForm'),
    editingId: document.getElementById('editingId'),
    formHeading: document.getElementById('formHeading'),
    formModeTag: document.getElementById('formModeTag'),
    permissionHint: document.getElementById('permissionHint'),
    submitBtn: document.getElementById('submitBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    nameInput: document.getElementById('nameInput'),
    emailInput: document.getElementById('emailInput'),
    nameError: document.getElementById('nameError'),
    emailError: document.getElementById('emailError'),

    domainList: document.getElementById('domainList'),
    recentList: document.getElementById('recentList'),

    refreshAuditBtn: document.getElementById('refreshAuditBtn'),
    auditFeedback: document.getElementById('auditFeedback'),
    auditRegion: document.getElementById('auditRegion'),
    auditTableBody: document.getElementById('auditTableBody'),
    prevAuditBtn: document.getElementById('prevAuditBtn'),
    nextAuditBtn: document.getElementById('nextAuditBtn'),
    auditPaginationLabel: document.getElementById('auditPaginationLabel'),

    metricsList: document.getElementById('metricsList'),

    confirmDialog: document.getElementById('confirmDialog'),
    confirmText: document.getElementById('confirmText'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    toastRegion: document.getElementById('toastRegion')
  };
}

export function createActionButton(label, dataAction, userId, extra = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button--ghost action-btn';
  button.dataset.action = dataAction;
  button.dataset.userId = String(userId);
  button.textContent = label;

  if (extra.kind) {
    button.dataset.kind = extra.kind;
  }

  if (extra.title) {
    button.title = extra.title;
  }

  if (extra.disabled) {
    button.disabled = true;
  }

  return button;
}

export function createSkeleton(lines = 5) {
  const wrapper = document.createElement('div');
  wrapper.className = 'loading-skeleton';

  for (let index = 0; index < lines; index += 1) {
    const line = document.createElement('span');
    line.style.width = `${92 - index * 10}%`;
    wrapper.appendChild(line);
  }

  return wrapper;
}

export function createEmptyState(title, description) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  const heading = document.createElement('h4');
  heading.textContent = title;

  const text = document.createElement('p');
  text.textContent = description;

  wrapper.append(heading, text);
  return wrapper;
}