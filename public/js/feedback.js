export function showToast(container, message, kind = 'info') {
  const toast = document.createElement('article');
  toast.className = 'toast';
  toast.dataset.kind = kind;
  toast.textContent = message;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3400);
}

export function getErrorMessage(error) {
  if (error?.statusCode === 401) {
    return 'Sessao invalida ou expirada. Realize login novamente.';
  }

  if (error?.statusCode === 403) {
    return 'Seu perfil nao possui permissao para esta acao.';
  }

  if (error?.statusCode === 409) {
    return 'Email ja cadastrado para outro usuario ativo.';
  }

  if (error?.statusCode === 429) {
    return 'Limite de requisicoes atingido. Tente novamente em instantes.';
  }

  if (error?.statusCode === 400) {
    return error.message;
  }

  if (error?.statusCode === 503) {
    return 'Servico temporariamente indisponivel. Tente novamente.';
  }

  return error?.message ?? 'Erro inesperado.';
}