import {
  checkHealth,
  createUser,
  fetchAllUsersForExport,
  fetchAuditLogs,
  fetchMetrics,
  fetchStats,
  fetchUsers,
  getCurrentUser,
  login,
  removeUser,
  restoreUser,
  updateUser
} from './api-client.js';
import { ROLE_PERMISSIONS } from './constants.js';
import { getElements } from './dom.js';
import { getErrorMessage, showToast } from './feedback.js';
import {
  applyDensity,
  applyLayoutMode,
  applyRoleCapabilities,
  clearFieldErrors,
  clearLoginErrors,
  renderAuditLogs,
  renderAuditPagination,
  renderMetrics,
  renderPagination,
  renderSession,
  renderStats,
  renderUsers,
  setActiveView,
  setAuditFeedback,
  setAuditLoading,
  setAuthState,
  setFeedback,
  setFieldError,
  setFormMode,
  setHealthStatus,
  setLastSync,
  setLoginFieldError,
  setRefreshCountdownLabel,
  setUsersLoading,
  syncAutoRefreshControls,
  syncFilterControls
} from './renderers.js';
import { createState, resetQuery } from './state.js';
import {
  debounce,
  downloadCsv,
  getPermissionsForRole,
  normalizeAutoRefreshInterval,
  normalizeDensity,
  toCsv
} from './utils.js';

const elements = getElements();
const {
  state,
  persistActiveView,
  persistIncludeDeleted,
  persistPreferences,
  persistQuery,
  persistSession
} = createState();
let autoRefreshTimerId = null;
let autoRefreshCountdownTimerId = null;
let nextAutoRefreshAt = null;

init().catch((error) => {
  showToast(elements.toastRegion, getErrorMessage(error), 'error');
});

async function init() {
  applyDensity(elements, state.preferences.density);
  applyLayoutMode(elements, state.preferences.focusMode);
  syncAutoRefreshControls(elements, state.preferences);
  setLastSync(elements, state.lastSyncAt);
  updateAutoRefreshCountdownLabel();
  setActiveView(elements, state.activeView);
  bindEvents();

  await loadHealth();

  if (state.session?.token) {
    await restoreSession();
  } else {
    setAuthState(elements, false);
    configureAutoRefresh();
  }
}

