// Misiones: poder de equipo, probabilidad de éxito, resultado, heridas y muerte (sección 9).

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import {
  indiceRango,
  type Clase,
  type Heroe,
  type Mision,
  type Posicion,
  type Rango,
} from './tipos';

const M = balance.modificadores;

export const POSICION_NATURAL: Record<Clase, Posicion> = {
  Tanque: 'vanguardia',
  Guerrero: 'vanguardia',
  Mago: 'retaguardia',
  Sanador: 'retaguardia',
  Explorador: 'centro',
  Soporte: 'centro',
};

export interface MiembroEquipo {
  heroe: Heroe;
  posicion: Posicion;
}

export type Resultado = 'exito' | 'parcial' | 'fracaso';

/** Poder + Defensa + Magia + Agilidad. La Moral no cuenta para el rango. */
export function sumaCombate(heroe: Heroe): number {
  const s = heroe.stats;
  return s.poder + s.defensa + s.magia + s.agilidad;
}

/** 0,7 con Moral 0 y 1,15 con Moral 100. */
export function multiplicadorMoral(moral: number): number {
  return M.moralBase + M.moralPorPunto * moral;
}

/** Suma de bonus de vínculos del héroe con otros miembros del mismo equipo (0,10 = +10%). */
export function bonusVinculos(heroe: Heroe, equipo: readonly MiembroEquipo[]): number {
  const ids = new Set(equipo.map((m) => m.heroe.id));
  let bonus = 0;
  for (const v of heroe.vinculos) {
    if (!ids.has(v.con)) continue;
    let valor = balance.vinculos.mision[v.tipo];
    if (v.tipo === 'Romance' && heroe.rasgos.includes('Romantico')) valor *= 2;
    bonus += valor;
  }
  return bonus;
}

function tieneVinculoPositivoEnEquipo(heroe: Heroe, equipo: readonly MiembroEquipo[]): boolean {
  const ids = new Set(equipo.map((m) => m.heroe.id));
  return heroe.vinculos.some((v) => v.tipo !== 'Rivalidad' && ids.has(v.con));
}

/** Aportación de un héroe al Poder de Equipo (PE). */
export function aportacion(miembro: MiembroEquipo, equipo: readonly MiembroEquipo[]): number {
  const { heroe } = miembro;
  let valor = sumaCombate(heroe) * multiplicadorMoral(heroe.stats.moral) * (1 + bonusVinculos(heroe, equipo));
  if (heroe.estado === 'luto') valor *= M.luto;
  if (heroe.rasgos.includes('Temerario')) valor *= M.temerarioPoder;
  if (heroe.rasgos.includes('Leal') && tieneVinculoPositivoEnEquipo(heroe, equipo)) {
    valor *= M.lealConVinculo;
  }
  return valor;
}

export function poderEquipo(equipo: readonly MiembroEquipo[]): number {
  return equipo.reduce((total, m) => total + aportacion(m, equipo), 0);
}

/**
 * P(éxito) en porcentaje: 75 con el poder recomendado exacto, ±1 punto por cada 1% de diferencia,
 * +10 con un Soporte en el equipo, siempre entre 5 y 95.
 */
export function probabilidadExito(pe: number, poderRecomendado: number, haySoporte: boolean): number {
  const e = balance.exito;
  const bruta = e.base + e.pendiente * (pe / poderRecomendado - 1) + (haySoporte ? e.bonusSoporte : 0);
  return Math.min(e.maximo, Math.max(e.minimo, bruta));
}

export function resultadoTirada(tirada: number, probabilidad: number): Resultado {
  if (tirada <= probabilidad) return 'exito';
  if (tirada <= probabilidad + balance.exito.margenParcial) return 'parcial';
  return 'fracaso';
}

/** Rango usado para el riesgo: los Veteranos cuentan como un rango más. */
export function rangoEfectivo(heroe: Heroe): number {
  return indiceRango(heroe.rango) + (heroe.rasgos.includes('Veterano') ? 1 : 0);
}

export function riesgoBase(rangoMision: Rango, rangoHeroeEfectivo: number): number {
  const r = balance.riesgoMuerte;
  const diferencia = indiceRango(rangoMision) - rangoHeroeEfectivo;
  if (diferencia >= 2) return r.dosOMasRangosPorEncima;
  if (diferencia === 1) return r.unRangoPorEncima;
  if (diferencia === 0) return r.mismoRango;
  return r.porDebajo;
}

export interface OpcionesRiesgo {
  despertarII?: boolean;
  enfermeria?: boolean;
}

