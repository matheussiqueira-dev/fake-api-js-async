const state = {
  users: [],
  meta: {
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 6,
    hasPreviousPage: false,
    hasNextPage: false
  },
  stats: {
    totalUsers: 0,
    topDomains: [],
    recentUsers: []
  },
  query: {
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 6
  },
  pendingDeleteId: null,
  editingUserId: null,
  searchTimer: null
};

const elements = {
  healthStatus: document.getElementById('healthStatus'),
  refreshBtn: document.getElementById('refreshBtn'),
  filtersForm: document.getElementById('filtersForm'),
  searchInput: document.getElementById('searchInput'),
  sortBySelect: document.getElementById('sortBySelect'),
  sortOrderSelect: document.getElementById('sortOrderSelect'),
  limitSelect: document.getElementById('limitSelect'),
  feedback: document.getElementById('feedback'),
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
  nameInput: document.getElementById('nameInput'),
  emailInput: document.getElementById('emailInput'),
  nameError: document.getElementById('nameError'),
  emailError: document.getElementById('emailError'),
  submitBtn: document.getElementById('submitBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  formHeading: document.getElementById('formHeading'),
  formModeTag: document.getElementById('formModeTag'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmText: document.getElementById('confirmText'),
  cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
  confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
  toastRegion: document.getElementById('toastRegion')
};

init().catch((error) => {
  showToast(getErrorMessage(error), 'error');
});

async function init() {
  bindEvents();
  syncFilterControls();
  await Promise.all([checkHealth(), loadUsers(), loadStats()]);
}

function bindEvents() {
  elements.refreshBtn.addEventListener('click', async () => {
    await Promise.all([loadUsers(), loadStats()]);
    showToast('Dados atualizados com sucesso.', 'success');
  });

  elements.searchInput.addEventListener('input', (event) => {
    clearTimeout(state.searchTimer);

    state.searchTimer = window.setTimeout(() => {
      state.query.search = event.target.value.trim();
      state.query.page = 1;
      loadUsers();
    }, 260);
  });

  elements.filtersForm.addEventListener('change', () => {
    state.query.sortBy = elements.sortBySelect.value;
    state.query.sortOrder = elements.sortOrderSelect.value;
    state.query.limit = Number.parseInt(elements.limitSelect.value, 10);
    state.query.page = 1;
    loadUsers();
  });

  elements.prevPageBtn.addEventListener('click', () => {
    if (!state.meta.hasPreviousPage) {
      return;
    }

    state.query.page -= 1;
    loadUsers();
  });

  elements.nextPageBtn.addEventListener('click', () => {
    if (!state.meta.hasNextPage) {
      return;
    }

    state.query.page += 1;
    loadUsers();
  });

  elements.userForm.addEventListener('submit', handleSubmit);
  elements.cancelEditBtn.addEventListener('click', resetFormMode);

  elements.usersTableBody.addEventListener('click', handleActionClick);
  elements.usersCards.addEventListener('click', handleActionClick);

  elements.cancelDeleteBtn.addEventListener('click', closeDeleteDialog);
  elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

  elements.nameInput.addEventListener('input', () => setFieldError('name', ''));
  elements.emailInput.addEventListener('input', () => setFieldError('email', ''));
}

async function checkHealth() {
  try {
    await request('/api/health');
    elements.healthStatus.textContent = 'Servico online';
  } catch {
    elements.healthStatus.textContent = 'Servico indisponivel';
    elements.healthStatus.style.background = '#fef2f2';
    elements.healthStatus.style.color = '#b42318';
  }
}

async function loadUsers() {
  setFeedback('Carregando usuarios...');

  const params = new URLSearchParams({
    search: state.query.search,
    sortBy: state.query.sortBy,
    sortOrder: state.query.sortOrder,
    page: String(state.query.page),
    limit: String(state.query.limit)
  });

  try {
    const payload = await request(`/api/users?${params.toString()}`);

    state.users = payload.data;
    state.meta = payload.meta;
    state.query.page = payload.meta.page;

    renderUsers();
    renderPagination();

    setFeedback(`${payload.meta.totalItems} usuario(s) encontrado(s).`);
  } catch (error) {
    setFeedback('Nao foi possivel carregar usuarios.');
    showToast(getErrorMessage(error), 'error');
  }
}

async function loadStats() {
  try {
    const payload = await request('/api/stats');
    state.stats = payload;
    renderStats();
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  }
}

function renderUsers() {
  elements.usersTableBody.innerHTML = '';
  elements.usersCards.innerHTML = '';

  if (state.users.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="5">Nenhum usuario encontrado para os filtros atuais.</td>';
    elements.usersTableBody.appendChild(emptyRow);

    const emptyCard = document.createElement('article');
    emptyCard.className = 'user-card';
    emptyCard.textContent = 'Nenhum usuario encontrado para os filtros atuais.';
    elements.usersCards.appendChild(emptyCard);
    return;
  }

  state.users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.style.setProperty('--row-index', String(index));
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <div class="cell-actions">
          <button class="inline-btn" type="button" data-action="edit" data-user-id="${user.id}">Editar</button>
          <button class="inline-btn" type="button" data-kind="delete" data-action="delete" data-user-id="${user.id}">Excluir</button>
        </div>
      </td>
    `;

    elements.usersTableBody.appendChild(row);

    const card = document.createElement('article');
    card.className = 'user-card';
    card.innerHTML = `
      <h3>${escapeHtml(user.name)}</h3>
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
      <p><strong>ID:</strong> ${user.id}</p>
      <p><strong>Criado:</strong> ${formatDate(user.createdAt)}</p>
      <div class="cell-actions">
        <button class="inline-btn" type="button" data-action="edit" data-user-id="${user.id}">Editar</button>
        <button class="inline-btn" type="button" data-kind="delete" data-action="delete" data-user-id="${user.id}">Excluir</button>
      </div>
    `;

    elements.usersCards.appendChild(card);
  });
}

function renderPagination() {
  elements.paginationLabel.textContent = `Pagina ${state.meta.page} de ${state.meta.totalPages}`;
  elements.prevPageBtn.disabled = !state.meta.hasPreviousPage;
  elements.nextPageBtn.disabled = !state.meta.hasNextPage;
}

function renderStats() {
  elements.totalUsersValue.textContent = String(state.stats.totalUsers ?? 0);

  const topDomain = state.stats.topDomains?.[0]?.domain ?? '-';
  elements.topDomainValue.textContent = topDomain;

  elements.domainList.innerHTML = '';
  const domains = state.stats.topDomains?.length ? state.stats.topDomains : [{ domain: '-', count: 0 }];
  domains.forEach((domainItem) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${escapeHtml(domainItem.domain)}</span><strong>${domainItem.count}</strong>`;
    elements.domainList.appendChild(item);
  });

  elements.recentList.innerHTML = '';
  const recentUsers = state.stats.recentUsers?.length ? state.stats.recentUsers : [{ name: 'Sem registros', email: '-' }];
  recentUsers.forEach((user) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${escapeHtml(user.name)}</span><small>${escapeHtml(user.email)}</small>`;
    elements.recentList.appendChild(item);
  });
}

function handleActionClick(event) {
  const button = event.target.closest('[data-action]');

  if (!button) {
    return;
  }

  const userId = Number.parseInt(button.dataset.userId ?? '', 10);
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  if (button.dataset.action === 'edit') {
    enterEditMode(user);
    return;
  }

  if (button.dataset.action === 'delete') {
    openDeleteDialog(user);
  }
}

function enterEditMode(user) {
  state.editingUserId = user.id;
  elements.editingId.value = String(user.id);
  elements.nameInput.value = user.name;
  elements.emailInput.value = user.email;
  elements.formHeading.textContent = 'Editar cadastro';
  elements.formModeTag.textContent = 'Modo edicao';
  elements.submitBtn.textContent = 'Atualizar usuario';
  elements.cancelEditBtn.classList.remove('hidden');
  elements.nameInput.focus();
}

function resetFormMode() {
  state.editingUserId = null;
  elements.editingId.value = '';
  elements.userForm.reset();
  elements.formHeading.textContent = 'Novo cadastro';
  elements.formModeTag.textContent = 'Modo criacao';
  elements.submitBtn.textContent = 'Salvar usuario';
  elements.cancelEditBtn.classList.add('hidden');
  clearErrors();
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    name: elements.nameInput.value.trim(),
    email: elements.emailInput.value.trim()
  };

  const validationErrors = validateForm(payload);
  if (Object.keys(validationErrors).length > 0) {
    setFieldError('name', validationErrors.name ?? '');
    setFieldError('email', validationErrors.email ?? '');
    return;
  }

  elements.submitBtn.disabled = true;

  try {
    if (state.editingUserId) {
      await request(`/api/users/${state.editingUserId}`, {
        method: 'PUT',
        body: payload
      });
      showToast('Usuario atualizado com sucesso.', 'success');
    } else {
      await request('/api/users', {
        method: 'POST',
        body: payload
      });
      showToast('Usuario criado com sucesso.', 'success');
    }

    resetFormMode();
    await Promise.all([loadUsers(), loadStats()]);
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  } finally {
    elements.submitBtn.disabled = false;
  }
}

function validateForm(payload) {
  const errors = {};

  if (payload.name.length < 2 || payload.name.length > 80) {
    errors.name = 'Informe um nome com 2 a 80 caracteres.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(payload.email.toLowerCase())) {
    errors.email = 'Informe um email valido.';
  }

  return errors;
}

function clearErrors() {
  setFieldError('name', '');
  setFieldError('email', '');
}

function setFieldError(field, message) {
  if (field === 'name') {
    elements.nameError.textContent = message;
    return;
  }

  if (field === 'email') {
    elements.emailError.textContent = message;
  }
}

function openDeleteDialog(user) {
  state.pendingDeleteId = user.id;
  elements.confirmText.textContent = `Deseja remover ${user.name} (ID ${user.id})?`;

  if (typeof elements.confirmDialog.showModal === 'function') {
    elements.confirmDialog.showModal();
    return;
  }

  const confirmed = window.confirm(elements.confirmText.textContent);
  if (confirmed) {
    confirmDelete();
  }
}

function closeDeleteDialog() {
  if (typeof elements.confirmDialog.close === 'function' && elements.confirmDialog.open) {
    elements.confirmDialog.close();
  }
  state.pendingDeleteId = null;
}

async function confirmDelete() {
  if (!state.pendingDeleteId) {
    return;
  }

  elements.confirmDeleteBtn.disabled = true;

  try {
    await request(`/api/users/${state.pendingDeleteId}`, {
      method: 'DELETE'
    });

    showToast('Usuario removido com sucesso.', 'success');

    if (state.editingUserId === state.pendingDeleteId) {
      resetFormMode();
    }

    closeDeleteDialog();
    await Promise.all([loadUsers(), loadStats()]);
  } catch (error) {
    showToast(getErrorMessage(error), 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
  }
}

function setFeedback(text) {
  elements.feedback.textContent = text;
}

function syncFilterControls() {
  elements.sortBySelect.value = state.query.sortBy;
  elements.sortOrderSelect.value = state.query.sortOrder;
  elements.limitSelect.value = String(state.query.limit);
}

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

function showToast(message, type = 'info') {
  const toast = document.createElement('article');
  toast.className = 'toast';
  toast.dataset.type = type;
  toast.textContent = message;

  elements.toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3600);
}

function getErrorMessage(error) {
  if (error?.statusCode === 409) {
    return 'Email ja cadastrado. Use um email diferente.';
  }

  if (error?.statusCode === 400) {
    return error.message;
  }

  if (error?.statusCode === 503) {
    return 'Servico temporariamente indisponivel. Tente novamente.';
  }

  return error?.message ?? 'Erro inesperado.';
}

function formatDate(dateValue) {
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}