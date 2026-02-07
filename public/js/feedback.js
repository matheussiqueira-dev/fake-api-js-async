export function showToast(container, message, kind = 'info') {
  const toast = document.createElement('article');
  toast.className = 'toast';
  toast.dataset.kind = kind;
  toast.textContent = message;

  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

export function getErrorMessage(error) {
  if (error?.statusCode === 409) {
    return 'Email ja cadastrado. Utilize outro email.';
  }

  if (error?.statusCode === 400) {
    return error.message;
  }

  if (error?.statusCode === 503) {
    return 'Servico temporariamente indisponivel. Tente novamente.';
  }

  return error?.message ?? 'Erro inesperado.';
}