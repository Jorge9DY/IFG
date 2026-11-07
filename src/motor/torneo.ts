// Torneo de fin de temporada (biblia, sección 1, [Propuesta]): competición directa entre gremios por
// categorías. Cada gremio presenta a su mejor héroe de cada clase y al mejor de todos (categoría absoluta);
// gana el de más poder. Premia tener una plantilla capaz de competir en todas las categorías.

import datos from '../datos/desarrollo.json';
import type { Azar } from './azar';
import { gremio, heroesDe, registrar, type EstadoJuego } from './estado';
import type { Heroe } from './tipos';

const T = datos.torneo;

export interface CombateTorneo {
  categoria: string;
  /** Campeón de cada gremio en esta categoría (null si no tiene a nadie de esa clase). */
  campeones: { gremioId: string; heroeId: string; nombre: string; poder: number }[];
  ganador: string | null;
}

function campeon(heroes: Heroe[], categoria: string): Heroe | null {
  const validos = categoria === 'Absoluta' ? heroes : heroes.filter((h) => h.clase === categoria);
  return [...validos].sort((a, b) => b.poder - a.poder)[0] ?? null;
}

/** Celebra el torneo: decide cada categoría y reparte oro y prestigio a los ganadores. */
export function celebrarTorneo(estado: EstadoJuego, azar: Azar): CombateTorneo[] {
  const combates: CombateTorneo[] = [];
  for (const categoria of T.categorias) {
    const campeones = Object.values(estado.gremios)
      .map((g) => ({ g, h: campeon(heroesDe(estado, g.id), categoria) }))
      .filter((x): x is { g: (typeof x)['g']; h: Heroe } => x.h !== null)
      .map(({ g, h }) => ({ gremioId: g.id, heroeId: h.id, nombre: h.nombre, poder: h.poder }));
    const mejor = Math.max(0, ...campeones.map((c) => c.poder));
    const empatados = campeones.filter((c) => c.poder === mejor);
    const ganador = empatados.length ? azar.elegir(empatados).gremioId : null;
    if (ganador) {
      const g = gremio(estado, ganador);
      g.oro += T.oroPorCategoria;
      g.torneosGanados = (g.torneosGanados ?? 0) + 1;
      if (g.esJugador) registrar(estado, 'temporada', `¡Tu gremio gana la categoría ${categoria} del torneo!`);
    }
    combates.push({ categoria, campeones, ganador });
  }
  return combates;
}
