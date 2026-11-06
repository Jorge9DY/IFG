// Héroes: rango por suma de combate y valor de mercado (secciones 5 y 8).
// La generación aleatoria de héroes llegará en el siguiente bloque de la fase 1.

import balance from '../datos/balance.json';
import { sumaCombate } from './misiones';
import { RANGOS, indiceRango, type Heroe, type Rango } from './tipos';

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

/** Rango que corresponde a sus stats actuales, sin superar su potencial. */
export function rangoActualizado(heroe: Heroe): Rango {
  const porStats = rangoPorSuma(sumaCombate(heroe));
  return indiceRango(porStats) > indiceRango(heroe.potencial) ? heroe.potencial : porStats;
}
