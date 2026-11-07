// Misiones (biblia, sección 5): tablón diario de tres rangos, probabilidad de éxito, resultado y lesiones.

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import type { Azar } from './azar';
import { ganarExperiencia, type Progreso } from './heroes';
import { RANGOS_MISION, type Clase, type Heroe, type Mision, type RangoMision } from './tipos';

/** Multiplicadores de la categoría del gremio (1 y 1 en la categoría inicial). */
export interface Escala {
  dificultad: number;
  recompensa: number;
}

const M = balance.misiones;
const K = balance.clases;

interface TipoMision {
  tipo: string;
  clases: string[];
  titulos: string[];
}

export function datosMision(rango: RangoMision) {
  return M[rango];
}

/**
 * Las tres misiones del día (rango bajo, medio y alto), al nivel de la categoría del gremio.
 * La dificultad varía un poco cada día.
 */
export function generarTablon(azar: Azar, nuevoId: () => string, escala: Escala = { dificultad: 1, recompensa: 1 }): Mision[] {
  return RANGOS_MISION.map((rango) => {
    const d = M[rango];
    const variacion = 1 + (azar.siguiente() * 2 - 1) * M.variacionDificultad;
    const tipo = azar.elegir(datosGremios.tiposMision[rango] as TipoMision[]);
    return {
      id: nuevoId(),
      rango,
      tipo: tipo.tipo,
      clases: tipo.clases as Clase[],
      titulo: azar.elegir(tipo.titulos),
      dificultad: Math.round(d.dificultad * escala.dificultad * variacion),
      duracion: d.duracion,
      recompensa: Math.round((d.recompensa * escala.recompensa) / 50) * 50,
      equipo: d.equipo,
    };
  });
}

export function poderEquipo(equipo: readonly Heroe[]): number {
  return equipo.reduce((t, h) => t + h.poder, 0);
}

function limitar(p: number): number {
  return Math.round(Math.min(M.exito.maximo, Math.max(M.exito.minimo, p)));
}

/**
 * Probabilidad de éxito en porcentaje solo por poder (fórmula provisional, sección 5):
 * 75% con un poder igual a la dificultad, ±1 punto por cada 1% de diferencia, entre 5 y 95.
 */
export function probabilidadExito(poder: number, dificultad: number): number {
  return limitar(M.exito.base + M.exito.pendiente * (poder / dificultad - 1));
}

/** Clases que pide la misión cubiertas por el equipo (cada héroe cubre un hueco) y las que faltan. */
export function clasesCubiertas(mision: Mision, equipo: readonly Heroe[]): { cubiertas: Clase[]; faltan: Clase[] } {
  const disponibles = equipo.map((h) => h.clase);
  const cubiertas: Clase[] = [];
  const faltan: Clase[] = [];
  for (const c of mision.clases) {
    const i = disponibles.indexOf(c);
    if (i >= 0) {
      cubiertas.push(c);
      disponibles.splice(i, 1);
    } else {
      faltan.push(c);
    }
  }
  return { cubiertas, faltan };
}

/** Puntos de éxito extra por llevar las clases que favorece la misión (y por la combinación completa). */
export function bonusClases(mision: Mision, equipo: readonly Heroe[]): number {
  if (mision.clases.length === 0 || equipo.length === 0) return 0;
  const { cubiertas, faltan } = clasesCubiertas(mision, equipo);
  return K.bonusPorClase * cubiertas.length + (faltan.length === 0 ? K.bonusCombinacion : 0);
}

/** Poder del equipo en esta misión: el Mago pega más fuerte en las de rango alto. */
export function poderEnMision(mision: Mision, equipo: readonly Heroe[]): number {
  return Math.round(equipo.reduce((t, h) => t + h.poder * (h.clase === 'Mago' && mision.rango === 'alto' ? K.poderMagoEnAlto : 1), 0));
}

/** Probabilidad de éxito de este equipo en esta misión: poder, efecto del Mago y clases favorecidas. */
export function probabilidadMision(mision: Mision, equipo: readonly Heroe[], bonusExito = 0): number {
  if (equipo.length === 0) return 0;
  const porPoder = M.exito.base + M.exito.pendiente * (poderEnMision(mision, equipo) / mision.dificultad - 1);
  return limitar(porPoder + bonusClases(mision, equipo) + bonusExito);
}

/** Días que dura la misión con este equipo: un Explorador acorta en un día las más largas (rango alto). */
export function duracionMision(mision: Mision, equipo: readonly Heroe[]): number {
  const explorador = equipo.some((h) => h.clase === 'Explorador');
  return explorador && mision.duracion >= K.duracionMinimaExplorador ? mision.duracion - K.diasMenosExplorador : mision.duracion;
}

/** Probabilidad de lesión de un héroe: el Guerrero aguanta más, el Mago menos y un Sanador protege a los demás. */
export function probLesion(h: Heroe, equipo: readonly Heroe[], base: number): number {
  let p = base;
  if (h.clase === 'Guerrero') p *= K.lesionGuerrero;
  if (h.clase === 'Mago') p *= K.lesionMago;
  if (equipo.some((x) => x !== h && x.clase === 'Sanador')) p *= K.lesionCompanerosSanador;
  return p;
}

export interface ParteHeroe {
  heroeId: string;
  diasLesion: number;
  /** Experiencia, subidas de poder, ascenso de rango y techo. */
  progreso: Progreso;
}

export interface InformeMision {
  mision: Mision;
  gremioId: string;
  probabilidad: number;
  exito: boolean;
  oro: number;
  partes: ParteHeroe[];
}

/**
 * Resuelve una misión: una tirada contra la probabilidad. Fracasar reduce la recompensa y la experiencia
 * y aumenta la probabilidad de lesión (sección 5). No hay muertes.
 * Aplica experiencia, reputación y lesiones a los héroes; el oro lo suma quien llama.
 */
export function resolverMision(
  azar: Azar,
  mision: Mision,
  equipo: readonly Heroe[],
  gremioId: string,
  /** Especialización e investigaciones del gremio: oro, lesiones, éxito y experiencia. */
  mods: { oro: number; lesion: number; exito: number; experiencia: number } = { oro: 1, lesion: 1, exito: 0, experiencia: 1 },
): InformeMision {
  const d = M[mision.rango];
  const probabilidad = probabilidadMision(mision, equipo, mods.exito);
  const exito = azar.d100() <= probabilidad;
  const xp = Math.round((exito ? d.experiencia : d.experiencia * M.fraccionExperienciaFracaso) * mods.experiencia);
  const partes = equipo.map((h) => {
    const lesion = azar.probabilidad(probLesion(h, equipo, exito ? d.lesionExito : d.lesionFracaso) * mods.lesion);
    const diasLesion = lesion ? azar.entero(d.diasLesion[0] ?? 1, d.diasLesion[1] ?? 1) : 0;
    const progreso = ganarExperiencia(h, xp);
    if (exito) h.reputacion = Math.min(100, h.reputacion + d.reputacion);
    h.estado = lesion ? 'lesionado' : 'libre';
    h.diasLesion = diasLesion;
    return { heroeId: h.id, diasLesion, progreso };
  });
  return {
    mision,
    gremioId,
    probabilidad,
    exito,
    oro: Math.round((exito ? mision.recompensa : mision.recompensa * M.fraccionRecompensaFracaso) * mods.oro),
    partes,
  };
}
