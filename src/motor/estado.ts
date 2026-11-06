// Estado completo de una partida y consultas sobre él. Es un objeto plano: se guarda con JSON.stringify.

import balance from '../datos/balance.json';
import type { InformeMision } from './misiones';
import { clasificacion, type FilaClasificacion } from './ranking';
import type { Gremio, Heroe, Mision, Partida, Posicion } from './tipos';

export interface MisionEnCurso {
  mision: Mision;
  gremioId: string;
  equipo: { heroeId: string; posicion: Posicion }[];
  /** Día en cuyo cierre se resuelve. */
  diaFin: number;
  /** Día en que se envió. */
  diaInicio: number;
}

export interface Evento {
  dia: number;
  tipo: 'mision' | 'fichaje' | 'venta' | 'muerte' | 'abandono' | 'despertar' | 'economia' | 'rival' | 'sede' | 'novatos' | 'temporada';
  texto: string;
}

export type FinPartida = null | 'quiebra' | 'fin-temporada';

export interface EstadoJuego {
  version: 2;
  partida: Partida;
  /** Estado del generador aleatorio, para continuar la misma secuencia. */
  azar: number;
  heroes: Record<string, Heroe>;
  gremios: Record<string, Gremio>;
  jugadorId: string;
  /** Las tres misiones del día (fácil, media y difícil). */
  tablon: Mision[];
  enCurso: MisionEnCurso[];
  /** Novatos de la próxima Prueba de Novatos (día 7 de cada semana). */
  novatos: string[];
  /** Afinidad entre pares de héroes (clave "idA|idB" ordenada). */
  afinidades: Record<string, number>;
  exitosTemporada: number;
  /** Misiones con éxito en la semana en curso (si es 0 al cierre, el prestigio decae). */
  exitosSemana: number;
  muertesTemporada: Record<string, number>;
  /** Informes de las misiones del jugador resueltas en el último cierre de día. */
  informes: InformeMision[];
  registro: Evento[];
  fin: FinPartida;
  contadorIds: number;
}

export function jugador(estado: EstadoJuego): Gremio {
  const g = estado.gremios[estado.jugadorId];
  if (!g) throw new Error('No existe el gremio del jugador');
  return g;
}

export function gremio(estado: EstadoJuego, id: string): Gremio {
  const g = estado.gremios[id];
  if (!g) throw new Error(`No existe el gremio ${id}`);
  return g;
}

export function heroe(estado: EstadoJuego, id: string): Heroe {
  const h = estado.heroes[id];
  if (!h) throw new Error(`No existe el héroe ${id}`);
  return h;
}

export function heroesDe(estado: EstadoJuego, gremioId: string): Heroe[] {
  return gremio(estado, gremioId).plantilla.map((id) => heroe(estado, id));
}

/** Comida y equipo de la plantilla: un gasto semanal por héroe según su rango. */
export function manutencionDe(estado: EstadoJuego, gremioId: string): number {
  const tabla = balance.economia.manutencionPorRango;
  // Elara es la dueña del gremio: ni cobra salario ni cuenta como gasto de manutención.
  return heroesDe(estado, gremioId).reduce((t, h) => t + (h.id === 'h_000_elara' ? 0 : tabla[h.rango]), 0);
}

export function salariosDe(estado: EstadoJuego, gremioId: string): number {
  return heroesDe(estado, gremioId).reduce((t, h) => t + (h.contrato?.salario ?? 0), 0);
}

export function rivales(estado: EstadoJuego): Gremio[] {
  return Object.values(estado.gremios).filter((g) => !g.esJugador);
}

export function tabla(estado: EstadoJuego): FilaClasificacion[] {
  return clasificacion(Object.values(estado.gremios));
}

export function puesto(estado: EstadoJuego, gremioId: string): number {
  return tabla(estado).find((f) => f.gremioId === gremioId)?.puesto ?? 5;
}

/** Semana (1–4) a la que pertenece un día (1–28). */
export function semanaDeDia(dia: number): number {
  return Math.ceil(dia / balance.temporada.diasPorSemana);
}

/** true el último día de cada semana: el día de la Prueba de Novatos. */
export function esDiaDeNovatos(dia: number): boolean {
  return dia % balance.temporada.diasPorSemana === 0;
}

export function claveAfinidad(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Límite de deuda: la inicial más el préstamo extra máximo. */
export function limiteDeuda(): number {
  return balance.economia.deudaInicial + 20000;
}

export function nuevoId(estado: EstadoJuego, prefijo: string): string {
  estado.contadorIds += 1;
  return `${prefijo}_${estado.contadorIds}`;
}

export function registrar(estado: EstadoJuego, tipo: Evento['tipo'], texto: string): void {
  estado.registro.push({ dia: estado.partida.dia, tipo, texto });
}
