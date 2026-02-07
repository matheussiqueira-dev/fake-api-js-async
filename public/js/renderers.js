import { createActionButton, createEmptyState, createSkeleton } from './dom.js';
import { describeRole, formatDate, formatTime } from './utils.js';

export function applyDensity(elements, density) {
  elements.body.dataset.density = density;
  elements.densityToggleBtn.textContent = density === 'compact' ? 'Modo confortavel' : 'Modo compacto';
  elements.densityToggleBtn.setAttribute('aria-pressed', density === 'compact' ? 'true' : 'false');
}

export function applyLayoutMode(elements, focusModeEnabled) {
  elements.body.dataset.layout = focusModeEnabled ? 'focus' : 'default';
  elements.focusModeBtn.textContent = focusModeEnabled ? 'Layout padrao' : 'Focus mode';
  elements.focusModeBtn.setAttribute('aria-pressed', focusModeEnabled ? 'true' : 'false');
}

export function syncAutoRefreshControls(elements, preferences) {
  elements.autoRefreshInput.checked = preferences.autoRefreshEnabled === true;
  elements.autoRefreshIntervalSelect.value = String(preferences.autoRefreshIntervalSec);
}

export function setRefreshCountdownLabel(elements, message) {
  elements.refreshCountdownLabel.textContent = message;
}

export function setLastSync(elements, value) {
  if (!value) {
    elements.lastSyncLabel.textContent = 'Ultima sincronizacao: -';
    return;
  }

  elements.lastSyncLabel.textContent = `Ultima sincronizacao: ${formatTime(value)}`;
}

export function setHealthStatus(elements, isOnline) {
  elements.healthStatus.classList.remove('status-pill--online', 'status-pill--offline');

  if (isOnline) {
    elements.healthStatus.textContent = 'Servico online';
    elements.healthStatus.classList.add('status-pill--online');
    return;
  }

  elements.healthStatus.textContent = 'Servico indisponivel';
  elements.healthStatus.classList.add('status-pill--offline');
}

export function setAuthState(elements, isAuthenticated) {
  elements.authGate.classList.toggle('is-hidden', isAuthenticated);
  elements.appContent.classList.toggle('is-hidden', !isAuthenticated);
  elements.logoutBtn.disabled = !isAuthenticated;
}

export function renderSession(elements, session) {
  if (!session?.user) {
    elements.sessionUsername.textContent = '-';
    elements.sessionRole.textContent = '-';
    return;
  }

  elements.sessionUsername.textContent = session.user.username;
  elements.sessionRole.textContent = describeRole(session.user.role);
}

