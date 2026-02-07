export function getElements() {
  return {
    body: document.body,
    healthStatus: document.getElementById('healthStatus'),
    densityToggleBtn: document.getElementById('densityToggleBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    filtersForm: document.getElementById('filtersForm'),
    searchInput: document.getElementById('searchInput'),
    sortBySelect: document.getElementById('sortBySelect'),
    sortOrderSelect: document.getElementById('sortOrderSelect'),
    limitSelect: document.getElementById('limitSelect'),
    feedback: document.getElementById('feedback'),
    usersRegion: document.getElementById('usersRegion'),
    tableWrap: document.getElementById('tableWrap'),
    usersTableBody: document.getElementById('usersTableBody'),
    usersCards: document.getElementById('usersCards'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    paginationLabel: document.getElementById('paginationLabel'),
    totalUsersValue: document.getElementById('totalUsersValue'),
    topDomainValue: document.getElementById('topDomainValue'),
    domainList: document.getElementById('domainList'),
    recentList: document.getElementById('recentList'),
    userForm: document.getElementById('userForm'),
    editingId: document.getElementById('editingId'),
    formHeading: document.getElementById('formHeading'),
    formModeTag: document.getElementById('formModeTag'),
    submitBtn: document.getElementById('submitBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    nameInput: document.getElementById('nameInput'),
    emailInput: document.getElementById('emailInput'),
    nameError: document.getElementById('nameError'),
    emailError: document.getElementById('emailError'),
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

  return button;
}

export function createSkeleton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'loading-skeleton';

  for (let index = 0; index < 5; index += 1) {
    const line = document.createElement('span');
    line.style.width = `${92 - index * 12}%`;
    wrapper.appendChild(line);
  }

  return wrapper;
}

export function createEmptyState(title, description) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  const heading = document.createElement('h3');
  heading.textContent = title;

  const text = document.createElement('p');
  text.textContent = description;

  wrapper.appendChild(heading);
  wrapper.appendChild(text);
  return wrapper;
}