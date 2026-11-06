// Puntos de Gremio y clasificación (sección 11).

import balance from '../datos/balance.json';
import type { Gremio, Rango } from './tipos';

export function puntosMision(rango: Rango): number {
  return balance.misiones[rango].puntos;
}

/** Prestigio ganado (o perdido) desde el inicio de la temporada. */
export function prestigioGanado(gremio: Gremio): number {
  return gremio.prestigio - (gremio.prestigioInicioTemporada ?? gremio.prestigio);
}

/**
 * Puntos de Gremio de la temporada en curso: cada temporada es una carrera nueva.
 * Puntos = 3 × prestigio ganado en la temporada + puntos de misión de la temporada.
 */
export function puntosGremio(gremio: Gremio): number {
  const r = balance.ranking;
  return r.pesoPrestigioGanado * prestigioGanado(gremio) + r.pesoReputacion * gremio.reputacion + gremio.puntosMisionTemporada;
}

export interface FilaClasificacion {
  puesto: number;
  gremioId: string;
  nombre: string;
  puntos: number;
}

/** Ordena por Puntos de Gremio; en empate, más prestigio total va antes. */
export function clasificacion(gremios: readonly Gremio[]): FilaClasificacion[] {
  return [...gremios]
    .sort((a, b) => puntosGremio(b) - puntosGremio(a) || b.prestigio - a.prestigio)
    .map((g, i) => ({ puesto: i + 1, gremioId: g.id, nombre: g.nombre, puntos: puntosGremio(g) }));
}
