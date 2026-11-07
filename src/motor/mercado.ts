// Mercado de héroes (biblia, sección 7): la única forma de fichar fuera de la Prueba de los Novatos es
// comprar a otros gremios. Precios y frecuencia de ofertas están [Abierto]: versión provisional.

import balance from '../datos/balance.json';
import { dueño, gremio, heroe as obtenerHeroe, jugador, registrar, type EstadoJuego } from './estado';
import { valorPublico } from './heroes';
import { plazasLibres } from './instalaciones';
import { comprador } from './rivales';

const V = balance.valor;

function redondear(n: number): number {
  return Math.round(n / 50) * 50;
}

export interface Condiciones {
  precio: number;
  /** Por qué no se puede hacer ahora, o null si se puede. */
  bloqueo: string | null;
}

export function precioCompra(estado: EstadoJuego, heroeId: string): number {
  return redondear(valorPublico(obtenerHeroe(estado, heroeId)) * V.factorCompra);
}

/** Comprar un héroe de otro gremio. */
export function condicionesCompra(estado: EstadoJuego, heroeId: string): Condiciones {
  const precio = precioCompra(estado, heroeId);
  const g = dueño(estado, heroeId);
  const h = obtenerHeroe(estado, heroeId);
  if (!g || g.esJugador) return { precio, bloqueo: 'No es de otro gremio' };
  if (g.perfil && !g.perfil.vende) return { precio, bloqueo: `${g.nombre} no vende a los suyos` };
  if (h.estado === 'en mision') return { precio, bloqueo: 'Está de misión' };
  if (plazasLibres(estado, estado.jugadorId) <= 0) return { precio, bloqueo: 'No te quedan plazas: mejora la sede' };
  if (jugador(estado).oro < precio) return { precio, bloqueo: 'No tienes oro suficiente' };
  return { precio, bloqueo: null };
}

export function comprar(estado: EstadoJuego, heroeId: string): void {
  const c = condicionesCompra(estado, heroeId);
  if (c.bloqueo) throw new Error(c.bloqueo);
  const vendedor = dueño(estado, heroeId)!;
  const j = jugador(estado);
  const h = obtenerHeroe(estado, heroeId);
  vendedor.plantilla = vendedor.plantilla.filter((id) => id !== heroeId);
  j.plantilla.push(heroeId);
  vendedor.oro += c.precio;
  j.oro -= c.precio;
  registrar(estado, 'fichaje', `Compras a ${h.nombre} a ${vendedor.nombre} por ${c.precio} de oro.`);
}

export interface Oferta {
  compradorId: string;
  precio: number;
}

/** Mejor oferta inmediata de los rivales por un héroe del jugador, o null si nadie lo quiere ahora. */
export function ofertaVenta(estado: EstadoJuego, heroeId: string): Oferta | null {
  const h = obtenerHeroe(estado, heroeId);
  if (!jugador(estado).plantilla.includes(heroeId) || h.estado === 'en mision' || h.estado === 'entrenando') return null;
  const precio = redondear(valorPublico(h) * V.factorVenta);
  const g = comprador(estado, h, precio);
  return g ? { compradorId: g.id, precio } : null;
}

export function vender(estado: EstadoJuego, heroeId: string): Oferta {
  const oferta = ofertaVenta(estado, heroeId);
  if (!oferta) throw new Error('Nadie quiere comprar a este héroe ahora');
  const j = jugador(estado);
  const g = gremio(estado, oferta.compradorId);
  const h = obtenerHeroe(estado, heroeId);
  j.plantilla = j.plantilla.filter((id) => id !== heroeId);
  g.plantilla.push(heroeId);
  j.oro += oferta.precio;
  g.oro -= oferta.precio;
  registrar(estado, 'venta', `${h.nombre} se va a ${g.nombre} por ${oferta.precio} de oro.`);
  return oferta;
}
