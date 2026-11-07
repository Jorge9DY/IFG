// Retratos provisionales: una cara ultra sencilla en SVG, generada a partir del id del héroe (siempre la misma
// para el mismo héroe). Piel, pelo, ojos y boca varían; el accesorio y el color de los hombros dicen su clase.
// Es solo decoración: usa su propia semilla y no toca el azar de la partida.

import { Azar } from '../motor/azar';
import type { Heroe } from '../motor/tipos';

const PIELES = ['#f2d3b3', '#e6b98f', '#c98f63', '#a9714b', '#7c4f33', '#5a3a26'];
const PELOS = ['#1d1a17', '#4a2f1f', '#8a5a2b', '#c9a15a', '#e8e0d0', '#b5432f', '#3b4f7a', '#6b8f4e'];
const CLASE: Record<string, { ropa: string; fondo: string }> = {
  Guerrero: { ropa: '#b8673a', fondo: '#3a2a22' },
  Mago: { ropa: '#7d62c4', fondo: '#2a2440' },
  Explorador: { ropa: '#5f8f4a', fondo: '#22331f' },
  Sanador: { ropa: '#3fb8c8', fondo: '#1c3236' },
};

function semilla(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** SVG del retrato de un héroe (cuadrado, escalable con CSS). */
export function retrato(h: Pick<Heroe, 'id' | 'clase'>): string {
  const a = new Azar(semilla(h.id));
  const piel = a.elegir(PIELES);
  const pelo = a.elegir(PELOS);
  const estilo = a.entero(0, 4);
  const c = CLASE[h.clase] ?? { ropa: '#888', fondo: '#2b2b2b' };
  const ojosY = 22 + a.entero(-1, 1);
  const boca = a.probabilidad(50) ? `<path d="M21 28 Q24 ${30 + a.entero(0, 1)} 27 28" stroke="#4a2a20" stroke-width="1.2" fill="none"/>` : '<path d="M21.5 28.5 H26.5" stroke="#4a2a20" stroke-width="1.2"/>';
  const peinados = [
    `<path d="M14 21 Q14 10 24 10 Q34 10 34 21 Q30 14 24 14 Q18 14 14 21Z" fill="${pelo}"/>`,
    `<path d="M13 32 V20 Q13 9 24 9 Q35 9 35 20 V32 H31 V20 Q24 13 17 20 V32Z" fill="${pelo}"/>`,
    `<path d="M14 20 L16 11 L19 15 L22 9 L25 14 L28 9 L30 15 L33 11 L34 20 Q24 13 14 20Z" fill="${pelo}"/>`,
    '',
    `<circle cx="24" cy="8" r="4" fill="${pelo}"/><path d="M14 20 Q15 11 24 11 Q33 11 34 20 Q24 15 14 20Z" fill="${pelo}"/>`,
  ];
  const accesorios: Record<string, string> = {
    Guerrero: '<path d="M13.5 19 Q14 9 24 9 Q34 9 34.5 19 H13.5Z" fill="#8d9499"/><rect x="23" y="17" width="2" height="7" fill="#8d9499"/>',
    Mago: `<path d="M12 16 H36 L27 4 L24 1 Z" fill="${c.ropa}"/><circle cx="25" cy="10" r="1.3" fill="#e9c46a"/>`,
    Explorador: `<path d="M12 30 Q11 8 24 8 Q37 8 36 30 L33 30 Q34 13 24 13 Q14 13 15 30Z" fill="${c.ropa}" opacity="0.95"/>`,
    Sanador: '<rect x="14" y="14" width="20" height="3" fill="#eceef0"/><path d="M23 13.5 h2 v1.5 h1.5 v1.5 h-1.5 v1.5 h-2 v-1.5 h-1.5 v-1.5 h1.5z" fill="#e8574f"/>',
  };
  return `<svg class="retrato" viewBox="0 0 48 48" role="img" aria-label="Retrato de ${h.clase.toLowerCase()}">
    <rect width="48" height="48" fill="${c.fondo}"/>
    <path d="M5 48 Q8 34 24 34 Q40 34 43 48Z" fill="${c.ropa}"/>
    <rect x="21" y="28" width="6" height="7" fill="${piel}"/>
    ${estilo === 1 ? peinados[1] : ''}
    <ellipse cx="24" cy="21" rx="9.5" ry="10.5" fill="${piel}"/>
    <circle cx="20.5" cy="${ojosY}" r="1.3" fill="#1d1a17"/><circle cx="27.5" cy="${ojosY}" r="1.3" fill="#1d1a17"/>
    ${boca}
    ${estilo === 1 ? '' : peinados[estilo] ?? ''}
    ${a.probabilidad(70) ? accesorios[h.clase] ?? '' : ''}
  </svg>`;
}
