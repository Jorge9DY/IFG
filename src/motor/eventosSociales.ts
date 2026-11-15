// Eventos sociales (sección 9 del sistema social): la forma principal de interactuar con las relaciones.
// Cada día se buscan los eventos cuyas condiciones se cumplen en el gremio del jugador, se respetan
// cooldowns, eventos únicos y un límite de eventos a la vez, y se encolan para que el jugador decida.
// Si no decide en unos días, se aplica la opción por defecto. Los rivales no tienen eventos (fuera de alcance).
// Textos, opciones y efectos en src/datos/eventos-sociales.json; las condiciones, aquí.

import defs from '../datos/eventos-sociales.json';
import S from '../datos/social.json';
import { marcharse } from './economia';
import { desbloqueado } from './desbloqueos';
import { heroesDe, jugador, registrar, type EstadoJuego, type EventoPendiente } from './estado';
import {
  afinidad,
  atraccion,
  cambiar,
  cambiarMental,
  clave,
  editar,
  encolarEvento,
  estres,
  factorRasgo,
  felicidad,
  hayVeto,
  parejaDe,
  recordar,
  relacion,
  sonPareja,
} from './relaciones';
import type { Heroe } from './tipos';

const U = S.umbrales;
const E = S.eventos;

export interface Efecto {
  objetivo?: 'a' | 'b' | 'ambos' | 'gremio';
  felicidad?: number;
  estres?: number;
  lealtad?: number;
  afinidad?: number;
  atraccion?: number;
  accion?: 'pareja' | 'ruptura' | 'veto' | 'abandono' | 'descanso';
}

export interface Opcion {
  id: string;
  texto: string;
  coste?: number;
  efectos: Efecto[];
}

export interface DefEvento {
  id: string;
  tipo: 'general' | 'relacion';
  prioridad: number;
  titulo: string;
  texto: string;
  cooldown: number;
  unaVez: boolean;
  porDefecto: string;
  /** Efecto que ocurre elija lo que elija el jugador (el rechazo, los celos). */
  base?: 'rechazo' | 'celos';
  opciones: Opcion[];
}

export const EVENTOS: readonly DefEvento[] = defs.eventos as DefEvento[];

export function definicion(id: string): DefEvento {
  const d = EVENTOS.find((e) => e.id === id);
  if (!d) throw new Error(`No existe el evento ${id}`);
  return d;
}

/** Clave de repetición: el evento y sus participantes (la pareja, sin importar el orden). */
function claveRepeticion(eventoId: string, a: string, b?: string): string {
  return b ? `${eventoId}:${clave(a, b)}` : `${eventoId}:${a}`;
}

// ---------------------------------------------------------------------------
// Condiciones
// ---------------------------------------------------------------------------

type Candidato = [Heroe, Heroe?];

function parejas(heroes: Heroe[]): [Heroe, Heroe][] {
  const r: [Heroe, Heroe][] = [];
  for (let i = 0; i < heroes.length; i++) for (let j = i + 1; j < heroes.length; j++) r.push([heroes[i]!, heroes[j]!]);
  return r;
}

