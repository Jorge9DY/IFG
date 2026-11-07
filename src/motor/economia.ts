// Economía (biblia, sección 4): sueldos semanales pagados el día 7, antes de la Prueba de los Novatos,
// héroes que se van si no cobran y curación de lesionados con oro.

import balance from '../datos/balance.json';
import { gremio, heroe as obtenerHeroe, heroesDe, jugador, registrar, type EstadoJuego } from './estado';
import { sueldo } from './heroes';
import { plazasLibres } from './instalaciones';
import type { Gremio, Heroe } from './tipos';

const I = balance.impagos;

export function sueldosDe(estado: EstadoJuego, gremioId: string): number {
  return heroesDe(estado, gremioId).reduce((t, h) => t + sueldo(h), 0);
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
  const total = heroes.reduce((t, h) => t + sueldo(h), 0);
  let pagado = 0;
  const sinCobrar: Heroe[] = [];
  for (const h of heroes) {
    const s = sueldo(h);
    if (g.oro >= s) {
      g.oro -= s;
      pagado += s;
      h.semanasSinCobrar = 0;
    } else {
      h.semanasSinCobrar += 1;
      h.lealtad = Math.max(0, h.lealtad - I.lealtadPorSemana);
      sinCobrar.push(h);
    }
  }
  const seVan: PagoSueldos['seVan'] = [];
  const impagados: string[] = [];
  for (const h of sinCobrar) {
    if (h.semanasSinCobrar >= I.semanasParaIrse) {
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

/** El héroe deja su gremio por no cobrar y se va al rival con plaza que más oro tiene. Devuelve el destino. */
function marcharse(estado: EstadoJuego, h: Heroe, origen: Gremio): string | null {
  origen.plantilla = origen.plantilla.filter((id) => id !== h.id);
  // Si estaba de misión, el resto del equipo sigue sin él.
  for (const c of estado.enCurso) c.equipo = c.equipo.filter((id) => id !== h.id);
  estado.enCurso = estado.enCurso.filter((c) => c.equipo.length > 0);
  estado.entrenamientos = estado.entrenamientos.filter((e) => e.heroeId !== h.id);
  for (const e of estado.establecimientos) e.trabajadores = e.trabajadores.filter((id) => id !== h.id);
  for (const c of estado.investigacion.enCurso) c.investigadores = c.investigadores.filter((id) => id !== h.id);
  h.estado = 'libre';
  h.diasLesion = 0;
  h.semanasSinCobrar = 0;
  h.lealtad = balance.heroes.lealtadInicial;
  const destino = Object.values(estado.gremios)
    .filter((g) => !g.esJugador && g.id !== origen.id && plazasLibres(estado, g.id) > 0)
    .sort((a, b) => b.oro - a.oro)[0];
  if (destino) destino.plantilla.push(h.id);
  else delete estado.heroes[h.id];
  const texto = destino
    ? `${h.nombre} se cansa de no cobrar y deja ${origen.nombre} por ${destino.nombre}.`
    : `${h.nombre} se cansa de no cobrar y deja ${origen.nombre}.`;
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
  registrar(estado, 'sueldos', `Pagas ${c.precio} de oro para curar a ${h.nombre}.`);
  return c.precio;
}
