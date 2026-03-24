const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value) {
  if (value === 0) return 'R$ 0,00';
  return currencyFormatter.format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function pluralize(count, singular, plural) {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural || singular + 's'}`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value);
}
