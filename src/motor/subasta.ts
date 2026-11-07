// Prueba de los Novatos (biblia, sección 8): subasta ascendente por turnos.
// En cada ronda, cada gremio que sigue en la puja la sube o se retira. Los rivales tienen un límite oculto.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { gremio, heroe as obtenerHeroe, registrar, rivales, type EstadoJuego } from './estado';
import { esDestacado, valorPublico } from './heroes';
import { plazasLibres } from './instalaciones';
import { limitePuja } from './rivales';

const N = balance.novatos;

export interface Subasta {
  heroeId: string;
  /** Puja actual (o precio de salida si nadie ha pujado). */
  precio: number;
  incremento: number;
  /** Gremio que va ganando, o null si nadie ha pujado. */
  lider: string | null;
  /** Gremios que siguen en la puja (orden fijo: el jugador primero). */
  activos: string[];
  /** Límite oculto de cada rival. El jugador no debe verlo. */
  limites: Record<string, number>;
  ronda: number;
  terminada: boolean;
  historial: { gremioId: string; accion: 'puja' | 'retirada'; precio: number }[];
}

function redondear(n: number): number {
  return Math.round(n / N.redondeo) * N.redondeo;
}

export function precioSalida(estado: EstadoJuego, heroeId: string): number {
  return Math.max(N.incrementoMinimo, redondear(valorPublico(obtenerHeroe(estado, heroeId)) * N.precioSalida));
}

export function crearSubasta(estado: EstadoJuego, azar: Azar, heroeId: string): Subasta {
  const h = obtenerHeroe(estado, heroeId);
  const salida = precioSalida(estado, heroeId);
  const limites: Record<string, number> = {};
  for (const g of rivales(estado)) limites[g.id] = limitePuja(estado, azar, g, h);
  const activos = [estado.jugadorId, ...rivales(estado).filter((g) => (limites[g.id] ?? 0) >= salida).map((g) => g.id)];
  return {
    heroeId,
    precio: salida,
    incremento: Math.max(N.incrementoMinimo, redondear(valorPublico(h) * N.incremento)),
    lider: null,
    activos,
    limites,
    ronda: 1,
    terminada: false,
    historial: [],
  };
}

/** Lo que costaría ponerse en cabeza ahora. */
export function siguientePrecio(s: Subasta): number {
  return s.lider === null ? s.precio : s.precio + s.incremento;
}

/** Rivales que siguen interesados (para las reacciones de los maestros, sin revelar sus límites). */
export function interesados(estado: EstadoJuego, s: Subasta): string[] {
  return s.activos.filter((id) => id !== estado.jugadorId);
}

/** Por qué el jugador no puede subir la puja ahora, o null si puede. */
export function motivoNoPujar(estado: EstadoJuego, s: Subasta): string | null {
  if (s.terminada) return 'La subasta ha terminado';
  if (!s.activos.includes(estado.jugadorId)) return 'Te has retirado';
  if (s.lider === estado.jugadorId) return 'Vas ganando';
  if (plazasLibres(estado, estado.jugadorId) <= 0) return 'No te quedan plazas: mejora la sede';
  // Los sueldos ya se han pagado este día 7: se puede pujar con todo el oro que queda.
  if (siguientePrecio(s) > gremio(estado, estado.jugadorId).oro) return 'No tienes oro suficiente';
  return null;
}

function pujar(s: Subasta, gremioId: string): void {
  s.precio = siguientePrecio(s);
  s.lider = gremioId;
  s.historial.push({ gremioId, accion: 'puja', precio: s.precio });
}

function retirar(s: Subasta, gremioId: string): void {
  s.activos = s.activos.filter((id) => id !== gremioId);
  s.historial.push({ gremioId, accion: 'retirada', precio: s.precio });
}

function comprobarFin(s: Subasta): void {
  const quedanRetadores = s.activos.some((id) => id !== s.lider);
  if (s.activos.length === 0 || (s.lider !== null && !quedanRetadores)) s.terminada = true;
}

/** Turno de los rivales en la ronda: cada uno que no va ganando sube si no pasa de su límite; si no, se retira. */
function turnoRivales(estado: EstadoJuego, s: Subasta): void {
  for (const id of [...s.activos]) {
    if (s.terminada) return;
    if (id === estado.jugadorId || id === s.lider) continue;
    if (siguientePrecio(s) <= (s.limites[id] ?? 0)) pujar(s, id);
    else retirar(s, id);
    comprobarFin(s);
  }
  s.ronda += 1;
}

/** El jugador sube la puja (o se retira) y responden los rivales. */
export function accionJugador(estado: EstadoJuego, s: Subasta, accion: 'pujar' | 'retirarse'): void {
  if (s.terminada) throw new Error('La subasta ha terminado');
  if (accion === 'pujar') {
    const motivo = motivoNoPujar(estado, s);
    if (motivo) throw new Error(motivo);
    pujar(s, estado.jugadorId);
  } else if (s.activos.includes(estado.jugadorId)) {
    if (s.lider === estado.jugadorId) throw new Error('Vas ganando: no puedes retirarte');
    retirar(s, estado.jugadorId);
  }
  comprobarFin(s);
  if (!s.terminada) turnoRivales(estado, s);
  // Si el jugador ya no puja, la subasta sigue sola hasta el final.
  while (!s.terminada && !s.activos.includes(estado.jugadorId)) turnoRivales(estado, s);
}

/** Cierra la subasta: el ganador paga y el novato se une a su gremio. Devuelve el ganador o null. */
export function cerrarSubasta(estado: EstadoJuego, s: Subasta): string | null {
  if (!s.terminada) throw new Error('La subasta no ha terminado');
  const h = obtenerHeroe(estado, s.heroeId);
  if (!s.lider) {
    registrar(estado, 'novatos', `Nadie se queda con ${h.nombre}: vuelve a su aldea.`);
    return null;
  }
  const g = gremio(estado, s.lider);
  g.oro -= s.precio;
  g.plantilla.push(h.id);
  if (esDestacado(h)) g.novatosDestacados += 1;
  registrar(estado, g.esJugador ? 'fichaje' : 'novatos', `${h.nombre} (poder ${h.poder}) se une a ${g.nombre} por ${s.precio} de oro.`);
  return g.id;
}
