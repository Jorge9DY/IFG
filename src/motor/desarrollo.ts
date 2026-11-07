// Tres ramas de desarrollo (biblia, sección 4): militar, económica e investigación. Cada inversión real suma
// puntos a su rama. La rama dominante es la especialización del gremio y solo ella da bonificaciones, por
// niveles. Los puntos pierden peso cada semana, así que la especialización sigue al desarrollo actual; para
// cambiar de rama dominante, otra tiene que superarla con margen (no basta una inversión aislada).

import datos from '../datos/desarrollo.json';
import { registrar, temporadaDe, type Desarrollo, type EstadoJuego } from './estado';
import { RAMAS, type Rama } from './tipos';

const P = datos.puntos;
const N = datos.niveles;

export const NOMBRE_RAMA: Record<Rama, string> = { militar: 'Militar', economico: 'Económica', investigacion: 'Investigación' };

export interface Bonificacion {
  nombre: string;
  texto: string;
  [clave: string]: string | number;
}

export function desarrolloInicial(): Desarrollo {
  return { puntos: { militar: 0, economico: 0, investigacion: 0 }, dominante: null };
}

/** Suma puntos de desarrollo a una rama (por inversiones reales: oro ganado, invertido o proyectos). */
export function sumarPuntos(estado: EstadoJuego, rama: Rama, cantidad: number): void {
  if (cantidad <= 0) return;
  estado.desarrollo.puntos[rama] = Math.round((estado.desarrollo.puntos[rama] + cantidad) * 100) / 100;
  actualizarDominante(estado);
}

/**
 * Elige la rama dominante: la de más puntos si llega al primer umbral. Si ya hay una, otra solo la
 * sustituye si la supera con margen (`margenCambio`).
 */
export function actualizarDominante(estado: EstadoJuego): Rama | null {
  const d = estado.desarrollo;
  const mejor = [...RAMAS].sort((a, b) => d.puntos[b] - d.puntos[a])[0]!;
  const antes = d.dominante;
  if (!antes) {
    if (d.puntos[mejor] >= (N.umbral[0] ?? 0)) d.dominante = mejor;
  } else if (mejor !== antes && d.puntos[mejor] > d.puntos[antes] * P.margenCambio) {
    d.dominante = mejor;
  }
  if (d.dominante !== antes && d.dominante) {
    registrar(estado, 'temporada', `Tu gremio se especializa en la rama ${NOMBRE_RAMA[d.dominante].toLowerCase()}: ${bonificaciones(estado).map((b) => b.nombre).join(', ') || 'aún sin bonificaciones'}.`);
  }
  return d.dominante;
}

/** Cada semana los puntos pierden algo de peso: cuenta el desarrollo actual, no una inversión antigua. */
export function decaerPuntos(estado: EstadoJuego): void {
  for (const r of RAMAS) estado.desarrollo.puntos[r] = Math.round(estado.desarrollo.puntos[r] * P.decaimientoSemanal * 100) / 100;
}

/** Nivel de especialización (0–3) de la rama dominante. */
export function nivelEspecializacion(estado: EstadoJuego): number {
  const d = estado.desarrollo;
  if (!d.dominante) return 0;
  return N.umbral.filter((u) => d.puntos[d.dominante!] >= u).length;
}

/** Bonificaciones activas: las de los niveles alcanzados en la rama dominante. */
export function bonificaciones(estado: EstadoJuego): Bonificacion[] {
  const rama = estado.desarrollo.dominante;
  if (!rama) return [];
  return (N[rama] as unknown as Bonificacion[]).slice(0, nivelEspecializacion(estado));
}

/** Suma de una bonificación numérica activa (p. ej. 'produccion'). */
export function bono(estado: EstadoJuego, clave: string): number {
  return bonificaciones(estado).reduce((t, b) => t + (typeof b[clave] === 'number' ? (b[clave] as number) : 0), 0);
}

/** Todas las bonificaciones de una rama, con el umbral de cada nivel (para mostrarlas). */
export function nivelesDeRama(rama: Rama): (Bonificacion & { umbral: number })[] {
  return (N[rama] as unknown as Bonificacion[]).map((b, i) => ({ ...b, umbral: N.umbral[i] ?? 0 }));
}

/** Efecto acumulado de las investigaciones mágicas completadas (p. ej. 'ascension', 'experiencia'). */
export function efectoInvestigaciones(estado: EstadoJuego, clave: string): number {
  let total = 0;
  for (const id of new Set(estado.investigacion.completadas)) {
    const p = datos.investigacion.proyectos.find((x) => x.id === id);
    const efecto = (p as { efecto?: Record<string, number>; repetible?: boolean } | undefined)?.efecto;
    if (p && !(p as { repetible?: boolean }).repetible && efecto && typeof efecto[clave] === 'number') total += efecto[clave]!;
  }
  return total;
}

export interface ModificadoresMision {
  oro: number;
  lesion: number;
  exito: number;
  experiencia: number;
}

/** Cómo cambian las misiones del jugador por su especialización y sus investigaciones. */
export function modificadoresMision(estado: EstadoJuego, gremioId: string): ModificadoresMision {
  if (gremioId !== estado.jugadorId) {
    // Rivales militares: a partir de la segunda temporada, +10% de oro en sus misiones (versión abstracta).
    const militar = estado.gremios[gremioId]?.perfil?.rama === 'militar' && temporadaDe(estado.dia) >= 2;
    return { oro: militar ? 1.1 : 1, lesion: 1, exito: 0, experiencia: 1 };
  }
  return {
    oro: 1 + bono(estado, 'oroMisiones'),
    lesion: (1 - bono(estado, 'lesionMisiones')) * (1 - efectoInvestigaciones(estado, 'lesion')),
    exito: bono(estado, 'exitoMisiones'),
    experiencia: 1 + efectoInvestigaciones(estado, 'experiencia'),
  };
}

/** Puntos militares por el oro ganado en una misión con éxito. */
export function puntosMilitares(oro: number): number {
  return oro * P.militarPorOro;
}
