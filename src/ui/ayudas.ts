// Ayudas para que el juego sea fácil de usar sin quitar decisiones: equipo recomendado y dificultad.
// Solo leen el estado y usan reglas del motor.

import { heroesDe, type EstadoJuego } from '../motor/estado';
import { modificadoresMision } from '../motor/desarrollo';
import { poderEquipo, probabilidadMision } from '../motor/misiones';
import type { Heroe, Mision } from '../motor/tipos';

/** Héroes del jugador que pueden salir de misión ahora. */
export function heroesLibres(estado: EstadoJuego): Heroe[] {
  return heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'libre');
}

function combinaciones<T>(lista: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const resultado: T[][] = [];
  lista.forEach((x, i) => {
    for (const resto of combinaciones(lista.slice(i + 1), k - 1)) resultado.push([x, ...resto]);
  });
  return resultado;
}

/**
 * Equipo recomendado: de los equipos del tamaño exacto que llegan al 80% de éxito (contando las clases
 * que favorece la misión), el de menos poder, para no gastar a los mejores. Si ninguno llega, el de más éxito. Vacío si no hay héroes suficientes.
 */
export function equipoRecomendado(estado: EstadoJuego, mision: Mision, candidatos = heroesLibres(estado)): Heroe[] {
  if (candidatos.length < mision.equipo) return [];
  const opciones = combinaciones([...candidatos].sort((a, b) => b.poder - a.poder).slice(0, 12), mision.equipo);
  const bonus = modificadoresMision(estado, estado.jugadorId).exito;
  const llegan = opciones.filter((e) => probabilidadMision(mision, e, bonus) >= 80);
  const orden = (a: Heroe[], b: Heroe[]): number => poderEquipo(a) - poderEquipo(b);
  if (llegan.length > 0) return llegan.sort(orden)[0] ?? [];
  return opciones.sort((a, b) => probabilidadMision(mision, a, bonus) - probabilidadMision(mision, b, bonus) || orden(a, b)).at(-1) ?? [];
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
  return probabilidadMision(mision, equipo, modificadoresMision(estado, estado.jugadorId).exito);
}
