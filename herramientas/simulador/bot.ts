// Jugador automático con una estrategia sencilla, para medir el balance del juego.

import { sueldosDe } from '../../src/motor/economia';
import { heroe, heroesDe, jugador, rivales, type EstadoJuego } from '../../src/motor/estado';
import { valor } from '../../src/motor/heroes';
import { infoInstalacion, mejorar, plazasLibres } from '../../src/motor/instalaciones';
import { comprar, condicionesCompra, ofertaVenta, vender } from '../../src/motor/mercado';
import { probabilidadMision } from '../../src/motor/misiones';
import { aceptarReto, heroesParaReto, motivoNoAceptar } from '../../src/motor/retos';
import { Azar } from '../../src/motor/azar';
import { lanzarMision, pujarNovato, siguienteCandidato } from '../../src/motor/partida';
import { motivoNoPujar, siguientePrecio } from '../../src/motor/subasta';
import { equipoRecomendado } from '../../src/ui/ayudas';
import { condicionesEntrenamiento, entrenar } from '../../src/motor/entrenamiento';
import { condicionesAscension, iniciarAscension } from '../../src/motor/ascension';

export interface Estrategia {
  nombre: string;
  /** Probabilidad de éxito mínima para lanzar una misión. */
  probMinima: number;
  /** Lo máximo que paga por un novato, como fracción de su valor. */
  pujaMaxima: number;
  /** Semanas de sueldos que guarda antes de invertir en instalaciones o compras. */
  reservaSemanas: number;
  /** Vende al más flojo cuando la plantilla está llena y llega un novato mejor. */
  rota: boolean;
}

export const PRUDENTE: Estrategia = { nombre: 'Prudente', probMinima: 70, pujaMaxima: 1.0, reservaSemanas: 2, rota: false };
export const AMBICIOSA: Estrategia = { nombre: 'Ambiciosa', probMinima: 55, pujaMaxima: 2.0, reservaSemanas: 1, rota: true };

export interface MetricasBot {
  misiones: number;
  exitos: number;
  fichajesNovatos: number;
  ventas: number;
  mejoras: number;
  compras: number;
  ascensiones: number;
  retos: number;
  retosGanados: number;
  entrenamientos: number;
}

export function metricasVacias(): MetricasBot {
  return { misiones: 0, exitos: 0, fichajesNovatos: 0, ventas: 0, mejoras: 0, compras: 0, ascensiones: 0, retos: 0, retosGanados: 0, entrenamientos: 0 };
}

/** Decisiones del día: invertir y lanzar misiones (de la más alta a la más baja). */
export function jugarDia(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  const reserva = (): number => e.reservaSemanas * sueldosDe(estado, estado.jugadorId);
  const j = jugador(estado);
  for (const tipo of ['entrenamiento', 'sede', 'ojeadores'] as const) {
    const info = infoInstalacion(estado, j.id, tipo);
    const necesita = tipo === 'ojeadores' || (tipo === 'entrenamiento' && (j.nivelEntrenamiento ?? 0) < 2) || (tipo === 'sede' && plazasLibres(estado, j.id) <= 1);
    if (necesita && !info.bloqueo && info.coste !== null && j.oro - info.coste >= reserva() + 1500) {
      mejorar(estado, j.id, tipo);
      m.mejoras++;
    }
  }
  if (e.rota) {
    // Arriesga en la Ascensión a los héroes al límite si las probabilidades son buenas.
    for (const h of heroesDe(estado, j.id)) {
      const a = condicionesAscension(estado, h.id);
      if (!a.bloqueo && a.probabilidad >= 50 && j.oro - a.coste >= reserva()) {
        iniciarAscension(estado, h.id);
        m.ascensiones++;
      }
    }
  }
  // Retos: responde con su héroe más fuerte de la clase y el rango pedidos si cubre la apuesta.
  const candidato = heroesParaReto(estado).sort((a, b) => b.poder - a.poder)[0];
  if (candidato && !motivoNoAceptar(estado, candidato.id) && j.oro - (estado.reto?.apuesta ?? 0) >= reserva()) {
    const azar = new Azar(estado.azar);
    const r = aceptarReto(estado, azar, candidato.id);
    estado.azar = azar.obtenerEstado();
    m.retos++;
    if (r.desenlace === 'victoria') m.retosGanados++;
  }
  if (e.rota) comprarRefuerzo(estado, reserva(), m);
  for (const mision of [...estado.tablon].sort((a, b) => b.recompensa - a.recompensa)) {
    const equipo = equipoRecomendado(estado, mision);
    if (equipo.length === 0) continue;
    if (probabilidadMision(mision, equipo) >= e.probMinima) {
      lanzarMision(estado, mision.id, equipo.map((h) => h.id));
      m.misiones++;
    }
  }
  entrenarLibres(estado, e, m);
}

