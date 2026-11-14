// Ayudas para que el juego sea fácil de usar sin quitar decisiones: equipo recomendado y dificultad.
// Solo leen el estado y usan reglas del motor.

import { heroesDe, type EstadoJuego } from '../motor/estado';
import { motivoNoIr } from '../motor/habilidades';
import { equiposPosibles, poderEquipo } from '../motor/misiones';
import { probabilidadJugador } from '../motor/partida';
import type { Heroe, Mision } from '../motor/tipos';

/** Héroes del jugador que pueden salir de misión ahora. */
export function heroesLibres(estado: EstadoJuego): Heroe[] {
  return heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'libre');
}

/**
 * Equipo recomendado: de los equipos que llenan los huecos de la misión y llegan al 80% de éxito (con
 * clases, habilidades, ánimo y química), el de menos poder, para no gastar a los mejores. Si ninguno llega,
 * el de más éxito. Vacío si no hay héroes suficientes.
 */
export function equipoRecomendado(estado: EstadoJuego, mision: Mision, candidatos = heroesLibres(estado)): Heroe[] {
  const ordenados = [...candidatos].sort((a, b) => b.poder - a.poder);
  const opciones = equiposPosibles(ordenados, mision.equipo)
    .filter((e) => e.every((h) => !motivoNoIr(estado, h, e.map((x) => x.id))))
    .map((e) => ({ e, p: probabilidadJugador(estado, mision, e) }));
  if (opciones.length === 0) return [];
  const orden = (a: Heroe[], b: Heroe[]): number => poderEquipo(a) - poderEquipo(b);
  const llegan = opciones.filter((o) => o.p >= 80);
  if (llegan.length > 0) return llegan.sort((a, b) => orden(a.e, b.e))[0]?.e ?? [];
  return opciones.sort((a, b) => a.p - b.p || orden(a.e, b.e)).at(-1)?.e ?? [];
}

export type NivelDificultad = 'facil' | 'asequible' | 'arriesgada' | 'muy-dificil' | 'sin-equipo';

export function nivelDificultad(probabilidad: number | null): NivelDificultad {
  if (probabilidad === null) return 'sin-equipo';
  if (probabilidad >= 85) return 'facil';
  if (probabilidad >= 70) return 'asequible';
  if (probabilidad >= 50) return 'arriesgada';
  return 'muy-dificil';
}

/** Probabilidad de éxito con el equipo recomendado (null si no hay héroes libres suficientes). */
export function probabilidadRecomendada(estado: EstadoJuego, mision: Mision): number | null {
  const equipo = equipoRecomendado(estado, mision);
  if (equipo.length === 0) return null;
  return probabilidadJugador(estado, mision, equipo);
}
