// Ventas y mercado secundario (sección 8).

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import {
  gremio,
  heroe as obtenerHeroe,
  jugador,
  nuevoId,
  puesto,
  registrar,
  type EstadoJuego,
  type OfertaCompra,
} from './estado';
import { contextoGremio, interes } from './ia';
import { valorMercado } from './heroes';
import { puntuacionOferta } from './pujas';
import { aplicarPerdida } from './vinculos';

const V = balance.ventas;

export function ponerEnVenta(estado: EstadoJuego, heroeId: string, precio: number): void {
  if (!jugador(estado).plantilla.includes(heroeId)) throw new Error('El héroe no es de tu gremio');
  if (heroeId === 'h_000_elara') throw new Error('Elara no se puede vender');
  if ((estado.cesiones ?? []).some((c) => c.heroeId === heroeId)) throw new Error('No puedes vender a un héroe cedido');
  estado.enVenta = estado.enVenta.filter((t) => t.heroeId !== heroeId);
  estado.enVenta.push({ heroeId, precio });
}

export function quitarDeVenta(estado: EstadoJuego, heroeId: string): void {
  estado.enVenta = estado.enVenta.filter((t) => t.heroeId !== heroeId);
  estado.ofertas = estado.ofertas.filter((o) => o.heroeId !== heroeId);
}

/** Cada semana, cada rival interesado hace como mucho una oferta por cada héroe en venta. */
export function generarOfertas(estado: EstadoJuego, azar: Azar): void {
  estado.ofertas = [];
  for (const traspaso of estado.enVenta) {
    const h = obtenerHeroe(estado, traspaso.heroeId);
    if (h.estado === 'en mision') continue;
    for (const g of Object.values(estado.gremios)) {
      if (g.esJugador || interes(estado, g.id, h) <= 0) continue;
      if (!azar.probabilidad(V.probInteres)) continue;
      const valor = valorMercado(h);
      let precio = valor * (V.ofertaMin + azar.siguiente() * (V.ofertaMax - V.ofertaMin));
      if (puesto(estado, g.id) === puesto(estado, estado.jugadorId) - 1) precio *= 1 + V.rivalDirectoExtra;
      precio = Math.min(Math.round(precio), Math.round(g.oro * 0.5));
      if (precio <= 0) continue;
      estado.ofertas.push({ id: nuevoId(estado, 'of'), heroeId: h.id, compradorId: g.id, precio, contraofertas: 0 });
    }
  }
}

function buscarOferta(estado: EstadoJuego, ofertaId: string): OfertaCompra {
  const o = estado.ofertas.find((x) => x.id === ofertaId);
  if (!o) throw new Error('La oferta ya no existe');
  return o;
}

export type ResultadoVenta = 'vendido' | 'se niega' | 'sin fondos';

/** Acepta una oferta: el héroe cambia de gremio si su puntuación con el comprador es al menos 40. */
export function aceptarOferta(estado: EstadoJuego, azar: Azar, ofertaId: string): ResultadoVenta {
  const oferta = buscarOferta(estado, ofertaId);
  const h = obtenerHeroe(estado, oferta.heroeId);
  const comprador = gremio(estado, oferta.compradorId);
  const vendedor = jugador(estado);
  if (comprador.oro < oferta.precio) return 'sin fondos';

  const contexto = contextoGremio(estado, comprador.id, h);
  const puntuacion = puntuacionOferta(valorMercado(h), valorMercado(h), contexto, h.rasgos);
  if (puntuacion.total < V.puntuacionMinimaAceptar || (h.rasgos.includes('Leal') && h.stats.moral > 60)) {
    estado.ofertas = estado.ofertas.filter((o) => o.id !== ofertaId);
    registrar(estado, 'venta', `${h.nombre} se niega a irse a ${comprador.nombre}.`);
    return 'se niega';
  }

  const valor = valorMercado(h);
  if (oferta.precio < valor * 0.8) vendedor.prestigio = Math.max(0, vendedor.prestigio - 3);
  if (h.rasgos.includes('Leal') && h.stats.moral > 60) vendedor.reputacion = Math.max(0, vendedor.reputacion - 5);
  if (puesto(estado, comprador.id) === puesto(estado, vendedor.id) - 1) vendedor.reputacion = Math.max(0, vendedor.reputacion - 3);

  const abandonan = aplicarPerdida(estado, azar, h, vendedor.id, 'venta');
  vendedor.plantilla = vendedor.plantilla.filter((id) => id !== h.id);
  comprador.plantilla.push(h.id);
  vendedor.oro += oferta.precio;
  comprador.oro -= oferta.precio;
  h.contrato = { gremio: comprador.id, salario: h.contrato?.salario ?? 0, temporadasRestantes: 2, clausula: Math.round(valor * 1.5) };
  quitarDeVenta(estado, h.id);
  for (const id of abandonan) liberarHeroe(estado, id);
  registrar(estado, 'venta', `${h.nombre} se va a ${comprador.nombre} por ${oferta.precio} de oro.`);
  return 'vendido';
}

export type ResultadoContraoferta = 'aceptada' | 'retirada' | 'rechazada';

/** Contraoferta: hasta 2 por oferta; 35% de que el rival se retire; nunca más del 130% del valor. */
export function contraofertar(estado: EstadoJuego, azar: Azar, ofertaId: string, precio: number): ResultadoContraoferta {
  const oferta = buscarOferta(estado, ofertaId);
  const h = obtenerHeroe(estado, oferta.heroeId);
  if (oferta.contraofertas >= 2 || precio > valorMercado(h) * V.topeContraoferta) return 'rechazada';
  oferta.contraofertas += 1;
  if (azar.probabilidad(V.probRetiroContraoferta)) {
    estado.ofertas = estado.ofertas.filter((o) => o.id !== ofertaId);
    return 'retirada';
  }
  oferta.precio = Math.min(precio, gremio(estado, oferta.compradorId).oro);
  return 'aceptada';
}

/** El héroe deja el gremio del jugador y vuelve al mercado como agente libre. */
export function liberarHeroe(estado: EstadoJuego, heroeId: string): void {
  const j = jugador(estado);
  j.plantilla = j.plantilla.filter((id) => id !== heroeId);
  const h = obtenerHeroe(estado, heroeId);
  h.contrato = null;
  if (h.estado !== 'muerto') h.estado = 'disponible';
  quitarDeVenta(estado, heroeId);
  estado.mercado.push({ heroeId, draft: false, semanaLlegada: estado.partida.semana });
}
