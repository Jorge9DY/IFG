// Héroes: generación, rango por suma de combate, valor de mercado y progresión (secciones 5 y 8).

import balance from '../datos/balance.json';
import nombres from '../datos/nombres.json';
import type { Azar } from './azar';
import { sumaCombate } from './misiones';
import {
  RANGOS,
  indiceRango,
  type Clase,
  type Elemento,
  type Heroe,
  type Rango,
  type Rasgo,
  type Raza,
  type Stats,
} from './tipos';

export const CLASES: readonly Clase[] = ['Tanque', 'Guerrero', 'Mago', 'Sanador', 'Explorador', 'Soporte'];
export const RAZAS: readonly Raza[] = ['Humano', 'Elfo', 'Enano', 'Bestiahombre', 'Draconido', 'Demonio menor'];
export const ELEMENTOS: readonly Elemento[] = ['Fuego', 'Agua', 'Tierra', 'Viento', 'Luz', 'Sombra'];
export const RASGOS: readonly Rasgo[] = ['Codicioso', 'Leal', 'Temerario', 'Cobarde', 'Ambicioso', 'Romantico', 'Veterano'];

type StatCombate = 'poder' | 'defensa' | 'magia' | 'agilidad';
const STAT_PRINCIPAL: Record<Clase, StatCombate> = {
  Tanque: 'defensa',
  Guerrero: 'poder',
  Mago: 'magia',
  Sanador: 'magia',
  Explorador: 'agilidad',
  Soporte: 'magia',
};
const STATS_COMBATE: readonly StatCombate[] = ['poder', 'defensa', 'magia', 'agilidad'];

export function rangoPorSuma(suma: number): Rango {
  for (const rango of [...RANGOS].reverse()) {
    if (suma >= balance.rangos[rango].sumaMin) return rango;
  }
  return 'F';
}

export function multiplicadorEdad(edad: number): number {
  if (edad < 22) return 1.2;
  if (edad <= 32) return 1;
  return 0.7;
}

/** Base del rango: punto medio de su rango de valor de mercado. */
export function valorBase(rango: Rango): number {
  const [min, max] = balance.rangos[rango].valor as [number, number];
  return (min + max) / 2;
}

export function valorMercado(heroe: Heroe): number {
  const extraPotencial = heroe.potencialVisible
    ? Math.max(0, indiceRango(heroe.potencial) - indiceRango(heroe.rango)) * 0.15
    : 0;
  const valor =
    valorBase(heroe.rango) *
    (1 + 0.02 * heroe.misionesExito) *
    multiplicadorEdad(heroe.edad) *
    (1 + extraPotencial);
  return Math.round(valor);
}

/** Salario semanal que pide un héroe de su rango (punto medio de la tabla). */
export function salarioPedido(rango: Rango): number {
  const [min, max] = balance.rangos[rango].salario as [number, number];
  return Math.round((min + max) / 2);
}

/** Rango que corresponde a sus stats actuales, sin superar su potencial. */
export function rangoActualizado(heroe: Heroe): Rango {
  const porStats = rangoPorSuma(sumaCombate(heroe));
  return indiceRango(porStats) > indiceRango(heroe.potencial) ? heroe.potencial : porStats;
}

function repartirStats(azar: Azar, clase: Clase, suma: number): Stats {
  const principal = STAT_PRINCIPAL[clase];
  const pesos = STATS_COMBATE.map((s) => (s === principal ? 2 : 1) * (0.75 + azar.siguiente() * 0.5));
  const totalPesos = pesos.reduce((a, b) => a + b, 0);
  const valores = pesos.map((p) => Math.min(100, Math.max(1, Math.round((suma * p) / totalPesos))));
  // Reparte el sobrante si algún stat chocó con el tope de 100.
  let diferencia = suma - valores.reduce((a, b) => a + b, 0);
  for (let i = 0; diferencia !== 0 && i < 400; i++) {
    const idx = i % 4;
    const actual = valores[idx] ?? 0;
    if (diferencia > 0 && actual < 100) {
      valores[idx] = actual + 1;
      diferencia--;
    } else if (diferencia < 0 && actual > 1) {
      valores[idx] = actual - 1;
      diferencia++;
    }
  }
  return {
    poder: valores[0] ?? 1,
    defensa: valores[1] ?? 1,
    magia: valores[2] ?? 1,
    agilidad: valores[3] ?? 1,
    moral: azar.entero(50, 70),
  };
}

function generarPotencial(azar: Azar, rango: Rango): Rango {
  const g = balance.generacion;
  const maximo = g.potencialMaximo[rango] as Rango;
  if (azar.probabilidad(g.probJoya)) return 'S';
  const desde = indiceRango(rango);
  const hasta = Math.max(desde, indiceRango(maximo));
  return RANGOS[azar.entero(desde, hasta)] ?? rango;
}