function bindEvents() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.logoutBtn.addEventListener('click', handleLogout);

  elements.refreshBtn.addEventListener('click', () => {
    refreshAllData({ reason: 'manual' });
  });

  elements.densityToggleBtn.addEventListener('click', () => {
    state.preferences.density = state.preferences.density === 'compact' ? 'comfortable' : 'compact';
    state.preferences.density = normalizeDensity(state.preferences.density);
    applyDensity(elements, state.preferences.density);
    persistPreferences();
  });

  elements.focusModeBtn.addEventListener('click', () => {
    state.preferences.focusMode = state.preferences.focusMode !== true;
    applyLayoutMode(elements, state.preferences.focusMode);
    persistPreferences();
  });

  elements.autoRefreshInput.addEventListener('change', () => {
    state.preferences.autoRefreshEnabled = elements.autoRefreshInput.checked;
    persistPreferences();
    configureAutoRefresh();
  });

  elements.autoRefreshIntervalSelect.addEventListener('change', () => {
    state.preferences.autoRefreshIntervalSec = normalizeAutoRefreshInterval(elements.autoRefreshIntervalSelect.value);
    syncAutoRefreshControls(elements, state.preferences);
    persistPreferences();
    configureAutoRefresh();
  });

  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const requested = button.dataset.viewTarget ?? 'operations';

      if (requested === 'audit' && !getCurrentPermissions().canReadAudit) {
        showToast(elements.toastRegion, 'Acesso de auditoria restrito ao perfil administrador.', 'info');
        return;
      }

      state.activeView = requested;
      persistActiveView();
      setActiveView(elements, state.activeView);

      if (state.activeView === 'audit') {
        loadAuditLogs();
      }
    });
  });

  elements.clearFiltersBtn.addEventListener('click', () => {
    resetQuery(state);
    state.includeDeleted = false;
    syncFilterControls(elements, state.query, state.includeDeleted);
    persistQuery();
    persistIncludeDeleted();
    loadUsers({ showLoading: true });
    showToast(elements.toastRegion, 'Filtros redefinidos.', 'info');
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

    state.includeDeleted = elements.includeDeletedInput.checked;

    persistQuery();
    persistIncludeDeleted();

    loadUsers({ showLoading: true });
    loadStats();
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

  elements.userForm.addEventListener('submit', handleUserSubmit);
  elements.cancelEditBtn.addEventListener('click', resetFormMode);

  elements.usersTableBody.addEventListener('click', handleUserActionClick);
  elements.usersCards.addEventListener('click', handleUserActionClick);

  elements.exportCsvBtn.addEventListener('click', exportCsv);

  elements.cancelDeleteBtn.addEventListener('click', closeConfirmDialog);
  elements.confirmDeleteBtn.addEventListener('click', executePendingAction);
  elements.confirmDialog.addEventListener('close', () => {
    state.pendingAction = null;
  });

  elements.refreshAuditBtn.addEventListener('click', loadAuditLogs);
  elements.auditSearchInput.addEventListener('input', () => {
    state.auditSearchTerm = elements.auditSearchInput.value.trim();
    applyAuditLocalFilter();
  });
  elements.clearAuditSearchBtn.addEventListener('click', () => {
    state.auditSearchTerm = '';
    elements.auditSearchInput.value = '';
    applyAuditLocalFilter();
  });

  elements.prevAuditBtn.addEventListener('click', () => {
    if (!state.auditMeta.hasPreviousPage) {
      return;
    }

    state.auditMeta.page -= 1;
    loadAuditLogs();
  });

  elements.nextAuditBtn.addEventListener('click', () => {
    if (!state.auditMeta.hasNextPage) {
      return;
    }

    state.auditMeta.page += 1;
    loadAuditLogs();
  });

  elements.nameInput.addEventListener('input', () => setFieldError(elements, 'name', ''));
  elements.emailInput.addEventListener('input', () => setFieldError(elements, 'email', ''));

  elements.loginUsername.addEventListener('input', () => setLoginFieldError(elements, 'username', ''));
  elements.loginPassword.addEventListener('input', () => setLoginFieldError(elements, 'password', ''));

  window.addEventListener('keydown', async (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      await refreshAllData({ reason: 'shortcut' });
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      state.preferences.focusMode = state.preferences.focusMode !== true;
      applyLayoutMode(elements, state.preferences.focusMode);
      persistPreferences();
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      state.preferences.autoRefreshEnabled = state.preferences.autoRefreshEnabled !== true;
      syncAutoRefreshControls(elements, state.preferences);
      persistPreferences();
      configureAutoRefresh();
    }
  });
}

function getCurrentPermissions() {
  const role = state.session?.user?.role ?? 'viewer';
  return getPermissionsForRole(role, ROLE_PERMISSIONS);
}