/** Quién cumple las condiciones de cada evento, dentro del gremio del jugador. */
function candidatos(estado: EstadoJuego, id: string): Candidato[] {
  const heroes = heroesDe(estado, estado.jugadorId).filter((h) => !h.zombie);
  switch (id) {
    case 'declaracion':
      return parejas(heroes).filter(
        ([a, b]) =>
          !sonPareja(estado, a.id, b.id) &&
          !parejaDe(estado, a.id) &&
          !parejaDe(estado, b.id) &&
          Math.min(atraccion(estado, a.id, b.id), atraccion(estado, b.id, a.id)) >= U.declaracion &&
          Math.max(atraccion(estado, a.id, b.id), atraccion(estado, b.id, a.id)) >= U.enamorado &&
          afinidad(estado, a.id, b.id) >= U.interes,
      );
    case 'rechazo': {
      const r: Candidato[] = [];
      for (const [x, y] of parejas(heroes)) {
        for (const [a, b] of [[x, y], [y, x]] as const) {
          if (!sonPareja(estado, a.id, b.id) && atraccion(estado, a.id, b.id) >= U.enamorado && atraccion(estado, b.id, a.id) < U.interes && afinidad(estado, a.id, b.id) >= 0) r.push([a, b]);
        }
      }
      return r;
    }
    case 'ruptura':
      return parejas(heroes).filter(([a, b]) => sonPareja(estado, a.id, b.id) && (afinidad(estado, a.id, b.id) <= 0 || (estres(a) > S.mision.estresAlto && estres(b) > S.mision.estresAlto)));
    case 'celos': {
      // a ve a su expareja b con otra persona.
      const r: Candidato[] = [];
      for (const [x, y] of parejas(heroes)) {
        if (relacion(estado, x.id, y.id).pareja !== 'expareja') continue;
        for (const [a, b] of [[x, y], [y, x]] as const) {
          const nueva = parejaDe(estado, b.id);
          if (nueva && nueva !== a.id && !hayVeto(estado, a.id, b.id)) r.push([a, b]);
        }
      }
      return r;
    }
    case 'peticionEquipo':
      return parejas(heroes)
        .filter(([a, b]) => afinidad(estado, a.id, b.id) <= U.enemigos && !hayVeto(estado, a.id, b.id))
        .map(([a, b]) => (felicidad(a) <= felicidad(b) ? [a, b] : [b, a]));
    case 'descontento':
      return heroes.filter((h) => felicidad(h) < S.efectos.descontento && felicidad(h) >= S.efectos.abandono).map((h) => [h]);
    case 'abandono':
      return heroes.filter((h) => felicidad(h) < S.efectos.abandono).map((h) => [h]);
    case 'crisis':
      return heroes.filter((h) => estres(h) > S.efectos.crisis && h.estado !== 'descansando').map((h) => [h]);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Evaluación diaria
// ---------------------------------------------------------------------------

function disponible(estado: EstadoJuego, def: DefEvento, a: string, b?: string): boolean {
  const k = claveRepeticion(def.id, a, b);
  if (def.unaVez && estado.social.unicos.includes(k)) return false;
  if ((estado.social.cooldowns[k] ?? 0) > estado.dia) return false;
  return !estado.social.pendientes.some((p) => p.eventoId === def.id && claveRepeticion(p.eventoId, p.a, p.b) === k);
}

/**
 * Busca los eventos que se pueden activar hoy y los encola por prioridad (urgentes, de relación, generales),
 * sin pasar del límite de nuevos por día ni de pendientes a la vez. Devuelve los nuevos.
 */
export function evaluarEventos(estado: EstadoJuego): EventoPendiente[] {
  // Desbloqueo progresivo: los asuntos sociales llegan cuando se abren las relaciones.
  if (!desbloqueado(estado, 'relaciones')) return [];
  const hueco = Math.min(E.maxNuevosPorDia, E.maxPendientes - estado.social.pendientes.length);
  if (hueco <= 0) return [];
  const opciones: { def: DefEvento; c: Candidato }[] = [];
  for (const def of EVENTOS) {
    if (def.id === 'duelo') continue;
    for (const c of candidatos(estado, def.id)) if (disponible(estado, def, c[0].id, c[1]?.id)) opciones.push({ def, c });
  }
  opciones.sort((x, y) => y.def.prioridad - x.def.prioridad);
  const nuevos: EventoPendiente[] = [];
  const ocupados = new Set(estado.social.pendientes.flatMap((p) => [p.a, p.b]));
  for (const { def, c } of opciones) {
    if (nuevos.length >= hueco) break;
    // Un héroe, un asunto a la vez.
    if (ocupados.has(c[0].id) || (c[1] && ocupados.has(c[1].id))) continue;
    nuevos.push(encolarEvento(estado, def.id, c[0], c[1]));
    ocupados.add(c[0].id);
    if (c[1]) ocupados.add(c[1].id);
  }
  for (const p of nuevos) registrar(estado, 'social', `Nuevo asunto en el gremio: ${textoEvento(estado, p).titulo}.`);
  return nuevos;
}

// ---------------------------------------------------------------------------
// Presentación y resolución
// ---------------------------------------------------------------------------

function rellenar(texto: string, p: EventoPendiente): string {
  return texto.replaceAll('{a}', p.nombres.a).replaceAll('{b}', p.nombres.b ?? '');
}

export interface VistaEvento {
  uid: string;
  titulo: string;
  texto: string;
  tipo: DefEvento['tipo'];
  urgente: boolean;
  /** Días que quedan para que se aplique la opción por defecto. */
  caduca: number;
  opciones: { id: string; texto: string; coste: number; porDefecto: boolean; bloqueo: string | null }[];
}

export function textoEvento(estado: EstadoJuego, p: EventoPendiente): VistaEvento {
  const d = definicion(p.eventoId);
  const oro = jugador(estado).oro;
  return {
    uid: p.uid,
    titulo: rellenar(d.titulo, p),
    texto: rellenar(d.texto, p),
    tipo: d.tipo,
    urgente: d.prioridad >= 3,
    caduca: Math.max(0, p.dia + E.diasParaCaducar - estado.dia),
    opciones: d.opciones.map((o) => ({
      id: o.id,
      texto: rellenar(o.texto, p),
      coste: o.coste ?? 0,
      porDefecto: o.id === d.porDefecto,
      bloqueo: (o.coste ?? 0) > oro ? 'No tienes oro suficiente' : null,
    })),
  };
}

export function pendientes(estado: EstadoJuego): VistaEvento[] {
  return estado.social.pendientes.map((p) => textoEvento(estado, p));
}

function aplicar(estado: EstadoJuego, p: EventoPendiente, e: Efecto, textos: string[]): void {
  const a = estado.heroes[p.a];
  const b = p.b ? estado.heroes[p.b] : undefined;
  const objetivos: Heroe[] =
    e.objetivo === 'gremio' ? heroesDe(estado, estado.jugadorId) : e.objetivo === 'ambos' ? [a, b].filter((x): x is Heroe => !!x) : e.objetivo === 'b' ? (b ? [b] : []) : e.objetivo === 'a' ? (a ? [a] : []) : [];
  for (const h of objetivos) {
    cambiarMental(h, { felicidad: e.felicidad, estres: e.estres });
    if (e.lealtad) h.lealtad = Math.max(0, Math.min(100, h.lealtad + e.lealtad));
  }
  if (a && b && (e.afinidad || e.atraccion)) {
    const t = cambiar(estado, a.id, b.id, { afinidad: e.afinidad, atraccionAB: e.atraccion, atraccionBA: e.atraccion });
    if (t) textos.push(t);
  }
  switch (e.accion) {
    case 'pareja':
      if (a && b) {
        editar(estado, a.id, b.id).pareja = 'pareja';
        const t = `${a.nombre} y ${b.nombre} ya son pareja.`;
        recordar(estado, 'pareja', [a.id, b.id], t);
        textos.push(t);
      }
      break;
    case 'ruptura':
      if (a && b) {
        editar(estado, a.id, b.id).pareja = 'expareja';
        cambiar(estado, a.id, b.id, { afinidad: S.acontecimientos.ruptura.afinidad, atraccionAB: S.acontecimientos.ruptura.atraccion, atraccionBA: S.acontecimientos.ruptura.atraccion });
        const t = `${a.nombre} y ${b.nombre} lo dejan.`;
        recordar(estado, 'ruptura', [a.id, b.id], t);
        textos.push(t);
      }
      break;
    case 'veto':
      if (a && b) {
        estado.social.vetos.push({ solicitante: a.id, otro: b.id, dia: estado.dia });
        recordar(estado, 'veto', [a.id, b.id], `${a.nombre} pidió no compartir misión con ${b.nombre}, y aceptaste.`);
        textos.push(`Prometes que ${a.nombre} no irá de misión con ${b.nombre}.`);
      }
      break;
    case 'abandono':
      if (a) {
        const g = jugador(estado);
        if (g.plantilla.includes(a.id) && a.estado !== 'en mision') {
          marcharse(estado, a, g, `${a.nombre} se despide`);
          textos.push(`${a.nombre} deja el gremio.`);
        }
      }
      break;
    case 'descanso':
      if (a && (a.estado === 'libre' || a.estado === 'descansando')) {
        a.estado = 'descansando';
        a.diasLesion = 2;
        cambiarMental(a, S.mental.descansoEvento);
      }
      break;
  }
}

/** Efecto que ocurre en cualquier caso (rechazo, celos). */
function aplicarBase(estado: EstadoJuego, d: DefEvento, p: EventoPendiente, textos: string[]): void {
  const a = estado.heroes[p.a];
  const b = p.b ? estado.heroes[p.b] : undefined;
  if (!a || !b) return;
  if (d.base === 'rechazo') {
    const R = S.acontecimientos.rechazo;
    const f = factorRasgo(a, 'rechazo');
    cambiar(estado, a.id, b.id, { afinidad: R.afinidad * f, atraccionAB: R.atraccion });
    cambiarMental(a, { felicidad: -5, estres: 5 }, 'rechazo');
    recordar(estado, 'rechazo', [a.id, b.id], `${b.nombre} rechazó a ${a.nombre}.`);
  }
  if (d.base === 'celos') {
    const C = S.acontecimientos.celos;
    const f = factorRasgo(a, 'celos');
    const t = cambiar(estado, a.id, b.id, { afinidad: C.afinidad * f });
    if (t) textos.push(t);
    const nueva = parejaDe(estado, b.id);
    if (nueva) cambiar(estado, a.id, nueva, { afinidad: C.afinidad * f });
    cambiarMental(a, { felicidad: -5, estres: 10 }, 'celos');
    recordar(estado, 'celos', [a.id, b.id], `${a.nombre} ve a su expareja, ${b.nombre}, con otra persona.`);
  }
}

/**
 * El jugador decide. Comprueba que el evento siga pendiente (así nunca se aplica dos veces), paga el coste,
 * aplica efectos, guarda el recuerdo y pone el cooldown. Devuelve lo que ha pasado.
 */
export function resolverEvento(estado: EstadoJuego, uid: string, opcionId: string): string[] {
  const i = estado.social.pendientes.findIndex((p) => p.uid === uid);
  if (i < 0) throw new Error('Ese asunto ya está resuelto');
  const p = estado.social.pendientes[i]!;
  const d = definicion(p.eventoId);
  const o = d.opciones.find((x) => x.id === opcionId);
  if (!o) throw new Error('Esa opción no existe');
  const g = jugador(estado);
  if ((o.coste ?? 0) > g.oro) throw new Error('No tienes oro suficiente');
  estado.social.pendientes.splice(i, 1);
  g.oro -= o.coste ?? 0;
  const textos: string[] = [];
  aplicarBase(estado, d, p, textos);
  for (const e of o.efectos) aplicar(estado, p, e, textos);
  const k = claveRepeticion(d.id, p.a, p.b);
  if (d.cooldown > 0) estado.social.cooldowns[k] = estado.dia + d.cooldown;
  if (d.unaVez) estado.social.unicos.push(k);
  const resumen = `${rellenar(d.titulo, p)}: ${rellenar(o.texto, p).toLowerCase()}.`;
  recordar(estado, `evento:${d.id}`, [p.a, ...(p.b ? [p.b] : [])], resumen);
  registrar(estado, 'social', resumen);
  return textos;
}

/** Los asuntos que llevan demasiado tiempo sin respuesta se resuelven con la opción por defecto. */
export function caducarEventos(estado: EstadoJuego): string[] {
  const textos: string[] = [];
  for (const p of [...estado.social.pendientes]) {
    if (estado.dia - p.dia < E.diasParaCaducar) continue;
    const d = definicion(p.eventoId);
    const vivo = estado.heroes[p.a] || d.id === 'duelo';
    if (!vivo) {
      estado.social.pendientes = estado.social.pendientes.filter((x) => x.uid !== p.uid);
      continue;
    }
    textos.push(...resolverEvento(estado, p.uid, d.porDefecto));
  }
  return textos;
}

/** Tras una muerte en el gremio del jugador: el evento de duelo (una vez por héroe). */
export function encolarDuelo(estado: EstadoJuego, muerto: Heroe): void {
  const k = claveRepeticion('duelo', muerto.id);
  if (estado.social.unicos.includes(k)) return;
  encolarEvento(estado, 'duelo', muerto);
}

/** Útil para pruebas y para el simulador: resuelve todos los pendientes con su opción por defecto. */
export function resolverTodosPorDefecto(estado: EstadoJuego): void {
  for (const p of [...estado.social.pendientes]) resolverEvento(estado, p.uid, definicion(p.eventoId).porDefecto);
}
