// Estado completo de una partida y consultas sobre él. Es un objeto plano: se guarda con JSON.stringify.

import balance from '../datos/balance.json';
import type { Reto } from './retos';
import type { Subasta } from './subasta';
import type { Gremio, Heroe, Mision } from './tipos';

export interface MisionEnCurso {
  mision: Mision;
  gremioId: string;
  equipo: string[];
  /** Día (global) en cuyo cierre vuelve el equipo. */
  diaVuelta: number;
  /** Misión de Ascensión (un héroe solo; si fracasa, muere). */
  ascension?: boolean;
}

export interface Evento {
  dia: number;
  tipo: 'mision' | 'fichaje' | 'venta' | 'sueldos' | 'novatos' | 'instalacion' | 'rival' | 'ranking' | 'temporada' | 'reto';
  texto: string;
}

export interface FilaRanking {
  puesto: number;
  gremioId: string;
  fuerza: number;
  prestigio: number;
  puntos: number;
}

export interface PruebaNovatos {
  /** Novatos que aún no se han subastado, en orden de presentación. */
  pendientes: string[];
  /** Subasta en curso (por turnos), o null entre candidato y candidato. */
  subasta: Subasta | null;
  /** Resultado de cada novato ya subastado. */
  resultados: { heroeId: string; ganador: string | null; precio: number }[];
}

/**
 * Fase del día: «gestion» (el jugador decide), «prueba» (día 7, tras pagar sueldos: subastas de novatos)
 * y «victoria» (fin de la partida).
 */
export type Fase = 'gestion' | 'prueba' | 'victoria';

export interface EstadoJuego {
  version: 8;
  semilla: number;
  /** Estado del generador aleatorio, para continuar la misma secuencia. */
  azar: number;
  /** Día global, empezando en 1. La temporada y la semana se derivan de él. */
  dia: number;
  fase: Fase;
  heroes: Record<string, Heroe>;
  gremios: Record<string, Gremio>;
  jugadorId: string;
  /** Tablón del día: una misión de cada rango (las lanzadas desaparecen hasta el día siguiente). */
  tablon: Mision[];
  enCurso: MisionEnCurso[];
  prueba: PruebaNovatos | null;
  /** Héroes en la zona de entrenamiento y el día en que terminan. */
  entrenamientos: { heroeId: string; diaVuelta: number }[];
  /** Reto de un maestro rival pendiente o recién resuelto (uno por semana como mucho). */
  reto: Reto | null;
  /** Ranking oficial: se actualiza al terminar el día 7 de cada semana. */
  ranking: FilaRanking[];
  registro: Evento[];
  contadorIds: number;
}

const C = balance.calendario;

export function jugador(estado: EstadoJuego): Gremio {
  return gremio(estado, estado.jugadorId);
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

export function rivales(estado: EstadoJuego): Gremio[] {
  return Object.values(estado.gremios).filter((g) => !g.esJugador);
}

/** Gremio al que pertenece un héroe, o null si no tiene (novato). */
export function dueño(estado: EstadoJuego, heroeId: string): Gremio | null {
  return Object.values(estado.gremios).find((g) => g.plantilla.includes(heroeId)) ?? null;
}

export function temporadaDe(dia: number): number {
  return Math.floor((dia - 1) / C.diasPorTemporada) + 1;
}

/** Día dentro de la temporada (1–28). */
export function diaDeTemporada(dia: number): number {
  return ((dia - 1) % C.diasPorTemporada) + 1;
}

/** Semana dentro de la temporada (1–4). */
export function semanaDe(dia: number): number {
  return Math.ceil(diaDeTemporada(dia) / C.diasPorSemana);
}

/** Día 7 de cada semana: sueldos y Prueba de los Novatos. */
export function esDia7(dia: number): boolean {
  return dia % C.diasPorSemana === 0;
}

export function esFinDeTemporada(dia: number): boolean {
  return dia % C.diasPorTemporada === 0;
}

/** Días que faltan para el próximo día 7 (0 si es hoy). */
export function diasParaPrueba(dia: number): number {
  return (C.diasPorSemana - (dia % C.diasPorSemana)) % C.diasPorSemana;
}

export function puesto(estado: EstadoJuego, gremioId: string): number {
  return estado.ranking.find((f) => f.gremioId === gremioId)?.puesto ?? estado.ranking.length;
}

/** Misión en la que está ahora un héroe, o null. */
export function misionDe(estado: EstadoJuego, heroeId: string): MisionEnCurso | null {
  return estado.enCurso.find((c) => c.equipo.includes(heroeId)) ?? null;
}

export function nuevoId(estado: EstadoJuego, prefijo: string): string {
  estado.contadorIds += 1;
  return `${prefijo}_${estado.contadorIds}`;
}

export function registrar(estado: EstadoJuego, tipo: Evento['tipo'], texto: string): void {
  estado.registro.push({ dia: estado.dia, tipo, texto });
}
