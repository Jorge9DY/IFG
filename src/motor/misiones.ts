// Misiones (biblia, sección 5): tablón diario de tres rangos, probabilidad de éxito, resultado y lesiones.

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import type { Azar } from './azar';
import type { EstadoJuego } from './estado';
import { activa, huecos as huecosDe, ajustarOro, alSalir, alVolver, bonusExito, diasMenos, factorExperiencia, factorLesion, lesionForzada, poderEquipoEnMision, type Contexto } from './habilidades';
import { ganarExperiencia, type Progreso } from './heroes';
import { morir, riesgoDeMuerte } from './muerte';
import { modificadorSocial, quimica, trasMision, type ModificadorSocial } from './relaciones';
import { RANGOS_MISION, type Clase, type Heroe, type Mision, type RangoMision } from './tipos';

/**
 * Dónde se juega la misión: con él cuentan las habilidades, el ánimo y las relaciones. Sin entorno, solo
 * el poder y las clases (lo usan las pruebas de reglas básicas).
 */
export interface Entorno {
  estado: EstadoJuego;
  gremioId: string;
  /** Día de salida (por defecto, hoy). */
  dia?: number;
}

function contexto(mision: Mision, equipo: readonly Heroe[], e: Entorno): Contexto {
  return { estado: e.estado, gremioId: e.gremioId, mision, equipo, dia: e.dia ?? e.estado.dia };
}

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

/**
 * Poder del equipo en esta misión. Sin entorno: el Mago pega más fuerte en las de rango alto. Con entorno,
 * además, habilidades, ánimo y química del equipo.
 */
export function poderEnMision(mision: Mision, equipo: readonly Heroe[], entorno?: Entorno): number {
  if (entorno) return poderEquipoEnMision(contexto(mision, equipo, entorno));
  return Math.round(equipo.reduce((t, h) => t + h.poder * (h.clase === 'Mago' && mision.rango === 'alto' ? K.poderMagoEnAlto : 1), 0));
}

/** Probabilidad de éxito de este equipo en esta misión: poder, clases favorecidas y, con entorno, todo lo demás. */
export function probabilidadMision(mision: Mision, equipo: readonly Heroe[], entorno?: Entorno): number {
  if (equipo.length === 0) return 0;
  const porPoder = M.exito.base + M.exito.pendiente * (poderEnMision(mision, equipo, entorno) / mision.dificultad - 1);
  const extra = entorno ? bonusExito(contexto(mision, equipo, entorno)) : 0;
  return limitar(porPoder + bonusClases(mision, equipo) + extra);
}

/** Química del equipo en % de poder (relaciones). */
export function quimicaEquipo(estado: EstadoJuego, equipo: readonly Heroe[]): number {
  return quimica(estado, equipo);
}

/** Desglose de lo que suman y restan las relaciones del equipo (para explicarlo en la interfaz). */
export function socialEquipo(estado: EstadoJuego, equipo: readonly Heroe[]): ModificadorSocial {
  return modificadorSocial(estado, equipo);
}

/** Días que dura la misión con este equipo: un Explorador acorta en un día las más largas (rango alto); Brújula, uno más. */
export function duracionMision(mision: Mision, equipo: readonly Heroe[]): number {
  const explorador = equipo.some((h) => h.clase === 'Explorador');
  const base = explorador && mision.duracion >= K.duracionMinimaExplorador ? mision.duracion - K.diasMenosExplorador : mision.duracion;
  return Math.max(1, base - diasMenos(equipo));
}

/**
 * Equipos posibles que llenan exactamente los huecos de una misión (AllBlack ocupa tres; Pacto, dos).
 * Para no disparar el cálculo, mira solo a los 12 primeros de la lista.
 */
export function equiposPosibles(lista: readonly Heroe[], huecos: number): Heroe[][] {
  const candidatos = lista.slice(0, 12);
  const resultado: Heroe[][] = [];
  const recorrer = (desde: number, quedan: number, actual: Heroe[]): void => {
    if (quedan === 0) {
      resultado.push([...actual]);
      return;
    }
    for (let i = desde; i < candidatos.length; i++) {
      const h = candidatos[i]!;
      const n = huecosDe(h);
      if (n > quedan) continue;
      actual.push(h);
      recorrer(i + 1, quedan - n, actual);
      actual.pop();
    }
  };
  recorrer(0, huecos, []);
  return resultado;
}