export function setActiveView(elements, view) {
  elements.navButtons.forEach((button) => {
    const isActive = button.dataset.viewTarget === view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  elements.operationsView.classList.toggle('is-active', view === 'operations');
  elements.auditView.classList.toggle('is-active', view === 'audit');
}

export function syncFilterControls(elements, query, includeDeleted) {
  elements.searchInput.value = query.search;
  elements.sortBySelect.value = query.sortBy;
  elements.sortOrderSelect.value = query.sortOrder;
  elements.limitSelect.value = String(query.limit);
  elements.includeDeletedInput.checked = includeDeleted === true;
}

export function setFeedback(elements, message) {
  elements.feedback.textContent = message;
}

export function setAuditFeedback(elements, message) {
  elements.auditFeedback.textContent = message;
}

export function setUsersLoading(elements, isLoading) {
  elements.usersRegion.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  if (!isLoading) {
    return;
  }

  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.appendChild(createSkeleton(6));
  row.appendChild(cell);

  elements.usersTableBody.replaceChildren(row);
  elements.usersCards.replaceChildren(createSkeleton(4));
}

export function setAuditLoading(elements, isLoading) {
  elements.auditRegion.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  if (!isLoading) {
    return;
  }

  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 5;
  cell.appendChild(createSkeleton(5));
  row.appendChild(cell);

  elements.auditTableBody.replaceChildren(row);
}

export function renderUsers(elements, users, permissions) {
  if (users.length === 0) {
    const emptyTableRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.appendChild(createEmptyState('Sem usuarios para este filtro', 'Ajuste os filtros para visualizar resultados.'));
    emptyTableRow.appendChild(emptyCell);

    elements.usersTableBody.replaceChildren(emptyTableRow);
    elements.usersCards.replaceChildren(
      createEmptyState('Sem resultados', 'Nao existem usuarios para o contexto selecionado.')
    );
    return;
  }

  const tableFragment = document.createDocumentFragment();
  const cardsFragment = document.createDocumentFragment();

  users.forEach((user, index) => {
    const isDeleted = Boolean(user.deletedAt);

    const row = document.createElement('tr');
    row.style.setProperty('--row-index', String(index));

    const idCell = document.createElement('td');
    idCell.textContent = String(user.id);

    const nameCell = document.createElement('td');
    nameCell.textContent = user.name;

    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;

    const updatedCell = document.createElement('td');
    updatedCell.textContent = formatDate(user.updatedAt ?? user.createdAt);

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge';
    statusBadge.dataset.status = isDeleted ? 'deleted' : 'active';
    statusBadge.textContent = isDeleted ? 'Removido' : 'Ativo';
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'cell-actions';

    if (!isDeleted) {
      actions.appendChild(createActionButton('Copiar email', 'copyEmail', user.id));

      if (permissions.canEdit) {
        actions.appendChild(createActionButton('Editar', 'edit', user.id));
      }

      if (permissions.canDelete) {
        actions.appendChild(createActionButton('Remover', 'delete', user.id, { kind: 'danger' }));
      }
    }

    if (isDeleted && permissions.canRestore) {
      actions.appendChild(createActionButton('Restaurar', 'restore', user.id, { kind: 'warn' }));
    }

    if (actions.children.length === 0) {
      actions.appendChild(createActionButton('Sem permissao', 'none', user.id, { disabled: true }));
    }

    actionsCell.appendChild(actions);

    row.append(idCell, nameCell, emailCell, updatedCell, statusCell, actionsCell);
    tableFragment.appendChild(row);

    const card = document.createElement('article');
    card.className = 'user-card';

    const title = document.createElement('h4');
    title.textContent = user.name;

    const infoEmail = document.createElement('p');
    const emailLabel = document.createElement('strong');
    emailLabel.textContent = 'Email:';
    infoEmail.append(emailLabel, ` ${user.email}`);

    const infoId = document.createElement('p');
    const idLabel = document.createElement('strong');
    idLabel.textContent = 'ID:';
    infoId.append(idLabel, ` ${user.id}`);

    const infoStatus = document.createElement('p');
    const statusLabel = document.createElement('strong');
    statusLabel.textContent = 'Status:';
    infoStatus.append(statusLabel, ` ${isDeleted ? 'Removido' : 'Ativo'}`);

    const infoUpdated = document.createElement('p');
    const updatedLabel = document.createElement('strong');
    updatedLabel.textContent = 'Atualizado:';
    infoUpdated.append(updatedLabel, ` ${formatDate(user.updatedAt ?? user.createdAt)}`);

    const cardActions = document.createElement('div');
    cardActions.className = 'cell-actions';

    if (!isDeleted) {
      cardActions.appendChild(createActionButton('Copiar email', 'copyEmail', user.id));

      if (permissions.canEdit) {
        cardActions.appendChild(createActionButton('Editar', 'edit', user.id));
      }

      if (permissions.canDelete) {
        cardActions.appendChild(createActionButton('Remover', 'delete', user.id, { kind: 'danger' }));
      }
    }

    if (isDeleted && permissions.canRestore) {
      cardActions.appendChild(createActionButton('Restaurar', 'restore', user.id, { kind: 'warn' }));
    }

    if (cardActions.children.length === 0) {
      cardActions.appendChild(createActionButton('Sem permissao', 'none', user.id, { disabled: true }));
    }

    card.append(title, infoEmail, infoId, infoStatus, infoUpdated, cardActions);
    cardsFragment.appendChild(card);
  });

  elements.usersTableBody.replaceChildren(tableFragment);
  elements.usersCards.replaceChildren(cardsFragment);
}

export function renderPagination(elements, meta) {
  elements.paginationLabel.textContent = `Pagina ${meta.page} de ${meta.totalPages}`;
  elements.prevPageBtn.disabled = !meta.hasPreviousPage;
  elements.nextPageBtn.disabled = !meta.hasNextPage;
}

export function renderStats(elements, stats) {
  const totalUsers = Number(stats.totalUsers ?? 0);
  const activeUsers = Number(stats.activeUsers ?? totalUsers);
  const deletedUsers = Number(stats.deletedUsers ?? Math.max(0, totalUsers - activeUsers));

  elements.totalUsersValue.textContent = String(totalUsers);
  elements.activeUsersLabel.textContent = `Ativos: ${activeUsers}`;
  elements.deletedUsersValue.textContent = String(deletedUsers);

  const topDomain = stats.topDomains?.[0];
  elements.topDomainValue.textContent = topDomain?.domain ?? '-';
  elements.topDomainCount.textContent = `${topDomain?.count ?? 0} ocorrencias`;

  const domainItems = [];
  const domains = stats.topDomains?.length ? stats.topDomains : [{ domain: '-', count: 0 }];
  for (const item of domains) {
    const li = document.createElement('li');

    const left = document.createElement('span');
    left.textContent = item.domain;

    const right = document.createElement('strong');
    right.textContent = String(item.count);

    li.append(left, right);
    domainItems.push(li);
  }

  elements.domainList.replaceChildren(...domainItems);

  const recentItems = [];
  const recent = stats.recentUsers?.length ? stats.recentUsers : [{ name: 'Sem registros', email: '-' }];
  for (const user of recent) {
    const li = document.createElement('li');

    const left = document.createElement('span');
    left.textContent = user.name;

    const right = document.createElement('small');
    right.textContent = user.email;

    li.append(left, right);
    recentItems.push(li);
  }

  elements.recentList.replaceChildren(...recentItems);
}

export function renderMetrics(elements, metrics, canReadMetrics) {
  if (!canReadMetrics) {
    elements.avgLatencyValue.textContent = '-';
    elements.requestCountValue.textContent = 'Sem permissao';
    elements.metricsList.replaceChildren(createMetricRow('Acesso', 'Restrito ao admin'));
    return;
  }

  elements.avgLatencyValue.textContent = `${metrics.averageLatencyMs ?? 0} ms`;
  elements.requestCountValue.textContent = `${metrics.totalRequests ?? 0} requests`;

  const routeEntries = Object.entries(metrics.routes ?? {});
  const topRoutes = routeEntries.sort((left, right) => right[1] - left[1]).slice(0, 6);

  const metricItems = [];

  metricItems.push(createMetricRow('Total requests', String(metrics.totalRequests ?? 0)));
  metricItems.push(createMetricRow('Latencia media', `${metrics.averageLatencyMs ?? 0} ms`));

  for (const [status, count] of Object.entries(metrics.statuses ?? {})) {
    metricItems.push(createMetricRow(`Status ${status}`, String(count)));
  }

  for (const [route, count] of topRoutes) {
    metricItems.push(createMetricRow(route, String(count)));
  }

  if (metricItems.length === 0) {
    metricItems.push(createMetricRow('Sem dados', 'Aguardando requisicoes'));
  }

  elements.metricsList.replaceChildren(...metricItems);
}

export function renderAuditLogs(elements, logs, searchTerm = '') {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  const filteredLogs = normalizedTerm
    ? logs.filter((log) => {
      const metadataText = log.metadata ? JSON.stringify(log.metadata) : '';
      const raw = `${log.action} ${log.actor} ${log.status} ${metadataText}`.toLowerCase();
      return raw.includes(normalizedTerm);
    })
    : logs;

  if (!filteredLogs.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    const title = normalizedTerm ? 'Nenhum evento encontrado no filtro local' : 'Sem eventos de auditoria';
    const description = normalizedTerm
      ? 'Ajuste o texto de busca para ampliar os resultados.'
      : 'Os eventos aparecerao apos operacoes autenticadas.';
    cell.appendChild(createEmptyState(title, description));
    row.appendChild(cell);
    elements.auditTableBody.replaceChildren(row);
    return 0;
  }

  const fragment = document.createDocumentFragment();

  filteredLogs.forEach((log) => {
    const row = document.createElement('tr');

    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = formatDate(log.createdAt);

    const actionCell = document.createElement('td');
    actionCell.textContent = log.action;

    const actorCell = document.createElement('td');
    actorCell.textContent = log.actor;

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = 'badge';
    statusBadge.dataset.status = log.status === 'success' ? 'active' : 'deleted';
    statusBadge.textContent = log.status;
    statusCell.appendChild(statusBadge);

    const detailsCell = document.createElement('td');
    detailsCell.textContent = log.metadata ? JSON.stringify(log.metadata) : '-';

    row.append(createdAtCell, actionCell, actorCell, statusCell, detailsCell);
    fragment.appendChild(row);
  });

  elements.auditTableBody.replaceChildren(fragment);
  return filteredLogs.length;
}

export function renderAuditPagination(elements, meta) {
  elements.auditPaginationLabel.textContent = `Pagina ${meta.page} de ${meta.totalPages}`;
  elements.prevAuditBtn.disabled = !meta.hasPreviousPage;
  elements.nextAuditBtn.disabled = !meta.hasNextPage;
}

export function applyRoleCapabilities(elements, permissions, role) {
  elements.includeDeletedField.classList.toggle('is-hidden', !permissions.canToggleDeleted);

  elements.userForm.classList.toggle('is-hidden', !permissions.canCreate && !permissions.canEdit);

  if (!permissions.canCreate && !permissions.canEdit) {
    elements.permissionHint.textContent = 'Seu perfil possui apenas permissao de leitura.';
  } else if (role === 'editor') {
    elements.permissionHint.textContent = 'Perfil editor: criar e editar usuarios ativos.';
  } else {
    elements.permissionHint.textContent = 'Perfil admin: acesso completo, incluindo remocao e restauracao.';
  }

  elements.refreshAuditBtn.disabled = !permissions.canReadAudit;
  elements.auditSearchInput.disabled = !permissions.canReadAudit;
  elements.clearAuditSearchBtn.disabled = !permissions.canReadAudit;
}

export function setFormMode(elements, mode) {
  if (mode === 'edit') {
    elements.formHeading.textContent = 'Editar cadastro';
    elements.formModeTag.textContent = 'Modo edicao';
    elements.submitBtn.textContent = 'Atualizar usuario';
    elements.cancelEditBtn.classList.remove('is-hidden');
    return;
  }

  elements.formHeading.textContent = 'Novo cadastro';
  elements.formModeTag.textContent = 'Modo criacao';
  elements.submitBtn.textContent = 'Salvar usuario';
  elements.cancelEditBtn.classList.add('is-hidden');
}

export function setFieldError(elements, field, message) {
  const target = field === 'name' ? elements.nameError : elements.emailError;
  const input = field === 'name' ? elements.nameInput : elements.emailInput;

  target.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function clearFieldErrors(elements) {
  setFieldError(elements, 'name', '');
  setFieldError(elements, 'email', '');
}

export function setLoginFieldError(elements, field, message) {
  if (field === 'username') {
    elements.loginUsernameError.textContent = message;
    elements.loginUsername.setAttribute('aria-invalid', message ? 'true' : 'false');
    return;
  }

  elements.loginPasswordError.textContent = message;
  elements.loginPassword.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function clearLoginErrors(elements) {
  setLoginFieldError(elements, 'username', '');
  setLoginFieldError(elements, 'password', '');
}

function createMetricRow(label, value) {
  const li = document.createElement('li');

  const left = document.createElement('span');
  left.textContent = label;

  const right = document.createElement('strong');
  right.textContent = value;

  li.append(left, right);
  return li;
}
