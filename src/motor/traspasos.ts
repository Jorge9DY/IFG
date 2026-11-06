// Fichajes directos de héroes de otros gremios: cláusula de rescisión (sección 7 del diseño).

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
