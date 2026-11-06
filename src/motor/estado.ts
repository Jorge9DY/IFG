// Estado completo de una partida y consultas sobre él. Es un objeto plano: se guarda con JSON.stringify.

import balance from '../datos/balance.json';
import type { InformeMision } from './misiones';
import { clasificacion, type FilaClasificacion } from './ranking';
import type { Gremio, Heroe, Mision, Partida, Posicion } from './tipos';

export interface MisionEnCurso {
  mision: Mision;
  gremioId: string;
  equipo: { heroeId: string; posicion: Posicion }[];
  /** Semana en cuyo cierre se resuelve. */
  semanaFin: number;
  /** Semana en que se envió (las partidas antiguas no lo tienen). */
  semanaInicio?: number;
}

export interface EntradaMercado {
  heroeId: string;
  /** Candidato del Draft de la semana 1. */
  draft: boolean;
  semanaLlegada: number;
}

export interface Traspaso {
  heroeId: string;
  precio: number;
}

export interface OfertaCompra {
  id: string;
  heroeId: string;
  compradorId: string;
  precio: number;
  contraofertas: number;
}

export interface Evento {
  semana: number;
  tipo: 'mision' | 'fichaje' | 'venta' | 'muerte' | 'abandono' | 'despertar' | 'economia' | 'rival' | 'sabotaje' | 'sede' | 'temporada';
  texto: string;
}

export type FinPartida = null | 'quiebra' | 'fin-temporada';

export interface EstadoJuego {
  version: 1;
  partida: Partida;
  /** Estado del generador aleatorio, para continuar la misma secuencia. */
  azar: number;
  heroes: Record<string, Heroe>;
  gremios: Record<string, Gremio>;
  jugadorId: string;
  tablon: Mision[];
  enCurso: MisionEnCurso[];
  mercado: EntradaMercado[];
  enVenta: Traspaso[];
  ofertas: OfertaCompra[];
  /** Afinidad entre pares de héroes (clave "idA|idB" ordenada). */
  afinidades: Record<string, number>;
  exitosTemporada: number;
  muertesTemporada: Record<string, number>;
  /** Informes de las misiones del jugador resueltas en el último cierre. */
  informes: InformeMision[];
  registro: Evento[];
  fin: FinPartida;
  contadorIds: number;
  /** Acciones especiales de los rivales ya usadas esta temporada. */
  accionesTemporada?: AccionesTemporada;
  /** Héroes del jugador que el Colmillo intenta sobornar. */
  sobornos?: Soborno[];
  /** Héroes cedidos al jugador por otros gremios. */
  cesiones?: Cesion[];
}

export interface Cesion {
  heroeId: string;
  /** Gremio dueño del héroe, que recibe parte del oro de sus misiones. */
  origenId: string;
  /** Semana en cuyo cierre vuelve a su gremio. */
  semanaFin: number;
}

export interface AccionesTemporada {
  vetoUsado: boolean;
  ofertaCoronaHecha: boolean;
  /** Puesto del jugador al empezar la temporada (para el modo amenaza). */
  puestoInicial?: number;
  amenazaAnunciada?: boolean;
}

export interface Soborno {
  heroeId: string;
  /** Salario que hay que pagarle para que se quede. */
  salarioPedido: number;
  /** Semana en cuyo cierre se va si no se le retiene. */
  semanaLimite: number;
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
  estado.registro.push({ semana: estado.partida.semana, tipo, texto });
}