/** Riesgo de muerte de un héroe, en porcentaje, para un resultado dado. */
export function riesgoMuerte(
  miembro: MiembroEquipo,
  equipo: readonly MiembroEquipo[],
  mision: Mision,
  resultado: Resultado,
  opciones: OpcionesRiesgo = {},
): number {
  const r = balance.riesgoMuerte;
  const { heroe } = miembro;
  const efectivo = rangoEfectivo(heroe);
  const diferencia = indiceRango(mision.rango) - efectivo;

  if (heroe.rasgos.includes('Cobarde') && diferencia <= 0) return 0;

  let riesgo: number;
  if (resultado === 'exito') {
    riesgo = diferencia >= 2 ? r.exitoDosOMasPorEncima : 0;
  } else {
    riesgo = riesgoBase(mision.rango, efectivo) / (resultado === 'parcial' ? 2 : 1);
  }
  if (riesgo === 0) return 0;

  if (heroe.rasgos.includes('Temerario')) riesgo += r.temerario;
  riesgo *= 1 - heroe.stats.defensa / 200;
  // Un Tanque en el equipo protege a sus compañeros.
  const tanqueProtege = equipo.some((m) => m !== miembro && m.heroe.clase === 'Tanque');
  if (tanqueProtege) riesgo *= 1 - r.reduccionTanque;
  if (opciones.despertarII) riesgo *= 1 - r.reduccionDespertarII;
  if (opciones.enfermeria) riesgo *= 1 - r.reduccionEnfermeria;
  return riesgo;
}

export type Consecuencia = 'ilesa' | 'heridaLeve' | 'heridaGrave' | 'muerte';

export interface ParteHeroe {
  heroeId: string;
  consecuencia: Consecuencia;
  semanasFuera: number;
  /** true si un Sanador o el Modo Clemente evitó la muerte. */
  salvado: boolean;
}

export interface InformeMision {
  misionId: string;
  poderEquipo: number;
  probabilidad: number;
  tirada: number;
  resultado: Resultado;
  oro: number;
  prestigio: number;
  xp: number;
  partes: ParteHeroe[];
}

export interface OpcionesMision extends OpcionesRiesgo {
  modoClemente?: boolean;
}

export function resolverMision(
  mision: Mision,
  equipo: readonly MiembroEquipo[],
  azar: Azar,
  opciones: OpcionesMision = {},
): InformeMision {
  if (equipo.length < 3 || equipo.length > 5) {
    throw new Error('Un equipo debe tener entre 3 y 5 héroes');
  }
  const h = balance.heridas;
  const pe = poderEquipo(equipo);
  const haySoporte = equipo.some((m) => m.heroe.clase === 'Soporte');
  const probabilidad = probabilidadExito(pe, mision.poderRecomendado, haySoporte);
  const tirada = azar.d100();
  const resultado = resultadoTirada(tirada, probabilidad);

  let sanadorDisponible = equipo.some((m) => m.heroe.clase === 'Sanador');
  const partes: ParteHeroe[] = equipo.map((miembro) => {
    const riesgo = riesgoMuerte(miembro, equipo, mision, resultado, opciones);
    const grave = (): number => azar.entero(h.semanasGrave[0] ?? 3, h.semanasGrave[1] ?? 4);
    if (azar.probabilidad(riesgo)) {
      if (opciones.modoClemente) {
        return { heroeId: miembro.heroe.id, consecuencia: 'heridaGrave', semanasFuera: h.semanasClemente, salvado: true };
      }
      if (sanadorDisponible) {
        sanadorDisponible = false;
        return { heroeId: miembro.heroe.id, consecuencia: 'heridaGrave', semanasFuera: grave(), salvado: true };
      }
      return { heroeId: miembro.heroe.id, consecuencia: 'muerte', semanasFuera: 0, salvado: false };
    }
    // Quien no muere tira por herida: grave con la misma probabilidad que la muerte, leve según el resultado.
    if (azar.probabilidad(riesgo)) {
      return { heroeId: miembro.heroe.id, consecuencia: 'heridaGrave', semanasFuera: grave(), salvado: false };
    }
    if (azar.probabilidad(h.leveProbabilidad[resultado])) {
      return { heroeId: miembro.heroe.id, consecuencia: 'heridaLeve', semanasFuera: h.semanasLeve, salvado: false };
    }
    return { heroeId: miembro.heroe.id, consecuencia: 'ilesa', semanasFuera: 0, salvado: false };
  });

  const fraccion = resultado === 'exito' ? 1 : resultado === 'parcial' ? 0.5 : 0;
  return {
    misionId: mision.id,
    poderEquipo: pe,
    probabilidad,
    tirada,
    resultado,
    oro: Math.round(mision.recompensa.oro * fraccion),
    prestigio:
      resultado === 'fracaso'
        ? -balance.exito.penalizacionPrestigioFracaso
        : mision.recompensa.prestigio * fraccion,
    xp: Math.round(mision.recompensa.xp * fraccion),
    partes,
  };
}

export interface VistaPreviaMision {
  poder: number;
  probabilidad: number;
  /** Riesgo de muerte de cada héroe si la misión fracasa, en porcentaje. */
  riesgos: { heroeId: string; riesgo: number }[];
}

/** Lo que la pantalla de Formación muestra antes de enviar un equipo. */
export function vistaPreviaMision(
  mision: Mision,
  equipo: readonly MiembroEquipo[],
  opciones: OpcionesRiesgo = {},
): VistaPreviaMision {
  const poder = poderEquipo(equipo);
  const haySoporte = equipo.some((m) => m.heroe.clase === 'Soporte');
  return {
    poder,
    probabilidad: equipo.length === 0 ? 0 : probabilidadExito(poder, mision.poderRecomendado, haySoporte),
    riesgos: equipo.map((m) => ({ heroeId: m.heroe.id, riesgo: riesgoMuerte(m, equipo, mision, 'fracaso', opciones) })),
  };
}
