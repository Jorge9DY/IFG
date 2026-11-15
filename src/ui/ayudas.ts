// Ayudas para que el juego sea fácil de usar sin quitar decisiones: equipo recomendado y dificultad.
// Solo leen el estado y usan reglas del motor.

import { oroLibre, sueldosDe } from '../motor/economia';
import { diasParaPrueba, heroesDe, jugador, type EstadoJuego } from '../motor/estado';
import { infoInstalacion, plazasLibres } from '../motor/instalaciones';
import { motivoNoIr } from '../motor/habilidades';
import { afinidad, atraccion, choque, sonPareja } from '../motor/relaciones';
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

/**
 * Objetivo del momento (estilo Nintendo: una sola cosa clara que hacer ahora). Por orden de urgencia:
 * asuntos del gremio, sueldos en peligro, héroes libres sin misión, oro parado y, si todo va bien,
 * el siguiente gremio al que adelantar. `abrir` es el panel que lo resuelve.
 */
export function objetivoDelMomento(estado: EstadoJuego): { texto: string; abrir: 'gremio' | 'misiones' | 'mercado' | null } {
  const j = jugador(estado);
  const urgente = estado.social.pendientes.find((p) => ['abandono', 'crisis', 'duelo'].includes(p.eventoId));
  if (urgente) return { texto: 'Hay un asunto urgente en el gremio', abrir: 'gremio' };
  const sueldos = sueldosDe(estado, j.id);
  if (j.oro < sueldos && diasParaPrueba(estado.dia) <= 2) return { texto: `Faltan ${(sueldos - j.oro).toLocaleString('es-ES')} de oro para los sueldos del día 7`, abrir: 'misiones' };
  const libres = heroesLibres(estado);
  const buena = estado.tablon.find((m) => (probabilidadRecomendada(estado, m) ?? 0) >= 70);
  if (libres.length > 0 && buena) return { texto: `${libres.length === 1 ? 'Tienes un héroe libre' : `Tienes ${libres.length} héroes libres`}: mándalos de misión`, abrir: 'misiones' };
  if (estado.social.pendientes.length) return { texto: 'Un héroe espera tu decisión', abrir: 'gremio' };
  const sobra = oroLibre(estado, j.id);
  const sede = infoInstalacion(estado, j.id, 'sede');
  if (plazasLibres(estado, j.id) <= 1 && sede.coste !== null && sobra >= sede.coste) return { texto: `Te sobra oro: amplía la sede para fichar más héroes (${sede.coste.toLocaleString('es-ES')})`, abrir: 'gremio' };
  if (diasParaPrueba(estado.dia) <= 2 && plazasLibres(estado, j.id) > 0) return { texto: 'Guarda oro: en la Prueba llegan novatos', abrir: null };
  const filas = estado.ranking;
  const mio = filas.find((f) => f.gremioId === j.id);
  const delante = mio ? filas.find((f) => f.puesto === mio.puesto - 1) : undefined;
  if (mio && delante) return { texto: `Alcanza a ${estado.gremios[delante.gremioId]?.nombre}: te faltan ${(delante.puntos - mio.puntos).toLocaleString('es-ES')} puntos`, abrir: null };
  return { texto: 'Defiende el primer puesto', abrir: null };
}

/**
 * Dilema diario: el equipo que más une. Entre los equipos con al menos un 70% de éxito, el que junta a
 * quienes más se aprecian o se atraen (y evita los choques de carácter). Vacío si no hay otro que valga la pena.
 */
export function equipoQueUne(estado: EstadoJuego, mision: Mision, candidatos = heroesLibres(estado)): Heroe[] {
  if (mision.equipo < 2) return [];
  const ordenados = [...candidatos].sort((a, b) => b.poder - a.poder);
  const valor = (e: Heroe[]): number => {
    let v = 0;
    for (let i = 0; i < e.length; i++)
      for (let j = i + 1; j < e.length; j++) {
        const a = e[i]!;
        const b = e[j]!;
        v += afinidad(estado, a.id, b.id) + Math.max(atraccion(estado, a.id, b.id), atraccion(estado, b.id, a.id)) + (sonPareja(estado, a.id, b.id) ? 50 : 0) - (choque(a, b) ? 30 : 0);
      }
    return v;
  };
  const opciones = equiposPosibles(ordenados, mision.equipo)
    .filter((e) => e.length > 1 && e.every((h) => !motivoNoIr(estado, h, e.map((x) => x.id))))
    .filter((e) => probabilidadJugador(estado, mision, e) >= 70)
    .map((e) => ({ e, v: valor(e) }))
    .sort((a, b) => b.v - a.v);
  const mejor = opciones[0];
  if (!mejor || mejor.v <= 0) return [];
  const seguro = equipoRecomendado(estado, mision).map((h) => h.id).sort().join();
  return mejor.e.map((h) => h.id).sort().join() === seguro ? [] : mejor.e;
}
