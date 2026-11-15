// Estado completo de una partida y consultas sobre él. Es un objeto plano: se guarda con JSON.stringify.

import balance from '../datos/balance.json';
import type { Reto } from './retos';
import type { Subasta } from './subasta';
import type { Gremio, Heroe, Mision, Relacion } from './tipos';

export interface MisionEnCurso {
  mision: Mision;
  gremioId: string;
  equipo: string[];
  /** Día (global) en cuyo cierre vuelve el equipo. */
  diaVuelta: number;
  /** Carta del tablón de la que sale (una carta se puede lanzar varias veces el mismo día). */
  cartaId?: string;
  /** Misión de Ascensión (un héroe solo; si fracasa, muere). */
  ascension?: boolean;
  /** Probabilidad de éxito calculada al salir (la que vio el jugador). */
  probabilidad?: number;
  /** Día en que salió. */
  diaSalida?: number;
}

/** Héroe caído: el muro de los caídos guarda su memoria. */
export interface Caido {
  id: string;
  nombre: string;
  clase: string;
  gremioId: string;
  dia: number;
  poder: number;
  causa: 'ascension' | 'mision' | 'vida' | 'segador' | 'metamorfosis';
  texto: string;
}

export interface Evento {
  dia: number;
  tipo: 'mision' | 'fichaje' | 'venta' | 'sueldos' | 'novatos' | 'instalacion' | 'rival' | 'ranking' | 'temporada' | 'reto' | 'relacion' | 'muerte' | 'habilidad' | 'social';
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

/** Recuerdo de un hecho social importante (sección 12 del sistema social). */
export interface Memoria {
  dia: number;
  tipo: string;
  heroes: string[];
  texto: string;
}

/** Evento social esperando la decisión del jugador. */
export interface EventoPendiente {
  uid: string;
  eventoId: string;
  a: string;
  b?: string;
  /** Nombres, por si alguno ya no está (duelo). */
  nombres: { a: string; b?: string };
  dia: number;
}

export interface EstadoSocial {
  pendientes: EventoPendiente[];
  /** Clave de evento y participantes → día hasta el que no se puede repetir. */
  cooldowns: Record<string, number>;
  /** Eventos de «una vez por partida» ya ocurridos. */
  unicos: string[];
  memorias: Memoria[];
  /** Peticiones aceptadas de no compartir misión. No bloquean: romperlas tiene consecuencias. */
  vetos: { solicitante: string; otro: string; dia: number }[];
  contador: number;
}

export interface EstadoJuego {
  version: 10;
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
  /** Relación de cada pareja de héroes (clave «a|b»). Las que faltan son neutrales. */
  relaciones: Record<string, Relacion>;
  social: EstadoSocial;
  /** Héroes libres del catálogo que aún pueden llegar a la Prueba de los Novatos. */
  bolsaNovatos: string[];
  /** Muro de los caídos. */
  caidos: Caido[];
  /** Sistemas ya abiertos (desbloqueo progresivo). */
  desbloqueos: string[];
  /** Héroes del catálogo cuya habilidad conoces (los has fichado alguna vez). */
  habilidadesConocidas: string[];
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
