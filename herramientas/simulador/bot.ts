// Jugador automático con una estrategia sencilla, para medir el balance.

import { heroe, heroesDe, jugador, type EstadoJuego } from '../../src/motor/estado';
import { salarioPedido, valorMercado } from '../../src/motor/heroes';
import {
  POSICION_NATURAL,
  poderEquipo,
  probabilidadExito,
  type MiembroEquipo,
} from '../../src/motor/misiones';
import { enviarMision, oroDisponibleParaPujar, pujarPorHeroe } from '../../src/motor/partida';
import { aceptarOferta, ponerEnVenta } from '../../src/motor/ventas';
import { Azar } from '../../src/motor/azar';
import { indiceRango, type Heroe } from '../../src/motor/tipos';

export interface Estrategia {
  /** P(éxito) mínima para enviar un equipo. */
  probMinima: number;
  /** Prima ofrecida como fracción del valor de mercado. */
  primaRelativa: number;
  /** Tamaño objetivo de la plantilla. */
  plantillaObjetivo: number;
}

export const ESTRATEGIA_BASE: Estrategia = { probMinima: 70, primaRelativa: 1.1, plantillaObjetivo: 7 };
/** Jugador que acepta más riesgo: más parecido a una persona que quiere subir rápido. */
export const ESTRATEGIA_ARRIESGADA: Estrategia = { probMinima: 55, primaRelativa: 1.2, plantillaObjetivo: 6 };

export interface MetricasBot {
  pujas: number;
  fichajes: number;
  ventas: number;
}

export function jugarSemana(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  fichar(estado, e, m);
  vender(estado, m);
  mandarMisiones(estado, e);
}

function fichar(estado: EstadoJuego, e: Estrategia, m: MetricasBot): void {
  const j = jugador(estado);
  // Ordena el mercado por relación rango/precio: lo más fuerte que se pueda pagar.
  const candidatos = estado.mercado
    .map((entrada) => heroe(estado, entrada.heroeId))
    .sort((a, b) => indiceRango(b.rango) - indiceRango(a.rango) || valorMercado(a) - valorMercado(b));
  for (const h of candidatos) {
    if (j.plantilla.length >= Math.min(e.plantillaObjetivo, j.plantillaMax)) return;
    const prima = Math.round(valorMercado(h) * e.primaRelativa);
    const salario = salarioPedido(h.rango);
    // Sin equipo de 3 no hay misiones: el presupuesto se reparte entre los huecos que faltan.
    const faltan = Math.max(1, 3 - j.plantilla.length);
    const reserva = j.plantilla.length < 3 ? 300 : 1000;
    if (prima > (oroDisponibleParaPujar(estado) - reserva) / faltan) continue;
    m.pujas++;
    const subida = Math.min(oroDisponibleParaPujar(estado), Math.round(prima * 1.3));
    const resultado = pujarPorHeroe(estado, h.id, [
      { prima, salario, duracion: 2 },
      { prima: subida, salario, duracion: 2 },
    ]);
    if (resultado.fichado) m.fichajes++;
  }
}

function vender(estado: EstadoJuego, m: MetricasBot): void {
  const j = jugador(estado);
  // Si el oro aprieta, acepta la mejor oferta recibida o pone en venta al héroe más prescindible.
  if (j.oro > 800) return;
  const mejor = [...estado.ofertas].sort((a, b) => b.precio - a.precio)[0];
  if (mejor && aceptarOferta(estado, new Azar(estado.azar + 7), mejor.id) === 'vendido') {
    m.ventas++;
    return;
  }
  const prescindible = heroesDe(estado, j.id)
    .filter((h) => h.id !== 'h_000_elara' && h.estado !== 'en mision')
    .sort((a, b) => indiceRango(a.rango) - indiceRango(b.rango))[0];
  if (prescindible && !estado.enVenta.some((t) => t.heroeId === prescindible.id)) {
    ponerEnVenta(estado, prescindible.id, valorMercado(prescindible));
  }
}

function mandarMisiones(estado: EstadoJuego, e: Estrategia): void {
  const disponibles = (): Heroe[] =>
    heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'disponible' || h.estado === 'luto');
  const misiones = [...estado.tablon].sort((a, b) => b.recompensa.oro / b.duracion - a.recompensa.oro / a.duracion);
  for (const mision of misiones) {
    const libres = disponibles();
    if (libres.length < 3) return;
    // Prueba equipos de 3 a 5 con los más fuertes y elige el más pequeño que llegue al mínimo.
    const ordenados = [...libres].sort(
      (a, b) =>
        poderEquipo([{ heroe: b, posicion: POSICION_NATURAL[b.clase] }], mision.elemento) -
        poderEquipo([{ heroe: a, posicion: POSICION_NATURAL[a.clase] }], mision.elemento),
    );
    for (let tam = 3; tam <= Math.min(5, ordenados.length); tam++) {
      const equipo: MiembroEquipo[] = ordenados.slice(0, tam).map((h) => ({ heroe: h, posicion: POSICION_NATURAL[h.clase] }));
      const prob = probabilidadExito(
        poderEquipo(equipo, mision.elemento),
        mision.poderRecomendado,
        equipo.some((x) => x.heroe.clase === 'Soporte'),
      );
      if (prob >= e.probMinima) {
        enviarMision(estado, mision.id, equipo.map((x) => ({ heroeId: x.heroe.id, posicion: x.posicion })));
        break;
      }
    }
  }
}
