const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatMoney(value: number): string {
  return formatter.format(value);
}

const IVA_RATE = 0.19;

// Los precios ya incluyen el IVA; esto solo lo desglosa para mostrárselo al
// cajero. Puramente visual — el backend recalcula el IVA real internamente,
// este valor nunca viaja en el payload de la venta.
export function calcularIvaIncluido(total: number): number {
  return Math.round((total - total / (1 + IVA_RATE)) * 100) / 100;
}