/** Prueba de los Novatos: puja hasta su tope por cada candidato si tiene plaza (o puede hacerla). */
/** Después de lanzar misiones, manda a entrenar a los libres que no llegan al límite, si sobra oro. */
export function entrenarLibres(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  const j = jugador(estado);
  for (const h of heroesDe(estado, j.id).sort((a, b) => b.potencial - b.poder - (a.potencial - a.poder))) {
    const c = condicionesEntrenamiento(estado, h.id);
    if (!c.bloqueo && j.oro - c.coste >= e.reservaSemanas * sueldosDe(estado, j.id)) {
      entrenar(estado, h.id);
      m.entrenamientos++;
    }
  }
}

export function jugarPrueba(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  while (siguienteCandidato(estado)) {
    const s = estado.prueba!.subasta!;
    const novato = heroe(estado, s.heroeId);
    const tope = valor(novato) * e.pujaMaxima;
    if (e.rota && plazasLibres(estado, estado.jugadorId) <= 0) {
      const flojo = jugador(estado).plantilla.map((id) => heroe(estado, id)).sort((a, b) => a.potencial - b.potencial)[0];
      if (flojo && flojo.potencial + 10 < novato.potencial && ofertaVenta(estado, flojo.id)) {
        vender(estado, flojo.id);
        m.ventas++;
      }
    }
    while (!s.terminada) {
      const quiere = siguientePrecio(s) <= tope && motivoNoPujar(estado, s) === null;
      pujarNovato(estado, quiere ? 'pujar' : 'retirarse');
    }
    if (s.lider === estado.jugadorId) m.fichajesNovatos++;
  }
}

/** Compra en el mercado al rival que más subiría su fuerza (top 5), si le sobra el oro. Libera plaza vendiendo al más flojo. */
function comprarRefuerzo(estado: EstadoJuego, reserva: number, m: MetricasBot): void {
  const j = jugador(estado);
  const quinto = heroesDe(estado, j.id).map((h) => h.poder).sort((a, b) => b - a)[4] ?? 0;
  const candidatos = rivales(estado)
    .flatMap((g) => heroesDe(estado, g.id))
    .filter((h) => h.poder > quinto + 5)
    .sort((a, b) => b.poder - a.poder);
  for (const h of candidatos) {
    if (plazasLibres(estado, j.id) <= 0) {
      const flojo = heroesDe(estado, j.id).filter((x) => x.estado === 'libre').sort((a, b) => a.potencial - b.potencial)[0];
      if (!flojo || !ofertaVenta(estado, flojo.id)) return;
      const c = condicionesCompra(estado, h.id);
      if (j.oro - c.precio < reserva) continue;
      vender(estado, flojo.id);
      m.ventas++;
    }
    const c = condicionesCompra(estado, h.id);
    if (!c.bloqueo && j.oro - c.precio >= reserva) {
      comprar(estado, h.id);
      m.compras++;
      return;
    }
  }
}
