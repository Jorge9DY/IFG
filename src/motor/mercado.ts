// Mercado: comprar héroes de otros gremios (pagando su cláusula) y vender los tuyos al instante.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { gremio, heroe as obtenerHeroe, jugador, registrar, salariosDe, type EstadoJuego } from './estado';
import { valorMercado } from './heroes';
import { contextoGremio, interes } from './ia';
import { puntuacionOferta } from './pujas';
import { dueñoRival, pagarClausula } from './traspasos';
import { aplicarPerdida } from './vinculos';

/** Oro que se puede gastar sin quedarse sin sueldos: el oro menos los salarios de una semana. */
export function oroLibre(estado: EstadoJuego): number {
  return Math.max(0, jugador(estado).oro - salariosDe(estado, estado.jugadorId));
}

export interface Compra {
  precio: number;
  /** Por qué no se puede comprar, o null si se puede. */
  bloqueo: string | null;
}

/** Precio y condiciones para comprar un héroe de otro gremio. */
export function condicionesCompra(estado: EstadoJuego, heroeId: string): Compra {
  const h = obtenerHeroe(estado, heroeId);
  const precio = h.contrato?.clausula ?? Math.round(valorMercado(h) * 1.5);
  const j = jugador(estado);
  if (!dueñoRival(estado, heroeId)) return { precio, bloqueo: 'No es de otro gremio' };
  if (j.plantilla.length >= j.plantillaMax) return { precio, bloqueo: 'No te quedan plazas: mejora la sede' };
  if (precio > oroLibre(estado)) return { precio, bloqueo: 'No tienes oro suficiente' };
  const p = puntuacionOferta(precio, valorMercado(h), contextoGremio(estado, j.id, h), h.rasgos);
  if (!p.elegible || p.total < balance.traspasos.puntuacionMinimaClausula) return { precio, bloqueo: 'No quiere venir a tu gremio' };
  return { precio, bloqueo: null };
}

export function comprar(estado: EstadoJuego, heroeId: string): void {
  const c = condicionesCompra(estado, heroeId);
  if (c.bloqueo) throw new Error(c.bloqueo);
  pagarClausula(estado, heroeId);
}

export interface Venta {
  compradorId: string;
  precio: number;
}

/** Mejor oferta inmediata de los rivales por un héroe del jugador, o null si nadie lo quiere. */
export function ofertaVenta(estado: EstadoJuego, heroeId: string): Venta | null {
  if (heroeId === 'h_000_elara') return null;
  const h = obtenerHeroe(estado, heroeId);
  if (h.estado === 'en mision') return null;
  const precio = Math.round(valorMercado(h) * balance.venta.factorPrecio);
  const compradores = Object.values(estado.gremios)
    .filter((g) => !g.esJugador && g.plantilla.length < g.plantillaMax && g.oro >= precio)
    .sort((a, b) => interes(estado, b.id, h) - interes(estado, a.id, h) || b.oro - a.oro);
  const comprador = compradores[0];
  return comprador ? { compradorId: comprador.id, precio } : null;
}

/** Vende al instante. Devuelve los ids de héroes que abandonan el gremio por perder un vínculo. */
export function vender(estado: EstadoJuego, azar: Azar, heroeId: string): string[] {
  const oferta = ofertaVenta(estado, heroeId);
  if (!oferta) throw new Error('Nadie quiere comprar a este héroe ahora');
  const h = obtenerHeroe(estado, heroeId);
  const j = jugador(estado);
  const comprador = gremio(estado, oferta.compradorId);
  const abandonan = aplicarPerdida(estado, azar, h, j.id, 'venta');
  j.plantilla = j.plantilla.filter((id) => id !== h.id);
  comprador.plantilla.push(h.id);
  j.oro += oferta.precio;
  comprador.oro -= oferta.precio;
  h.contrato = { gremio: comprador.id, salario: h.contrato?.salario ?? 0, temporadasRestantes: 2, clausula: Math.round(valorMercado(h) * 1.5) };
  h.estado = h.estado === 'luto' ? 'disponible' : h.estado;
  registrar(estado, 'venta', `${h.nombre} se va a ${comprador.nombre} por ${oferta.precio} de oro.`);
  return abandonan;
}
