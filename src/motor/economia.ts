// Economía (biblia, sección 4): sueldos semanales pagados el día 7, antes de la Prueba de los Novatos.

import balance from '../datos/balance.json';
import { gremio, heroesDe, registrar, type EstadoJuego } from './estado';
import { sueldo } from './heroes';

export function sueldosDe(estado: EstadoJuego, gremioId: string): number {
  return heroesDe(estado, gremioId).reduce((t, h) => t + sueldo(h), 0);
}

export interface PagoSueldos {
  total: number;
  /** false si no había oro suficiente. */
  completo: boolean;
}

/**
 * Paga los sueldos de la semana. Si no hay oro suficiente, el oro queda en negativo y cada héroe pierde
 * lealtad. Consecuencia provisional: la biblia la deja [Abierto] (ver docs/preguntas.md).
 */
export function pagarSueldos(estado: EstadoJuego, gremioId: string): PagoSueldos {
  const g = gremio(estado, gremioId);
  const total = sueldosDe(estado, gremioId);
  const completo = g.oro >= total;
  g.oro -= total;
  if (!completo) {
    for (const h of heroesDe(estado, gremioId)) h.lealtad = Math.max(0, h.lealtad - balance.sueldos.lealtadSiNoCobra);
    if (g.esJugador) registrar(estado, 'sueldos', `No llega el oro para los sueldos (${total}). Tus héroes cobran tarde y pierden lealtad.`);
  }
  return { total, completo };
}

/** Oro que se puede gastar sin dejar de cubrir los próximos sueldos. */
export function oroLibre(estado: EstadoJuego, gremioId: string): number {
  return Math.max(0, gremio(estado, gremioId).oro - sueldosDe(estado, gremioId));
}
