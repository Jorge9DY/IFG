// Economía (biblia, sección 4): sueldos semanales pagados el día 7, antes de la Prueba de los Novatos,
// héroes que se van si no cobran y curación de lesionados con oro.

import balance from '../datos/balance.json';
import { gremio, heroe as obtenerHeroe, heroesDe, jugador, registrar, type EstadoJuego } from './estado';
import { sueldo } from './heroes';
import { ajustarSueldo, alGastar } from './habilidades';
import { cambiarAnimo, perderCompanero } from './relaciones';
import { plazasLibres } from './instalaciones';
import type { Gremio, Heroe } from './tipos';

const I = balance.impagos;

/** Sueldo de un héroe en su gremio, con las habilidades que lo cambian (Don Hueso, Letra, Posadero). */
export function sueldoEn(estado: EstadoJuego, gremioId: string, h: Heroe): number {
  return ajustarSueldo(estado, gremioId, h, sueldo(h));
}

export function sueldosDe(estado: EstadoJuego, gremioId: string): number {
  return heroesDe(estado, gremioId).reduce((t, h) => t + sueldoEn(estado, gremioId, h), 0);
}

export interface PagoSueldos {
  total: number;
  pagado: number;
  /** false si algún héroe se quedó sin cobrar. */
  completo: boolean;
  /** Héroes que no han cobrado esta semana (y siguen en el gremio). */
  impagados: string[];
  /** Héroes que se han ido por no cobrar, con el gremio al que se marchan (null: dejan el oficio). */
  seVan: { heroeId: string; nombre: string; destino: string | null }[];
}

/**
 * Paga los sueldos de la semana, de héroe en héroe, empezando por los más poderosos (orden provisional).
 * Quien no cobra pierde lealtad y suma una semana sin cobrar: la primera vez avisa y, al llegar a
 * `semanasParaIrse` semanas seguidas, se va a otro gremio. Cobrar pone el contador a cero.
 */
export function pagarSueldos(estado: EstadoJuego, gremioId: string): PagoSueldos {
  const g = gremio(estado, gremioId);
  const heroes = heroesDe(estado, gremioId).sort((a, b) => b.poder - a.poder);
  const total = heroes.reduce((t, h) => t + sueldoEn(estado, gremioId, h), 0);
  prestamoDeUsura(estado, g, total);
  let pagado = 0;
  const sinCobrar: Heroe[] = [];
  for (const h of heroes) {
    const s = sueldoEn(estado, gremioId, h);
    if (g.oro >= s) {
      g.oro -= s;
      pagado += s;
      h.semanasSinCobrar = 0;
    } else {
      h.semanasSinCobrar += 1;
      h.lealtad = Math.max(0, h.lealtad - I.lealtadPorSemana);
      cambiarAnimo(h, balance.animo.impago);
      sinCobrar.push(h);
    }
  }
  const seVan: PagoSueldos['seVan'] = [];
  const impagados: string[] = [];
  for (const h of sinCobrar) {
    // Cobra (Paga o nada) se va a la primera semana sin cobrar.
    if (h.semanasSinCobrar >= (h.habilidad === 'pagaONada' ? 1 : I.semanasParaIrse)) {
      seVan.push({ heroeId: h.id, nombre: h.nombre, destino: marcharse(estado, h, g) });
    } else {
      impagados.push(h.id);
      if (g.esJugador) {
        const quedan = I.semanasParaIrse - h.semanasSinCobrar;
        registrar(estado, 'sueldos', `${h.nombre} no ha cobrado. Si sigue sin cobrar ${quedan === 1 ? 'la semana que viene' : `${quedan} semanas más`}, se irá a otro gremio.`);
      }
    }
  }
  return { total, pagado, completo: sinCobrar.length === 0, impagados, seVan };
}

/**
 * Usura (Préstamo): si al gremio no le llega para los sueldos, adelanta lo que falta. La deuda crece cada semana;
 * se paga sola cuando hay oro y, si pasan dos semanas sin pagarse, Usura se lleva al mejor héroe.
 */
