import {
  checkHealth,
  createUser,
  fetchAllUsersForExport,
  fetchStats,
  fetchUsers,
  removeUser,
  updateUser
} from './api-client.js';
import { getElements } from './dom.js';
import { getErrorMessage, showToast } from './feedback.js';
import {
  applyDensity,
  clearFieldErrors,
  renderPagination,
  renderStats,
  renderUsers,
  setFeedback,
  setFieldError,
  setFormMode,
  setHealthStatus,
  setUsersLoading,
  syncFilterControls
} from './renderers.js';
import { createState, resetQuery } from './state.js';
import { debounce, downloadCsv, normalizeDensity, toCsv } from './utils.js';

const elements = getElements();
const { state, persistPreferences, persistQuery } = createState();

init().catch((error) => {
  showToast(elements.toastRegion, getErrorMessage(error), 'error');
});

async function init() {
  applyDensity(elements, state.preferences.density);
  syncFilterControls(elements, state.query);
  bindEvents();

  await Promise.all([loadHealth(), loadUsers({ showLoading: true }), loadStats()]);
}

function bindEvents() {
  elements.refreshBtn.addEventListener('click', async () => {
    await Promise.all([loadUsers({ showLoading: true }), loadStats()]);
    showToast(elements.toastRegion, 'Dados atualizados.', 'success');
  });

  elements.clearFiltersBtn.addEventListener('click', () => {
    resetQuery(state);
    syncFilterControls(elements, state.query);
    persistQuery();
    loadUsers({ showLoading: true });
    showToast(elements.toastRegion, 'Filtros redefinidos.', 'info');
  });

  elements.densityToggleBtn.addEventListener('click', () => {
    state.preferences.density = state.preferences.density === 'compact' ? 'comfortable' : 'compact';
    state.preferences.density = normalizeDensity(state.preferences.density);

    applyDensity(elements, state.preferences.density);
    persistPreferences();
  });

  const onSearch = debounce(() => {
    state.query.search = elements.searchInput.value.trim();
    state.query.page = 1;
    persistQuery();
    loadUsers({ showLoading: true });
  }, 260);

  elements.searchInput.addEventListener('input', onSearch);

  elements.filtersForm.addEventListener('change', () => {
    state.query.sortBy = elements.sortBySelect.value;
    state.query.sortOrder = elements.sortOrderSelect.value;
    state.query.limit = Number.parseInt(elements.limitSelect.value, 10);
    state.query.page = 1;

    persistQuery();
    loadUsers({ showLoading: true });
  });

  elements.prevPageBtn.addEventListener('click', () => {
    if (!state.meta.hasPreviousPage) {
      return;
    }

    state.query.page -= 1;
    persistQuery();
    loadUsers({ showLoading: true });
  });

  elements.nextPageBtn.addEventListener('click', () => {
    if (!state.meta.hasNextPage) {
      return;
    }

    state.query.page += 1;
    persistQuery();
    loadUsers({ showLoading: true });
  });

  elements.userForm.addEventListener('submit', handleSubmit);
  elements.cancelEditBtn.addEventListener('click', resetFormMode);

  elements.usersTableBody.addEventListener('click', handleActionClick);
  elements.usersCards.addEventListener('click', handleActionClick);

  elements.exportCsvBtn.addEventListener('click', exportCsv);

  elements.cancelDeleteBtn.addEventListener('click', closeDeleteDialog);
  elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
  elements.confirmDialog.addEventListener('close', () => {
    state.pendingDeleteId = null;
  });

  elements.nameInput.addEventListener('input', () => setFieldError(elements, 'name', ''));
  elements.emailInput.addEventListener('input', () => setFieldError(elements, 'email', ''));

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    }
  });
}

async function loadHealth() {
  try {
    await checkHealth();
    setHealthStatus(elements, true);
  } catch {
    setHealthStatus(elements, false);
  }
}

async function loadUsers(options = {}) {
  const showLoading = options.showLoading !== false;
  state.inFlightUsersRequest += 1;
  const requestId = state.inFlightUsersRequest;

  if (showLoading) {
    setUsersLoading(elements, true);
    setFeedback(elements, 'Carregando usuarios...');
  }

  try {
    const payload = await fetchUsers(state.query);

    if (requestId !== state.inFlightUsersRequest) {
      return;
    }

    state.users = payload.data;
    state.meta = payload.meta;
    state.query.page = payload.meta.page;

    persistQuery();

    renderUsers(elements, state.users);
    renderPagination(elements, state.meta);
    setFeedback(elements, `${state.meta.totalItems} usuario(s) encontrado(s).`);
  } catch (error) {
    if (requestId !== state.inFlightUsersRequest) {
      return;
    }

    renderUsers(elements, []);
    renderPagination(elements, {
      page: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    });
    setFeedback(elements, 'Falha ao carregar usuarios.');
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    if (requestId === state.inFlightUsersRequest) {
      elements.usersRegion.setAttribute('aria-busy', 'false');
    }
  }
}

