// Fichajes directos de héroes de otros gremios: cláusula de rescisión y cesiones (sección 7 del diseño).

import balance from '../datos/balance.json';
import {
  gremio,
  heroe as obtenerHeroe,
  jugador,
  registrar,
  salariosDe,
  type EstadoJuego,
} from './estado';
import { salarioPedido, valorMercado } from './heroes';
import { contextoGremio } from './ia';
import { puntuacionOferta } from './pujas';
import { indiceRango, type Rango } from './tipos';

const T = balance.traspasos;

/** Gremio rival al que pertenece un héroe, o null si no es de un rival. */
export function dueñoRival(estado: EstadoJuego, heroeId: string): string | null {
  for (const g of Object.values(estado.gremios)) {
    if (!g.esJugador && g.plantilla.includes(heroeId)) return g.id;
  }
  return null;
}

function oroLibre(estado: EstadoJuego): number {
  return jugador(estado).oro - 4 * salariosDe(estado, estado.jugadorId);
}

function comprobarHueco(estado: EstadoJuego): void {
  const j = jugador(estado);
  if (j.plantilla.length >= j.plantillaMax) throw new Error('La plantilla está llena');
}

export type ResultadoClausula = 'fichado' | 'se niega';

/**
 * Paga la cláusula de rescisión de un héroe de otro gremio. Ficha al momento si su
 * Puntuación de Oferta con el jugador es al menos 60; si no, no se paga nada.
 */
export function pagarClausula(estado: EstadoJuego, heroeId: string): ResultadoClausula {
  const origen = dueñoRival(estado, heroeId);
  if (!origen) throw new Error('Ese héroe no pertenece a ningún gremio rival');
  comprobarHueco(estado);
  const h = obtenerHeroe(estado, heroeId);
  const clausula = h.contrato?.clausula ?? Math.round(valorMercado(h) * 1.5);
  if (clausula > oroLibre(estado)) throw new Error(`La cláusula cuesta ${clausula} y solo puedes gastar ${Math.max(0, oroLibre(estado))}`);

  const puntuacion = puntuacionOferta(clausula, valorMercado(h), contextoGremio(estado, estado.jugadorId, h), h.rasgos);
  if (!puntuacion.elegible || puntuacion.total < T.puntuacionMinimaClausula) {
    registrar(estado, 'fichaje', `${h.nombre} rechaza venir a la Llama Menguante aunque pagues su cláusula.`);
    return 'se niega';
  }
  const j = jugador(estado);
  const g = gremio(estado, origen);
  j.oro -= clausula;
  g.oro += clausula;
  g.plantilla = g.plantilla.filter((id) => id !== h.id);
  j.plantilla.push(h.id);
  h.contrato = { gremio: j.id, salario: Math.max(h.contrato?.salario ?? 0, salarioPedido(h.rango)), temporadasRestantes: 2, clausula: Math.round(valorMercado(h) * 1.5) };
  if (h.estado === 'en mision') h.estado = 'disponible';
  registrar(estado, 'fichaje', `Pagas la cláusula de ${h.nombre} (${clausula} de oro): deja ${g.nombre} y se une al gremio.`);
  return 'fichado';
}

/** Coste de pedir cedido a un héroe y si su gremio está dispuesto a cederlo. */
export function condicionesCesion(estado: EstadoJuego, heroeId: string): { coste: number; bloqueo: string | null } {
  const origen = dueñoRival(estado, heroeId);
  if (!origen) return { coste: 0, bloqueo: 'No es de un gremio rival' };
  const h = obtenerHeroe(estado, heroeId);
  const coste = Math.round(valorMercado(h) * T.costeCesion);
  const alba = origen === 'alba' && jugador(estado).reputacion >= T.reputacionCesionAlba;
  if (!alba && indiceRango(h.rango) > indiceRango(T.rangoMaximoCesion as Rango)) {
    return { coste, bloqueo: `Ningún gremio cede héroes de rango superior a ${T.rangoMaximoCesion}` };
  }
  return { coste, bloqueo: null };
}

/**
 * Pide un héroe cedido de 4 a 8 semanas: se paga el 30% de su valor, el jugador paga su salario
 * mientras tanto y su gremio se queda el 20% del oro de las misiones en las que participe.
 */
export function pedirCesion(estado: EstadoJuego, heroeId: string, semanas: number): void {
  const [min, max] = T.semanasCesion as [number, number];
  if (semanas < min || semanas > max) throw new Error(`Una cesión dura entre ${min} y ${max} semanas`);
  const { coste, bloqueo } = condicionesCesion(estado, heroeId);
  if (bloqueo) throw new Error(bloqueo);
  comprobarHueco(estado);
  if (coste > oroLibre(estado)) throw new Error(`La cesión cuesta ${coste} y solo puedes gastar ${Math.max(0, oroLibre(estado))}`);
  const origen = dueñoRival(estado, heroeId)!;
  const h = obtenerHeroe(estado, heroeId);
  const j = jugador(estado);
  const g = gremio(estado, origen);
  j.oro -= coste;
  g.oro += coste;
  g.plantilla = g.plantilla.filter((id) => id !== h.id);
  j.plantilla.push(h.id);
  if (h.estado === 'en mision') h.estado = 'disponible';
  (estado.cesiones ??= []).push({ heroeId, origenId: origen, semanaFin: estado.partida.semana + semanas - 1 });
  registrar(estado, 'fichaje', `${g.nombre} te cede a ${h.nombre} durante ${semanas} semanas por ${coste} de oro.`);
}

export function esCedido(estado: EstadoJuego, heroeId: string): boolean {
  return (estado.cesiones ?? []).some((c) => c.heroeId === heroeId);
}

/** Parte del oro de una misión que se llevan los gremios de los héroes cedidos que participaron. */
export function repartirOroCesiones(estado: EstadoJuego, heroeIds: readonly string[], oro: number): number {
  let pagado = 0;
  for (const c of estado.cesiones ?? []) {
    if (!heroeIds.includes(c.heroeId) || oro <= 0) continue;
    const parte = Math.round(oro * T.oroCesion);
    gremio(estado, c.origenId).oro += parte;
    pagado += parte;
  }
  jugador(estado).oro -= pagado;
  return pagado;
}

/** En el cierre: los cedidos cuyo plazo vence vuelven a su gremio (si están de misión, al volver). */
export function devolverCesiones(estado: EstadoJuego): void {
  const j = jugador(estado);
  const quedan = [];
  for (const c of estado.cesiones ?? []) {
    const h = estado.heroes[c.heroeId];
    if (!h || h.estado === 'muerto' || !j.plantilla.includes(c.heroeId)) continue;
    if (c.semanaFin > estado.partida.semana || h.estado === 'en mision') {
      quedan.push(c);
      continue;
    }
    j.plantilla = j.plantilla.filter((id) => id !== h.id);
    gremio(estado, c.origenId).plantilla.push(h.id);
    estado.enVenta = estado.enVenta.filter((t) => t.heroeId !== h.id);
    registrar(estado, 'fichaje', `Termina la cesión: ${h.nombre} vuelve a ${gremio(estado, c.origenId).nombre}.`);
  }
  estado.cesiones = quedan;
}