function prestamoDeUsura(estado: EstadoJuego, g: Gremio, total: number): void {
  const P = balance.habilidades.prestamo;
  const usura = heroesDe(estado, g.id).find((h) => h.habilidad === 'prestamo');
  if (g.deuda && g.deuda.oro > 0) {
    g.deuda.oro = Math.round(g.deuda.oro * (1 + P.interes));
    if (g.oro - total >= g.deuda.oro) {
      g.oro -= g.deuda.oro;
      if (g.esJugador) registrar(estado, 'sueldos', `Devuelves el préstamo de Usura: ${g.deuda.oro} de oro.`);
      g.deuda = undefined;
    } else if (++g.deuda.semanas >= P.semanas) {
      const presa = heroesDe(estado, g.id).filter((h) => h.habilidad !== 'prestamo' && h.estado !== 'en mision').sort((a, b) => b.poder - a.poder)[0];
      if (presa) marcharse(estado, presa, g, `Usura se cobra la deuda: se lleva a ${presa.nombre}`);
      g.deuda = undefined;
    }
  }
  if (usura && g.oro < total) {
    const falta = total - g.oro;
    g.oro += falta;
    g.deuda = { oro: (g.deuda?.oro ?? 0) + falta, semanas: g.deuda?.semanas ?? 0 };
    if (g.esJugador) registrar(estado, 'sueldos', `${usura.nombre} te adelanta ${falta} de oro para los sueldos, con un ${Math.round(P.interes * 100)}% de interés semanal.`);
  }
}

/**
 * El héroe deja su gremio y se va al rival con plaza que más oro tiene (o deja el oficio). Devuelve el destino.
 * Sus compañeros lo notan según lo que los unía.
 */
export function marcharse(estado: EstadoJuego, h: Heroe, origen: Gremio, motivo?: string): string | null {
  perderCompanero(estado, origen.id, h, 'marcha');
  for (const otro of Object.values(estado.heroes)) if (otro.amor === h.id && origen.plantilla.includes(otro.id)) otro.amor = null;
  origen.plantilla = origen.plantilla.filter((id) => id !== h.id);
  // Si estaba de misión, el resto del equipo sigue sin él.
  for (const c of estado.enCurso) c.equipo = c.equipo.filter((id) => id !== h.id);
  estado.enCurso = estado.enCurso.filter((c) => c.equipo.length > 0);
  estado.entrenamientos = estado.entrenamientos.filter((e) => e.heroeId !== h.id);
  h.estado = 'libre';
  h.diasLesion = 0;
  h.semanasSinCobrar = 0;
  h.lealtad = balance.heroes.lealtadInicial;
  const destino = Object.values(estado.gremios)
    .filter((g) => !g.esJugador && g.id !== origen.id && plazasLibres(estado, g.id) > 0)
    .sort((a, b) => b.oro - a.oro)[0];
  if (destino) destino.plantilla.push(h.id);
  else {
    if (h.catalogo && !estado.bolsaNovatos.includes(h.catalogo)) estado.bolsaNovatos.push(h.catalogo);
    delete estado.heroes[h.id];
  }
  const causa = motivo ?? `${h.nombre} se cansa de no cobrar`;
  const texto = destino ? `${causa} y deja ${origen.nombre} por ${destino.nombre}.` : `${causa} y deja ${origen.nombre}.`;
  registrar(estado, origen.esJugador ? 'sueldos' : 'rival', texto);
  return destino?.id ?? null;
}

/** Oro que se puede gastar sin dejar de cubrir los próximos sueldos. */
export function oroLibre(estado: EstadoJuego, gremioId: string): number {
  return Math.max(0, gremio(estado, gremioId).oro - sueldosDe(estado, gremioId));
}

// ---------------------------------------------------------------------------
// Curación
// ---------------------------------------------------------------------------

/** Coste de curar ya a un lesionado: por cada día de lesión que le queda, más caro cuanto más poder tiene. */
export function costeCuracion(h: Heroe): number {
  const c = balance.curacion;
  return Math.round((h.diasLesion * (c.porDia + c.porPoderPorDia * h.poder)) / 10) * 10;
}

export function condicionesCuracion(estado: EstadoJuego, heroeId: string): { precio: number; bloqueo: string | null } {
  const h = obtenerHeroe(estado, heroeId);
  const precio = costeCuracion(h);
  if (!jugador(estado).plantilla.includes(heroeId)) return { precio, bloqueo: 'No es de tu gremio' };
  if (h.estado !== 'lesionado') return { precio, bloqueo: 'No está lesionado' };
  if (jugador(estado).oro < precio) return { precio, bloqueo: 'No tienes oro suficiente' };
  return { precio, bloqueo: null };
}

/** Paga la curación: el héroe vuelve a estar libre al momento. */
export function curar(estado: EstadoJuego, heroeId: string): number {
  const c = condicionesCuracion(estado, heroeId);
  if (c.bloqueo) throw new Error(c.bloqueo);
  const h = obtenerHeroe(estado, heroeId);
  jugador(estado).oro -= c.precio;
  h.estado = 'libre';
  h.diasLesion = 0;
  // Curarlo deprisa le quita la rabia a Bateman.
  if (h.habilidad === 'vendetta') h.memoria = { ...(h.memoria ?? {}), vendetta: 0 };
  registrar(estado, 'sueldos', `Pagas ${c.precio} de oro para curar a ${h.nombre}.`);
  alGastar(estado, estado.jugadorId);
  return c.precio;
}
