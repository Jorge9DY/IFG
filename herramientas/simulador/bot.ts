// Jugador automático con una estrategia sencilla, para medir el balance del juego por días.

import { Azar } from '../../src/motor/azar';
import { esDiaDeNovatos, heroe, jugador, type EstadoJuego } from '../../src/motor/estado';
import { valorMercado } from '../../src/motor/heroes';
import { vistaPreviaMision } from '../../src/motor/misiones';
import { enviarMision } from '../../src/motor/partida';
import { infoSede, mejorarSede } from '../../src/motor/sede';
import { avanzar, cerrarSubasta, crearSubasta, puedePujar, pujar, siguientePujaJugador } from '../../src/motor/subasta';
import { equipoRecomendado } from '../../src/ui/ayudas';

export interface Estrategia {
  /** P(éxito) mínima para lanzar una misión. */
  probMinima: number;
  /** Lo máximo que paga en una subasta, como fracción del valor del novato. */
  pujaMaxima: number;
  /** Tamaño objetivo de la plantilla. */
  plantillaObjetivo: number;
  /** Oro que guarda antes de mejorar la sede. */
  reservaSede: number;
}

export const ESTRATEGIA_BASE: Estrategia = { probMinima: 70, pujaMaxima: 1.1, plantillaObjetivo: 6, reservaSede: 2500 };
/** Jugador que acepta más riesgo: más parecido a una persona que quiere subir rápido. */
export const ESTRATEGIA_ARRIESGADA: Estrategia = { probMinima: 50, pujaMaxima: 1.3, plantillaObjetivo: 6, reservaSede: 1500 };

export interface MetricasBot {
  pujas: number;
  fichajes: number;
  ventas: number;
}

export function jugarDia(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  if (esDiaDeNovatos(estado.partida.dia)) subastas(estado, e, m);
  mejorar(estado, e);
  mision(estado, e);
}

/** Elige la misión que más paga entre las que superan la probabilidad mínima. */
function mision(estado: EstadoJuego, e: Estrategia): void {
  const opciones = [...estado.tablon].sort((a, b) => b.recompensa.oro - a.recompensa.oro);
  for (const m of opciones) {
    const equipo = equipoRecomendado(estado, m);
    if (equipo.length === 0) continue;
    if (vistaPreviaMision(m, equipo).probabilidad >= e.probMinima) {
      enviarMision(estado, m.id, equipo.map((x) => ({ heroeId: x.heroe.id, posicion: x.posicion })));
      return;
    }
  }
}

function subastas(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  const azar = new Azar(estado.azar + 31);
  for (const id of [...estado.novatos]) {
    const s = crearSubasta(estado, azar, id);
    const tope = valorMercado(heroe(estado, id)) * e.pujaMaxima;
    let pujo = false;
    while (!s.terminada) {
      const quiere = jugador(estado).plantilla.length < e.plantillaObjetivo && siguientePujaJugador(estado, s) <= tope;
      if (quiere && !puedePujar(estado, s)) {
        pujar(estado, s);
        pujo = true;
      }
      avanzar(estado, azar, s, 1);
    }
    if (pujo) m.pujas++;
    if (cerrarSubasta(estado, s) === estado.jugadorId) m.fichajes++;
  }
}

function mejorar(estado: EstadoJuego, e: Estrategia): void {
  const info = infoSede(estado);
  if (info.siguiente && !info.bloqueo && jugador(estado).oro - info.siguiente.coste >= e.reservaSede) mejorarSede(estado);
}