async function loadStats() {
  try {
    const payload = await fetchStats();
    state.stats = payload;
    renderStats(elements, state.stats);
  } catch (error) {
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  }
}

function handleActionClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!(trigger instanceof HTMLButtonElement)) {
    return;
  }

  const userId = Number.parseInt(trigger.dataset.userId ?? '', 10);
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return;
  }

  const action = trigger.dataset.action;

  if (action === 'edit') {
    enterEditMode(user);
    return;
  }

  if (action === 'delete') {
    openDeleteDialog(user);
    return;
  }

  if (action === 'copyEmail') {
    copyEmail(user.email);
  }
}

async function copyEmail(email) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(email);
    } else {
      const tempInput = document.createElement('textarea');
      tempInput.value = email;
      document.body.appendChild(tempInput);
      tempInput.focus();
      tempInput.select();
      document.execCommand('copy');
      tempInput.remove();
    }

    showToast(elements.toastRegion, 'Email copiado para a area de transferencia.', 'success');
  } catch {
    showToast(elements.toastRegion, 'Nao foi possivel copiar o email.', 'error');
  }
}

function enterEditMode(user) {
  state.editingUserId = user.id;
  elements.editingId.value = String(user.id);
  elements.nameInput.value = user.name;
  elements.emailInput.value = user.email;
  setFormMode(elements, 'edit');
  clearFieldErrors(elements);
  elements.nameInput.focus();
}

function resetFormMode() {
  state.editingUserId = null;
  elements.editingId.value = '';
  elements.userForm.reset();
  setFormMode(elements, 'create');
  clearFieldErrors(elements);
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    name: elements.nameInput.value.trim(),
    email: elements.emailInput.value.trim().toLowerCase()
  };

  const errors = validateForm(payload);
  if (errors.name || errors.email) {
    setFieldError(elements, 'name', errors.name ?? '');
    setFieldError(elements, 'email', errors.email ?? '');
    return;
  }

  elements.submitBtn.disabled = true;

  try {
    if (state.editingUserId) {
      await updateUser(state.editingUserId, payload);
      showToast(elements.toastRegion, 'Usuario atualizado com sucesso.', 'success');
    } else {
      await createUser(payload);
      showToast(elements.toastRegion, 'Usuario criado com sucesso.', 'success');
    }

    resetFormMode();
    await Promise.all([loadUsers({ showLoading: false }), loadStats()]);
  } catch (error) {
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.submitBtn.disabled = false;
  }
}

function validateForm(payload) {
  const result = {};

  if (payload.name.length < 2 || payload.name.length > 80) {
    result.name = 'Informe um nome entre 2 e 80 caracteres.';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(payload.email)) {
    result.email = 'Informe um email valido.';
  }

  return result;
}

function openDeleteDialog(user) {
  state.pendingDeleteId = user.id;
  elements.confirmText.textContent = `Deseja remover ${user.name} (ID ${user.id})?`;

  if (typeof elements.confirmDialog.showModal === 'function') {
    elements.confirmDialog.showModal();
    return;
  }

  if (window.confirm(elements.confirmText.textContent)) {
    confirmDelete();
  }
}

function closeDeleteDialog() {
  if (elements.confirmDialog.open && typeof elements.confirmDialog.close === 'function') {
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
    await removeUser(state.pendingDeleteId);

    if (state.editingUserId === state.pendingDeleteId) {
      resetFormMode();
    }

    showToast(elements.toastRegion, 'Usuario removido com sucesso.', 'success');
    closeDeleteDialog();
    await Promise.all([loadUsers({ showLoading: false }), loadStats()]);
  } catch (error) {
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
  }
}

async function exportCsv() {
  elements.exportCsvBtn.disabled = true;
  const originalLabel = elements.exportCsvBtn.textContent;
  elements.exportCsvBtn.textContent = 'Exportando...';

  try {
    const allUsers = await fetchAllUsersForExport(state.query);

    if (allUsers.length === 0) {
      showToast(elements.toastRegion, 'Nenhum dado para exportar com os filtros atuais.', 'info');
      return;
    }

    const csv = toCsv(allUsers);
    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    downloadCsv(`usuarios-${timestamp}.csv`, csv);

    showToast(elements.toastRegion, `${allUsers.length} usuario(s) exportado(s) em CSV.`, 'success');
  } catch (error) {
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.exportCsvBtn.disabled = false;
    elements.exportCsvBtn.textContent = originalLabel;
  }
}