async function restoreSession() {
  try {
    const profile = await getCurrentUser(state.session.token);
    state.session.user = profile;
    persistSession();

    setAuthState(elements, true);
    renderSession(elements, state.session);
    applyPermissionsToUI();
    syncFilterControls(elements, state.query, state.includeDeleted);

    await refreshAllData({ reason: 'session-restore' });
    configureAutoRefresh();
  } catch {
    state.session = null;
    persistSession();
    setAuthState(elements, false);
    renderSession(elements, null);
    configureAutoRefresh();
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const credentials = {
    username: elements.loginUsername.value.trim(),
    password: elements.loginPassword.value
  };

  clearLoginErrors(elements);

  let hasValidationError = false;

  if (credentials.username.length < 3) {
    hasValidationError = true;
    setLoginFieldError(elements, 'username', 'Informe um usuario valido.');
  }

  if (credentials.password.length < 8) {
    hasValidationError = true;
    setLoginFieldError(elements, 'password', 'A senha deve ter no minimo 8 caracteres.');
  }

  if (hasValidationError) {
    return;
  }

  elements.loginSubmitBtn.disabled = true;

  try {
    const result = await login(credentials);

    state.session = {
      token: result.accessToken,
      user: result.user
    };

    persistSession();

    setAuthState(elements, true);
    renderSession(elements, state.session);
    applyPermissionsToUI();
    syncFilterControls(elements, state.query, state.includeDeleted);

    showToast(elements.toastRegion, `Bem-vindo, ${result.user.displayName}.`, 'success');

    await refreshAllData({ reason: 'login' });
    configureAutoRefresh();
  } catch (error) {
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.loginSubmitBtn.disabled = false;
  }
}

function handleLogout() {
  state.session = null;
  state.users = [];
  state.auditLogs = [];
  state.pendingAction = null;
  state.editingUserId = null;

  persistSession();

  setAuthState(elements, false);
  renderSession(elements, null);
  resetFormMode();
  clearAutoRefreshTimers();
  state.lastSyncAt = null;
  setLastSync(elements, state.lastSyncAt);
  configureAutoRefresh();
  state.auditSearchTerm = '';
  elements.auditSearchInput.value = '';

  elements.loginForm.reset();
  showToast(elements.toastRegion, 'Sessao encerrada com sucesso.', 'info');
}

async function loadHealth() {
  try {
    await checkHealth();
    setHealthStatus(elements, true);
  } catch {
    setHealthStatus(elements, false);
  }
}

async function refreshAllData(options = {}) {
  if (!state.session?.token) {
    return;
  }

  if (state.isRefreshingAllData) {
    return;
  }

  state.isRefreshingAllData = true;
  elements.refreshBtn.disabled = true;

  try {
    await Promise.all([
      loadUsers({ showLoading: true }),
      loadStats(),
      loadMetrics(),
      state.activeView === 'audit' ? loadAuditLogs() : Promise.resolve()
    ]);

    state.lastSyncAt = new Date().toISOString();
    setLastSync(elements, state.lastSyncAt);
  } finally {
    state.isRefreshingAllData = false;
    elements.refreshBtn.disabled = false;

    if (state.preferences.autoRefreshEnabled && state.session?.token) {
      const intervalMs = state.preferences.autoRefreshIntervalSec * 1000;
      nextAutoRefreshAt = Date.now() + intervalMs;
      if (options.reason !== 'auto') {
        updateAutoRefreshCountdownLabel();
      }
    }
  }
}

async function loadUsers(options = {}) {
  if (!state.session?.token) {
    return;
  }

  const permissions = getCurrentPermissions();

  if (state.includeDeleted && !permissions.canToggleDeleted) {
    state.includeDeleted = false;
    elements.includeDeletedInput.checked = false;
    persistIncludeDeleted();
  }

  const showLoading = options.showLoading !== false;
  state.inFlightUsersRequest += 1;
  const requestId = state.inFlightUsersRequest;

  if (showLoading) {
    setUsersLoading(elements, true);
    setFeedback(elements, 'Carregando usuarios...');
  }

  try {
    const payload = await fetchUsers({
      ...state.query,
      includeDeleted: state.includeDeleted
    }, state.session.token);

    if (requestId !== state.inFlightUsersRequest) {
      return;
    }

    state.users = payload.data;
    state.meta = payload.meta;
    state.query.page = payload.meta.page;

    persistQuery();

    renderUsers(elements, state.users, permissions);
    renderPagination(elements, state.meta);
    setFeedback(elements, `${state.meta.totalItems} usuario(s) encontrados.`);
  } catch (error) {
    if (requestId !== state.inFlightUsersRequest) {
      return;
    }

    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    renderUsers(elements, [], permissions);
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
  if (!state.session?.token) {
    return;
  }

  const permissions = getCurrentPermissions();

  try {
    state.stats = await fetchStats(state.session.token, state.includeDeleted && permissions.canToggleDeleted);
    renderStats(elements, state.stats);
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  }
}

async function loadMetrics() {
  if (!state.session?.token) {
    return;
  }

  const permissions = getCurrentPermissions();

  if (!permissions.canReadMetrics) {
    renderMetrics(elements, state.metrics, false);
    return;
  }

  try {
    state.metrics = await fetchMetrics(state.session.token);
    renderMetrics(elements, state.metrics, true);
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  }
}

async function loadAuditLogs() {
  if (!state.session?.token) {
    return;
  }

  const permissions = getCurrentPermissions();

  if (!permissions.canReadAudit) {
    setAuditFeedback(elements, 'Acesso restrito ao perfil administrador.');
    state.auditFilteredCount = renderAuditLogs(elements, [], state.auditSearchTerm);
    renderAuditPagination(elements, {
      page: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    });
    return;
  }

  setAuditLoading(elements, true);
  setAuditFeedback(elements, 'Carregando eventos de auditoria...');

  try {
    const result = await fetchAuditLogs({
      page: state.auditMeta.page,
      limit: state.auditMeta.limit
    }, state.session.token);

    state.auditLogs = result.data;
    state.auditMeta = result.meta;

    state.auditFilteredCount = renderAuditLogs(elements, state.auditLogs, state.auditSearchTerm);
    renderAuditPagination(elements, state.auditMeta);
    updateAuditFeedback();
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    state.auditFilteredCount = renderAuditLogs(elements, [], state.auditSearchTerm);
    setAuditFeedback(elements, 'Falha ao carregar auditoria.');
    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.auditRegion.setAttribute('aria-busy', 'false');
  }
}

function applyAuditLocalFilter() {
  state.auditFilteredCount = renderAuditLogs(elements, state.auditLogs, state.auditSearchTerm);
  updateAuditFeedback();
}

function updateAuditFeedback() {
  if (!state.auditSearchTerm) {
    setAuditFeedback(elements, `${state.auditMeta.totalItems} evento(s) encontrados.`);
    return;
  }

  setAuditFeedback(
    elements,
    `Exibindo ${state.auditFilteredCount} evento(s) na pagina atual para o filtro "${state.auditSearchTerm}".`
  );
}

function clearAutoRefreshTimers() {
  if (autoRefreshTimerId) {
    window.clearInterval(autoRefreshTimerId);
    autoRefreshTimerId = null;
  }

  if (autoRefreshCountdownTimerId) {
    window.clearInterval(autoRefreshCountdownTimerId);
    autoRefreshCountdownTimerId = null;
  }

  nextAutoRefreshAt = null;
}

function updateAutoRefreshCountdownLabel() {
  if (!state.preferences.autoRefreshEnabled) {
    setRefreshCountdownLabel(elements, 'Autoatualizacao desativada.');
    return;
  }

  if (!state.session?.token) {
    setRefreshCountdownLabel(elements, 'Autoatualizacao aguardando login.');
    return;
  }

  if (!nextAutoRefreshAt) {
    setRefreshCountdownLabel(elements, `Proxima atualizacao em ${state.preferences.autoRefreshIntervalSec}s.`);
    return;
  }

  const remainingMs = Math.max(0, nextAutoRefreshAt - Date.now());
  const remainingSec = Math.ceil(remainingMs / 1000);
  setRefreshCountdownLabel(elements, `Proxima atualizacao em ${remainingSec}s.`);
}

function configureAutoRefresh() {
  state.preferences.autoRefreshIntervalSec = normalizeAutoRefreshInterval(state.preferences.autoRefreshIntervalSec);
  syncAutoRefreshControls(elements, state.preferences);
  clearAutoRefreshTimers();

  if (!state.preferences.autoRefreshEnabled || !state.session?.token) {
    updateAutoRefreshCountdownLabel();
    return;
  }

  const intervalMs = state.preferences.autoRefreshIntervalSec * 1000;
  nextAutoRefreshAt = Date.now() + intervalMs;
  updateAutoRefreshCountdownLabel();

  autoRefreshTimerId = window.setInterval(async () => {
    await refreshAllData({ reason: 'auto' });
    nextAutoRefreshAt = Date.now() + intervalMs;
  }, intervalMs);

  autoRefreshCountdownTimerId = window.setInterval(() => {
    updateAutoRefreshCountdownLabel();
  }, 1000);
}

function handleUserActionClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!(trigger instanceof HTMLButtonElement)) {
    return;
  }

  const action = trigger.dataset.action;
  if (!action || action === 'none') {
    return;
  }

  const userId = Number.parseInt(trigger.dataset.userId ?? '', 10);
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return;
  }

  if (action === 'copyEmail') {
    copyEmail(user.email);
    return;
  }

  if (action === 'edit') {
    enterEditMode(user);
    return;
  }

  if (action === 'delete') {
    openConfirmDialog({
      type: 'delete',
      user,
      label: 'Remover usuario',
      description: `Deseja remover ${user.name}? A exclusao e logica e pode ser desfeita.`
    });
    return;
  }

  if (action === 'restore') {
    openConfirmDialog({
      type: 'restore',
      user,
      label: 'Restaurar usuario',
      description: `Deseja restaurar ${user.name} para o estado ativo?`
    });
  }
}

