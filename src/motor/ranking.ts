// Ranking y puntos de gremio (biblia, sección 6): Puntos = Fuerza + Prestigio.

import balance from '../datos/balance.json';
import { heroesDe, type EstadoJuego, type FilaRanking } from './estado';
import type { Gremio } from './tipos';

const R = balance.ranking;

/** Fuerza: suma del poder de los 5 mejores héroes. El banquillo no resta. */
export function fuerza(estado: EstadoJuego, gremioId: string): number {
  return heroesDe(estado, gremioId)
    .map((h) => h.poder)
    .sort((a, b) => b - a)
    .slice(0, R.heroesFuerza)
    .reduce((t, p) => t + p, 0);
}

/** Prestigio: instalaciones + misiones de rango alto completadas + novatos destacados fichados + retos ganados. */
export function prestigio(g: Gremio): number {
  return (
    R.prestigioPorNivelInstalacion * (g.nivelSede + g.nivelOjeadores + (g.nivelEntrenamiento ?? 0)) +
    R.prestigioPorMisionAlta * g.misionesAltas +
    R.prestigioPorNovatoDestacado * g.novatosDestacados +
    R.prestigioPorReto * (g.retosGanados ?? 0)
  );
}

/** Clasificación con los valores de ahora (el ranking oficial solo se guarda el día 7). */
export function calcularRanking(estado: EstadoJuego): FilaRanking[] {
  return Object.values(estado.gremios)
    .map((g) => {
      const f = fuerza(estado, g.id);
      const p = prestigio(g);
      return { gremioId: g.id, fuerza: f, prestigio: p, puntos: f + p, puesto: 0 };
    })
    .sort((a, b) => b.puntos - a.puntos || b.fuerza - a.fuerza)
    .map((fila, i) => ({ ...fila, puesto: i + 1 }));
}

/** Premio en oro al cerrar la temporada según la posición. */
export function premioTemporada(puesto: number): number {
  return balance.temporada.premios[puesto - 1] ?? 0;
}