function generarRasgos(azar: Azar): Rasgo[] {
  const g = balance.generacion;
  const rasgos: Rasgo[] = [];
  for (let i = 0; i < g.maxRasgos; i++) {
    if (!azar.probabilidad(g.probRasgo)) break;
    const r = azar.elegir(RASGOS);
    if (!rasgos.includes(r) && !(r === 'Temerario' && rasgos.includes('Cobarde')) && !(r === 'Cobarde' && rasgos.includes('Temerario'))) {
      rasgos.push(r);
    }
  }
  return rasgos;
}

export interface OpcionesGeneracion {
  clase?: Clase;
  edad?: number;
}

export function generarHeroe(azar: Azar, id: string, rango: Rango, opciones: OpcionesGeneracion = {}): Heroe {
  const clase = opciones.clase ?? azar.elegir(CLASES);
  const r = balance.rangos[rango];
  const suma = azar.entero(r.sumaMin, r.sumaMax);
  const [edadMin, edadMax] = balance.generacion.edad as [number, number];
  const rasgos = generarRasgos(azar);
  return {
    id,
    nombre: `${azar.elegir(nombres.nombres)} ${azar.elegir(nombres.apellidos)}`,
    edad: opciones.edad ?? (rasgos.includes('Veterano') ? azar.entero(30, edadMax) : azar.entero(edadMin, edadMax)),
    raza: azar.elegir(RAZAS),
    rango,
    potencial: generarPotencial(azar, rango),
    potencialVisible: false,
    clase,
    elemento: azar.elegir(ELEMENTOS),
    stats: repartirStats(azar, clase, suma),
    rasgos,
    vinculos: [],
    contrato: null,
    estado: 'disponible',
    semanasFuera: 0,
    xp: 0,
    misionesExito: 0,
  };
}

/**
 * Crea vínculos al azar entre héroes del mundo (simétricos).
 * Familia solo entre héroes de la misma raza; Romance entre adultos con menos de 12 años de diferencia.
 */
export function generarVinculos(azar: Azar, heroes: readonly Heroe[]): void {
  const prob = balance.generacion.probVinculo;
  for (const a of heroes) {
    if (a.vinculos.length >= 3 || !azar.probabilidad(prob)) continue;
    const candidatos = heroes.filter(
      (b) => b !== a && b.vinculos.length < 3 && !a.vinculos.some((v) => v.con === b.id),
    );
    if (candidatos.length === 0) continue;
    const b = azar.elegir(candidatos);
    const tipos: Heroe['vinculos'][number]['tipo'][] = ['Amistad', 'Amistad', 'Rivalidad'];
    if (a.raza === b.raza) tipos.push('Familia', 'Familia');
    if (a.edad >= 18 && b.edad >= 18 && Math.abs(a.edad - b.edad) < 12) tipos.push('Romance');
    const tipo = azar.elegir(tipos);
    const oculto = azar.probabilidad(30);
    a.vinculos.push({ con: b.id, tipo, oculto });
    b.vinculos.push({ con: a.id, tipo, oculto });
  }
}

/** Suma XP y aplica mejoras de stats y subida de rango. Devuelve true si subió de rango. */
export function ganarXp(azar: Azar, heroe: Heroe, xp: number): boolean {
  const p = balance.progresion;
  heroe.xp += xp;
  const rangoAntes = heroe.rango;
  while (heroe.xp >= p.xpPorMejora) {
    heroe.xp -= p.xpPorMejora;
    if (heroe.edad > p.edadMaxCrecimiento) continue;
    // El techo de stats lo marca el potencial: no se crece por encima del máximo de ese rango.
    const techo = balance.rangos[heroe.potencial].sumaMax;
    for (let i = 0; i < p.puntosPorMejora && sumaCombate(heroe) < techo; i++) {
      const stat = i === 0 ? STAT_PRINCIPAL[heroe.clase] : azar.elegir(STATS_COMBATE);
      heroe.stats[stat] = Math.min(100, heroe.stats[stat] + 1);
    }
  }
  heroe.rango = rangoActualizado(heroe);
  return heroe.rango !== rangoAntes;
}

/** Envejecimiento al final de la temporada: +1 año y declive de stats desde los 36. */
export function envejecer(heroe: Heroe): void {
  const p = balance.progresion;
  heroe.edad += 1;
  if (heroe.edad >= p.edadDeclive) {
    for (const s of STATS_COMBATE) heroe.stats[s] = Math.max(1, Math.round(heroe.stats[s] * (1 - p.declivePorTemporada)));
    heroe.rango = rangoPorSuma(sumaCombate(heroe));
  }
}