async function copyEmail(email) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(email);
    } else {
      const temp = document.createElement('textarea');
      temp.value = email;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }

    showToast(elements.toastRegion, 'Email copiado para a area de transferencia.', 'success');
  } catch {
    showToast(elements.toastRegion, 'Nao foi possivel copiar o email.', 'error');
  }
}

function enterEditMode(user) {
  const permissions = getCurrentPermissions();
  if (!permissions.canEdit) {
    showToast(elements.toastRegion, 'Seu perfil nao pode editar usuarios.', 'info');
    return;
  }

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

async function handleUserSubmit(event) {
  event.preventDefault();

  const permissions = getCurrentPermissions();
  if (!permissions.canCreate && !permissions.canEdit) {
    showToast(elements.toastRegion, 'Seu perfil possui apenas acesso de leitura.', 'info');
    return;
  }

  const payload = {
    name: elements.nameInput.value.trim(),
    email: elements.emailInput.value.trim().toLowerCase()
  };

  const errors = validateUserForm(payload);
  if (errors.name || errors.email) {
    setFieldError(elements, 'name', errors.name ?? '');
    setFieldError(elements, 'email', errors.email ?? '');
    return;
  }

  elements.submitBtn.disabled = true;

  try {
    if (state.editingUserId) {
      await updateUser(state.editingUserId, payload, state.session.token);
      showToast(elements.toastRegion, 'Usuario atualizado com sucesso.', 'success');
    } else {
      await createUser(payload, state.session.token);
      showToast(elements.toastRegion, 'Usuario criado com sucesso.', 'success');
    }

    resetFormMode();
    await Promise.all([loadUsers({ showLoading: false }), loadStats(), loadMetrics()]);
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.submitBtn.disabled = false;
  }
}

function validateUserForm(payload) {
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

function openConfirmDialog(action) {
  state.pendingAction = action;
  elements.confirmText.textContent = action.description;
  elements.confirmDeleteBtn.textContent = action.label;

  if (typeof elements.confirmDialog.showModal === 'function') {
    elements.confirmDialog.showModal();
    return;
  }

  if (window.confirm(action.description)) {
    executePendingAction();
  }
}

function closeConfirmDialog() {
  if (elements.confirmDialog.open && typeof elements.confirmDialog.close === 'function') {
    elements.confirmDialog.close();
  }

  state.pendingAction = null;
}

async function executePendingAction() {
  if (!state.pendingAction || !state.session?.token) {
    return;
  }

  elements.confirmDeleteBtn.disabled = true;

  try {
    if (state.pendingAction.type === 'delete') {
      await removeUser(state.pendingAction.user.id, state.session.token);
      showToast(elements.toastRegion, 'Usuario removido com sucesso.', 'success');
    }

    if (state.pendingAction.type === 'restore') {
      await restoreUser(state.pendingAction.user.id, state.session.token);
      showToast(elements.toastRegion, 'Usuario restaurado com sucesso.', 'success');
    }

    if (state.editingUserId === state.pendingAction.user.id) {
      resetFormMode();
    }

    closeConfirmDialog();

    await Promise.all([
      loadUsers({ showLoading: false }),
      loadStats(),
      loadMetrics(),
      state.activeView === 'audit' ? loadAuditLogs() : Promise.resolve()
    ]);
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.confirmDeleteBtn.disabled = false;
  }
}

async function exportCsv() {
  if (!state.session?.token) {
    return;
  }

  elements.exportCsvBtn.disabled = true;
  const original = elements.exportCsvBtn.textContent;
  elements.exportCsvBtn.textContent = 'Exportando...';

  try {
    const users = await fetchAllUsersForExport({
      ...state.query,
      includeDeleted: state.includeDeleted
    }, state.session.token);

    if (users.length === 0) {
      showToast(elements.toastRegion, 'Nenhum dado para exportar com os filtros atuais.', 'info');
      return;
    }

    const csv = toCsv(users);
    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
    downloadCsv(`usuarios-${timestamp}.csv`, csv);

    showToast(elements.toastRegion, `${users.length} usuario(s) exportado(s).`, 'success');
  } catch (error) {
    if (error.statusCode === 401) {
      handleSessionExpired();
      return;
    }

    showToast(elements.toastRegion, getErrorMessage(error), 'error');
  } finally {
    elements.exportCsvBtn.disabled = false;
    elements.exportCsvBtn.textContent = original;
  }
}

function applyPermissionsToUI() {
  const permissions = getCurrentPermissions();
  const role = state.session?.user?.role ?? 'viewer';
  const auditNavButton = elements.navButtons.find((button) => button.dataset.viewTarget === 'audit');

  if (!permissions.canReadAudit && state.activeView === 'audit') {
    state.activeView = 'operations';
    persistActiveView();
  }

  if (auditNavButton) {
    auditNavButton.classList.toggle('is-hidden', !permissions.canReadAudit);
    auditNavButton.disabled = !permissions.canReadAudit;
    auditNavButton.title = permissions.canReadAudit ? '' : 'Disponivel apenas para administradores';
  }

  if (!permissions.canReadAudit) {
    state.auditSearchTerm = '';
    elements.auditSearchInput.value = '';
  }

  if (!permissions.canToggleDeleted) {
    state.includeDeleted = false;
    elements.includeDeletedInput.checked = false;
    persistIncludeDeleted();
  }

  applyRoleCapabilities(elements, permissions, role);
  setActiveView(elements, state.activeView);
  renderMetrics(elements, state.metrics, permissions.canReadMetrics);
}

function handleSessionExpired() {
  state.session = null;
  persistSession();
  setAuthState(elements, false);
  renderSession(elements, null);
  resetFormMode();
  clearAutoRefreshTimers();
  state.lastSyncAt = null;
  setLastSync(elements, state.lastSyncAt);
  configureAutoRefresh();
  state.auditSearchTerm = '';
  elements.auditSearchInput.value = '';
  showToast(elements.toastRegion, 'Sua sessao expirou. Entre novamente.', 'error');
}
