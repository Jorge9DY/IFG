// Misiones (biblia, sección 5): tablón diario de tres rangos, probabilidad de éxito, resultado y lesiones.

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import type { Azar } from './azar';
import { ganarExperiencia, type Progreso } from './heroes';
import { RANGOS_MISION, type Heroe, type Mision, type RangoMision } from './tipos';

const M = balance.misiones;

export function datosMision(rango: RangoMision) {
  return M[rango];
}

/** Las tres misiones del día (rango bajo, medio y alto). La dificultad varía un poco cada día. */
export function generarTablon(azar: Azar, nuevoId: () => string): Mision[] {
  return RANGOS_MISION.map((rango) => {
    const d = M[rango];
    const variacion = 1 + (azar.siguiente() * 2 - 1) * M.variacionDificultad;
    const titulos = datosGremios.titulosMisiones[rango];
    return {
      id: nuevoId(),
      rango,
      titulo: azar.elegir(titulos),
      dificultad: Math.round(d.dificultad * variacion),
      duracion: d.duracion,
      recompensa: d.recompensa,
      equipo: d.equipo,
    };
  });
}

export function poderEquipo(equipo: readonly Heroe[]): number {
  return equipo.reduce((t, h) => t + h.poder, 0);
}

/**
 * Probabilidad de éxito en porcentaje (fórmula provisional, sección 5 [Abierto]):
 * 75% con un poder igual a la dificultad, ±1 punto por cada 1% de diferencia, entre 5 y 95.
 */
export function probabilidadExito(poder: number, dificultad: number): number {
  const e = M.exito;
  const bruta = e.base + e.pendiente * (poder / dificultad - 1);
  return Math.round(Math.min(e.maximo, Math.max(e.minimo, bruta)));
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
): InformeMision {
  const d = M[mision.rango];
  const probabilidad = probabilidadExito(poderEquipo(equipo), mision.dificultad);
  const exito = azar.d100() <= probabilidad;
  const xp = exito ? d.experiencia : Math.round(d.experiencia * M.fraccionExperienciaFracaso);
  const partes = equipo.map((h) => {
    const lesion = azar.probabilidad(exito ? d.lesionExito : d.lesionFracaso);
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
    oro: exito ? mision.recompensa : Math.round(mision.recompensa * M.fraccionRecompensaFracaso),
    partes,
  };
}
