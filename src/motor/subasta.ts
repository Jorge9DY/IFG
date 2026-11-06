// Prueba de Novatos: subasta en tiempo real con cuenta atrás.
// Es lógica pura: la interfaz llama a `avanzar` con el tiempo transcurrido y a `pujar` cuando el jugador sube.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { gremio, heroe as obtenerHeroe, jugador, registrar, salariosDe, type EstadoJuego } from './estado';
import { salarioPedido, valorMercado } from './heroes';
import { interes, perfil } from './ia';

const N = balance.novatos;

export interface Subasta {
  heroeId: string;
  precio: number;
  /** Gremio que va ganando, o null si nadie ha pujado. */
  lider: string | null;
  /** Segundos que quedan. */
  tiempo: number;
  /** Lo máximo que pagaría cada rival interesado (oculto al jugador). */
  maximos: Record<string, number>;
  /** El novato tiene un vínculo con alguien de tu gremio: prefiere tu oferta. */
  prefiereJugador: boolean;
  terminada: boolean;
  historial: { gremioId: string; precio: number }[];
}

export function incremento(subasta: Subasta, estado: EstadoJuego): number {
  const valor = valorMercado(obtenerHeroe(estado, subasta.heroeId));
  const relativo = Math.round((valor * N.incrementoRelativo) / 50) * 50;
  return Math.max(N.incrementoMinimo, relativo);
}

export function crearSubasta(estado: EstadoJuego, azar: Azar, heroeId: string): Subasta {
  const h = obtenerHeroe(estado, heroeId);
  const valor = valorMercado(h);
  const maximos: Record<string, number> = {};
  for (const g of Object.values(estado.gremios)) {
    if (g.esJugador || interes(estado, g.id, h) <= 0) continue;
    const factor = N.maximoRivalMin + azar.siguiente() * (N.maximoRivalMax - N.maximoRivalMin);
    maximos[g.id] = Math.round(Math.min(g.oro * 0.4, valor * factor * perfil(g.id).agresividad));
  }
  const plantilla = new Set(jugador(estado).plantilla);
  return {
    heroeId,
    precio: Math.max(N.incrementoMinimo, Math.round((valor * N.precioInicial) / 50) * 50),
    lider: null,
    tiempo: N.duracionSegundos,
    maximos,
    prefiereJugador: h.vinculos.some((v) => v.tipo !== 'Rivalidad' && plantilla.has(v.con)),
    terminada: false,
    historial: [],
  };
}

/** Oro que el jugador puede comprometer en una puja (su oro menos una semana de salarios). */
export function oroParaSubasta(estado: EstadoJuego): number {
  return Math.max(0, jugador(estado).oro - salariosDe(estado, estado.jugadorId));
}

/** Precio que tendría que pagar el jugador para ponerse en cabeza. */
export function siguientePujaJugador(estado: EstadoJuego, subasta: Subasta): number {
  return subasta.lider === null ? subasta.precio : subasta.precio + incremento(subasta, estado);
}

function puja(subasta: Subasta, gremioId: string, precio: number): void {
  subasta.precio = precio;
  subasta.lider = gremioId;
  subasta.historial.push({ gremioId, precio });
  subasta.tiempo = Math.max(subasta.tiempo, N.tiempoTrasPuja);
}

export function puedePujar(estado: EstadoJuego, subasta: Subasta): string | null {
  if (subasta.terminada) return 'La subasta ha terminado';
  if (subasta.lider === estado.jugadorId) return 'Vas ganando';
  const j = jugador(estado);
  if (j.plantilla.length >= j.plantillaMax) return 'No te quedan plazas: mejora la sede';
  if (siguientePujaJugador(estado, subasta) > oroParaSubasta(estado)) return 'No tienes oro suficiente';
  return null;
}

export function pujar(estado: EstadoJuego, subasta: Subasta): void {
  const motivo = puedePujar(estado, subasta);
  if (motivo) throw new Error(motivo);
  puja(subasta, estado.jugadorId, siguientePujaJugador(estado, subasta));
}

/**
 * Avanza el reloj `segundos`. Cada segundo, cada rival que no va ganando y aún puede pagar más
 * sube la puja con cierta probabilidad. Si el novato prefiere al jugador, un rival tiene que
 * superar su puja en un 20% para quitársela.
 */
export function avanzar(estado: EstadoJuego, azar: Azar, subasta: Subasta, segundos: number): void {
  if (subasta.terminada) return;
  let restante = segundos;
  while (restante > 0 && !subasta.terminada) {
    const paso = Math.min(1, restante);
    restante -= paso;
    subasta.tiempo -= paso;
    for (const [id, maximo] of Object.entries(subasta.maximos)) {
      if (subasta.lider === id) continue;
      let objetivo = subasta.lider === null ? subasta.precio : subasta.precio + incremento(subasta, estado);
      if (subasta.lider === estado.jugadorId && subasta.prefiereJugador) objetivo = Math.round(objetivo * N.preferenciaVinculo);
      if (objetivo <= maximo && azar.probabilidad(N.probPujaRivalPorSegundo * paso)) {
        puja(subasta, id, objetivo);
        break;
      }
    }
    if (subasta.tiempo <= 0) subasta.terminada = true;
  }
}

/** Cierra la subasta: el ganador paga y el novato se une a su gremio. Devuelve el ganador. */
export function cerrarSubasta(estado: EstadoJuego, subasta: Subasta): string | null {
  subasta.terminada = true;
  estado.novatos = estado.novatos.filter((id) => id !== subasta.heroeId);
  const h = obtenerHeroe(estado, subasta.heroeId);
  if (!subasta.lider) {
    registrar(estado, 'novatos', `Nadie pujó por ${h.nombre}: vuelve a su aldea.`);
    return null;
  }
  const g = gremio(estado, subasta.lider);
  g.oro -= subasta.precio;
  g.plantilla.push(h.id);
  h.contrato = { gremio: g.id, salario: salarioPedido(h.rango), temporadasRestantes: 2, clausula: Math.round(valorMercado(h) * 1.5) };
  registrar(estado, 'novatos', `${h.nombre} (${h.rango}, ${h.clase}) se une a ${g.nombre} por ${subasta.precio} de oro.`);
  return g.id;
}

/** Resuelve sin el jugador las subastas que queden (si termina el día sin pujar). */
export function resolverNovatosPendientes(estado: EstadoJuego, azar: Azar): void {
  for (const id of [...estado.novatos]) {
    const s = crearSubasta(estado, azar, id);
    avanzar(estado, azar, s, 60);
    cerrarSubasta(estado, s);
  }
}
