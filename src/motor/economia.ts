// Economía semanal: patrocinio, gastos, deuda y quiebra (sección 10).

import balance from '../datos/balance.json';
import type { Gremio } from './tipos';

const E = balance.economia;

export function patrocinio(prestigio: number, reputacion: number): number {
  return Math.round(E.patrocinioPorPrestigio * prestigio + E.patrocinioPorReputacion * reputacion);
}

export interface Gastos {
  licencia: number;
  mantenimiento: number;
  cuotaDeuda: number;
  salarios: number;
  total: number;
}

export function gastosSemanales(gremio: Gremio, salarios: number): Gastos {
  const mantenimiento = E.mantenimiento + E.mantenimientoPorMejora * gremio.mejoras.length;
  const cuotaDeuda = Math.min(E.cuotaDeuda, gremio.deuda);
  const total = E.licencia + mantenimiento + cuotaDeuda + salarios;
  return { licencia: E.licencia, mantenimiento, cuotaDeuda, salarios, total };
}

export interface ResultadoCierre {
  ingresoPatrocinio: number;
  gastos: Gastos;
  oroFinal: number;
  aviso: boolean;
  quiebra: boolean;
}

/**
 * Cierre semanal (fase 5 del bucle). Orden:
 * 1. patrocinio con el prestigio actual (ya incluye lo ganado en misiones esta semana);
 * 2. gastos fijos, cuota de deuda y salarios;
 * 3. control de quiebra (3 cierres seguidos con oro negativo);
 * 4. decaimiento de prestigio si no hubo ninguna misión con éxito esta semana.
 * Modifica el gremio y devuelve el resumen.
 */
export function cierreSemanal(gremio: Gremio, salarios: number, huboExito: boolean): ResultadoCierre {
  const ingresoPatrocinio = patrocinio(gremio.prestigio, gremio.reputacion);
  const gastos = gastosSemanales(gremio, salarios);

  gremio.oro += ingresoPatrocinio - gastos.total;
  gremio.deuda -= gastos.cuotaDeuda;

  const aviso = gremio.oro < 0;
  gremio.cierresNegativos = aviso ? gremio.cierresNegativos + 1 : 0;
  const quiebra = gremio.cierresNegativos >= E.cierresNegativosParaQuiebra;

  if (!huboExito) gremio.prestigio = Math.max(0, gremio.prestigio - E.decaimientoPrestigio);

  return { ingresoPatrocinio, gastos, oroFinal: gremio.oro, aviso, quiebra };
}

export function premioFinTemporada(puesto: number): number {
  return E.premios[puesto - 1] ?? 0;
}
