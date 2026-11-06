// Utilidades para pintar HTML de forma segura.

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(texto: string | number): string {
  return String(texto).replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

const numero = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);
export function num(n: number): string {
  return numero.format(n);
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}
