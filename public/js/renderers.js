import { createActionButton, createEmptyState, createSkeleton } from './dom.js';
import { formatDate } from './utils.js';

export function applyDensity(elements, density) {
  elements.body.dataset.density = density;
  elements.densityToggleBtn.textContent = density === 'compact' ? 'Modo confortavel' : 'Modo compacto';
}

export function setHealthStatus(elements, isOnline) {
  if (isOnline) {
    elements.healthStatus.textContent = 'Servico online';
    elements.healthStatus.style.background = '#ecfdf5';
    elements.healthStatus.style.color = '#0b7a49';
    elements.healthStatus.style.borderColor = 'rgba(11,122,73,0.28)';
    return;
  }

  elements.healthStatus.textContent = 'Servico indisponivel';
  elements.healthStatus.style.background = '#fef2f2';
  elements.healthStatus.style.color = '#b3261e';
  elements.healthStatus.style.borderColor = 'rgba(179,38,30,0.25)';
}

export function syncFilterControls(elements, query) {
  elements.searchInput.value = query.search;
  elements.sortBySelect.value = query.sortBy;
  elements.sortOrderSelect.value = query.sortOrder;
  elements.limitSelect.value = String(query.limit);
}

export function setFeedback(elements, message) {
  elements.feedback.textContent = message;
}

export function setUsersLoading(elements, isLoading) {
  elements.usersRegion.setAttribute('aria-busy', isLoading ? 'true' : 'false');

  if (!isLoading) {
    return;
  }

  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 5;
  loadingCell.appendChild(createSkeleton());
  loadingRow.appendChild(loadingCell);

  elements.usersTableBody.replaceChildren(loadingRow);

  const cardsSkeleton = document.createElement('div');
  cardsSkeleton.className = 'loading-skeleton';

  for (let index = 0; index < 3; index += 1) {
    const line = document.createElement('span');
    line.style.width = `${88 - index * 10}%`;
    cardsSkeleton.appendChild(line);
  }

  elements.usersCards.replaceChildren(cardsSkeleton);
}

export function renderUsers(elements, users) {
  if (users.length === 0) {
    const emptyTableRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.appendChild(
      createEmptyState('Nenhum usuario encontrado', 'Altere os filtros ou cadastre um novo usuario para continuar.')
    );
    emptyTableRow.appendChild(emptyCell);

    elements.usersTableBody.replaceChildren(emptyTableRow);
    elements.usersCards.replaceChildren(
      createEmptyState('Sem resultados', 'Nao encontramos usuarios para o filtro aplicado.')
    );
    return;
  }

  const tableFragment = document.createDocumentFragment();
  const cardsFragment = document.createDocumentFragment();

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.style.setProperty('--row-index', String(index));

    const idCell = document.createElement('td');
    idCell.textContent = String(user.id);

    const nameCell = document.createElement('td');
    const nameStrong = document.createElement('span');
    nameStrong.className = 'user-name';
    nameStrong.textContent = user.name;
    nameCell.appendChild(nameStrong);

    const emailCell = document.createElement('td');
    const emailSpan = document.createElement('span');
    emailSpan.className = 'user-email';
    emailSpan.textContent = user.email;
    emailCell.appendChild(emailSpan);

    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = formatDate(user.createdAt);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'cell-actions';
    actions.appendChild(createActionButton('Editar', 'edit', user.id));
    actions.appendChild(createActionButton('Copiar email', 'copyEmail', user.id));
    actions.appendChild(createActionButton('Excluir', 'delete', user.id, { kind: 'danger' }));
    actionsCell.appendChild(actions);

    row.append(idCell, nameCell, emailCell, createdAtCell, actionsCell);
    tableFragment.appendChild(row);

    const card = document.createElement('article');
    card.className = 'user-card';

    const title = document.createElement('h3');
    title.textContent = user.name;

    const email = document.createElement('p');
    const emailLabel = document.createElement('strong');
    emailLabel.textContent = 'Email:';
    email.append(emailLabel, ` ${user.email}`);

    const id = document.createElement('p');
    const idLabel = document.createElement('strong');
    idLabel.textContent = 'ID:';
    id.append(idLabel, ` ${user.id}`);

    const createdAt = document.createElement('p');
    const createdAtLabel = document.createElement('strong');
    createdAtLabel.textContent = 'Criado:';
    createdAt.append(createdAtLabel, ` ${formatDate(user.createdAt)}`);

    const cardActions = document.createElement('div');
    cardActions.className = 'cell-actions';
    cardActions.appendChild(createActionButton('Editar', 'edit', user.id));
    cardActions.appendChild(createActionButton('Copiar email', 'copyEmail', user.id));
    cardActions.appendChild(createActionButton('Excluir', 'delete', user.id, { kind: 'danger' }));

    card.append(title, email, id, createdAt, cardActions);
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
  elements.totalUsersValue.textContent = String(stats.totalUsers ?? 0);
  elements.topDomainValue.textContent = stats.topDomains?.[0]?.domain ?? '-';

  const domainItems = [];
  const domains = stats.topDomains?.length ? stats.topDomains : [{ domain: '-', count: 0 }];
  for (const item of domains) {
    const li = document.createElement('li');

    const domainName = document.createElement('span');
    domainName.textContent = item.domain;

    const domainCount = document.createElement('strong');
    domainCount.textContent = String(item.count);

    li.append(domainName, domainCount);
    domainItems.push(li);
  }

  elements.domainList.replaceChildren(...domainItems);

  const recentItems = [];
  const recentUsers = stats.recentUsers?.length ? stats.recentUsers : [{ name: 'Sem registros', email: '-' }];
  for (const user of recentUsers) {
    const li = document.createElement('li');

    const userName = document.createElement('span');
    userName.textContent = user.name;

    const userEmail = document.createElement('small');
    userEmail.textContent = user.email;

    li.append(userName, userEmail);
    recentItems.push(li);
  }

  elements.recentList.replaceChildren(...recentItems);
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