/** Efectos de salir de misión (habilidades que actúan al partir). */
export function salirDeMision(azar: Azar, mision: Mision, equipo: readonly Heroe[], entorno: Entorno): string[] {
  return alSalir(contexto(mision, equipo, entorno), azar);
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
  /** Héroes que han muerto en la misión (nombres). */
  muertes: string[];
  /** Lo que ha pasado por habilidades y relaciones. */
  textos: string[];
}

/**
 * Resuelve una misión: una tirada contra la probabilidad (la fijada al salir, si la hay). Fracasar reduce la
 * recompensa y la experiencia y aumenta la probabilidad de lesión (sección 5). Con entorno, además:
 * habilidades, ánimo, relaciones y, si la misión llevaba «Riesgo de muerte» y fracasa, muertes.
 * Aplica experiencia, reputación y lesiones a los héroes; el oro lo suma quien llama.
 */
export function resolverMision(
  azar: Azar,
  mision: Mision,
  equipo: readonly Heroe[],
  gremioId: string,
  entorno?: Entorno,
  probabilidadFijada?: number,
): InformeMision {
  const d = M[mision.rango];
  const probabilidad = probabilidadFijada ?? probabilidadMision(mision, equipo, entorno);
  const exito = azar.d100() <= probabilidad;
  const xp = exito ? d.experiencia : Math.round(d.experiencia * M.fraccionExperienciaFracaso);
  const mortal = !!entorno && !exito && riesgoDeMuerte(mision, probabilidad);
  const muertos: string[] = [];
  const partes = equipo.map((h) => {
    const forzada = entorno ? lesionForzada(equipo, h) : null;
    const base = probLesion(h, equipo, exito ? d.lesionExito : d.lesionFracaso) * (entorno ? factorLesion(equipo, h) : 1);
    const lesion = forzada === 'nunca' ? false : forzada ? true : azar.probabilidad(base);
    const [min, max] = [d.diasLesion[0] ?? 1, d.diasLesion[1] ?? 1];
    const diasLesion = lesion ? (forzada === 'grave' ? max : azar.entero(min, max)) : 0;
    if (mortal && forzada !== 'nunca' && azar.probabilidad(balance.muerte.probPorHeroe)) muertos.push(h.id);
    const progreso = ganarExperiencia(h, Math.round(xp * (entorno ? factorExperiencia(equipo, h) : 1)));
    if (exito) h.reputacion = Math.min(100, h.reputacion + d.reputacion);
    h.estado = lesion ? 'lesionado' : 'libre';
    h.diasLesion = diasLesion;
    if (entorno) {
      h.ultimoRegreso = entorno.estado.dia;
      if (lesion && h.habilidad === 'vendetta') h.memoria = { ...(h.memoria ?? {}), vendetta: diasLesion };
    }
    return { heroeId: h.id, diasLesion, progreso };
  });
  let oro = exito ? mision.recompensa : Math.round(mision.recompensa * M.fraccionRecompensaFracaso);
  const textos: string[] = [];
  const muertes: string[] = [];
  if (entorno) {
    const ctx = contexto(mision, equipo, entorno);
    const ajuste = ajustarOro(ctx, azar, oro, exito);
    oro = ajuste.oro;
    textos.push(...ajuste.textos);
    // Sistema social: misión juntos, protecciones, discusiones, rivalidades, felicidad y estrés.
    const social = trasMision(
      entorno.estado,
      azar,
      equipo,
      exito,
      partes.map((p) => ({ heroeId: p.heroeId, diasLesion: p.diasLesion, subio: p.progreso.barras > 0 })),
      (h) => activa(h, equipo),
    );
    for (const p of partes) {
      if (!social.salvados.includes(p.heroeId)) continue;
      p.diasLesion = 0;
      const h = entorno.estado.heroes[p.heroeId];
      if (h?.habilidad === 'vendetta') h.memoria = { ...(h.memoria ?? {}), vendetta: 0 };
    }
    textos.push(...social.textos);
    const lesionados = partes.filter((p) => p.diasLesion > 0).map((p) => p.heroeId);
    textos.push(...alVolver(ctx, azar, exito, lesionados));
    for (const id of muertos) {
      const h = entorno.estado.heroes[id];
      if (!h) continue;
      const r = morir(entorno.estado, id, 'mision');
      if (r.murio) muertes.push(h.nombre);
      textos.push(...r.textos);
    }
    for (const h of equipo) if (h.habilidad === 'porLasUltimas' && !entorno.estado.heroes[h.id]) muertes.push(h.nombre);
  }
  return { mision, gremioId, probabilidad, exito, oro, partes, muertes, textos };
}
