// Relaciones entre héroes (pilar del modo historia): afinidad por pareja, amistad, enemistad, amor,
// ánimo y lealtad. Propuesta de Claude con cifras provisionales en balance.json (relaciones y animo).
//
// - Afinidad de −100 a 100 por cada pareja de héroes. Empieza en 0 (Vael, en −40).
// - Compatibilidad oculta y fija de −2 a +2 por pareja: unas parejas mejoran solas y otras se tuercen.
// - Las misiones juntos mueven la afinidad (más si salen bien) y la química del equipo cambia su poder.
// - Cada semana: la afinidad deriva según la compatibilidad, surgen amores y celos, el ánimo se acerca a lo
//   que dan sus amistades y la lealtad sube o baja con el ánimo. Con la lealtad a 0, el héroe se va.

import balance from '../datos/balance.json';
import { heroesDe, registrar, type EstadoJuego } from './estado';
import type { Heroe } from './tipos';

const R = balance.relaciones;
const A = balance.animo;

export type Nivel = 'enemigos' | 'mala relación' | 'neutral' | 'amigos' | 'mejores amigos';
export type Vinculo = Nivel | 'pareja';

export function clave(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function afinidadInicial(estado: EstadoJuego, a: string, b: string): number {
  const vael = [a, b].some((id) => estado.heroes[id]?.habilidad === 'redencion');
  return vael ? balance.habilidades.redencion.afinidadInicial : 0;
}

export function afinidad(estado: EstadoJuego, a: string, b: string): number {
  return estado.relaciones[clave(a, b)] ?? afinidadInicial(estado, a, b);
}

/** Compatibilidad fija (−2 a +2) de una pareja: sale de la semilla de la partida, sin gastar azar. */
export function compatibilidad(estado: EstadoJuego, a: string, b: string): number {
  let x = estado.semilla ^ 0x9e3779b9;
  for (const c of clave(a, b)) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0;
  let tirada = (x % 10000) / 100;
  for (const [valor, p] of Object.entries(R.compatibilidad)) {
    if (tirada < p) return Number(valor);
    tirada -= p;
  }
  return 0;
}

export function nivelDe(af: number): Nivel {
  const U = R.umbrales;
  if (af <= U.enemigos) return 'enemigos';
  if (af <= U.mala) return 'mala relación';
  if (af >= U.mejores) return 'mejores amigos';
  if (af >= U.amigos) return 'amigos';
  return 'neutral';
}

const ORDEN: Nivel[] = ['enemigos', 'mala relación', 'neutral', 'amigos', 'mejores amigos'];

export function sonPareja(estado: EstadoJuego, a: string, b: string): boolean {
  return estado.heroes[a]?.amor === b && estado.heroes[b]?.amor === a;
}

export function vinculo(estado: EstadoJuego, a: string, b: string): Vinculo {
  return sonPareja(estado, a, b) ? 'pareja' : nivelDe(afinidad(estado, a, b));
}

/**
 * Cambia la afinidad de una pareja. Si el nivel cambia, devuelve un texto para el resumen.
 * Vael (Redención) gana poder permanente cada vez que una relación suya sube de nivel.
 */
export function cambiarAfinidad(estado: EstadoJuego, a: string, b: string, delta: number): string | null {
  if (a === b || delta === 0) return null;
  const antes = afinidad(estado, a, b);
  const despues = Math.max(-100, Math.min(100, Math.round(antes + delta)));
  estado.relaciones[clave(a, b)] = despues;
  const na = nivelDe(antes);
  const nd = nivelDe(despues);
  if (na === nd) return null;
  const ha = estado.heroes[a];
  const hb = estado.heroes[b];
  if (!ha || !hb) return null;
  if (ORDEN.indexOf(nd) > ORDEN.indexOf(na)) {
    for (const v of [ha, hb]) {
      if (v.habilidad === 'redencion') {
        v.poder += balance.habilidades.redencion.poder;
        v.potencial = Math.max(v.potencial, v.poder);
      }
    }
  }
  return textoNivel(ha, hb, nd);
}

function textoNivel(a: Heroe, b: Heroe, n: Nivel): string {
  switch (n) {
    case 'mejores amigos':
      return `${a.nombre} y ${b.nombre} ahora son inseparables.`;
    case 'amigos':
      return `${a.nombre} y ${b.nombre} se han hecho amigos.`;
    case 'neutral':
      return `${a.nombre} y ${b.nombre} ya no se llevan ni bien ni mal.`;
    case 'mala relación':
      return `${a.nombre} y ${b.nombre} se llevan mal.`;
    default:
      return `${a.nombre} y ${b.nombre} ya son enemigos.`;
  }
}

// ---------------------------------------------------------------------------
// Ánimo
// ---------------------------------------------------------------------------

export function animo(h: Heroe): number {
  return h.animo ?? A.inicial;
}

export function cambiarAnimo(h: Heroe, delta: number): void {
  h.animo = Math.max(0, Math.min(100, Math.round(animo(h) + delta)));
}

/** Multiplicador del poder en misión por el ánimo: ±15% en los extremos. */
export function factorAnimo(h: Heroe): number {
  return 1 + (animo(h) - 50) * A.factorPoder;
}

export function textoAnimo(h: Heroe): string {
  const a = animo(h);
  if (a >= 80) return 'Eufórico';
  if (a >= A.umbralAlto) return 'Contento';
  if (a >= A.umbralBajo) return 'Normal';
  if (a >= 15) return 'Desanimado';
  return 'Hundido';
}

// ---------------------------------------------------------------------------
// Química del equipo
// ---------------------------------------------------------------------------

/** Héroes a los que no les afectan las relaciones en misión (Sable, Nevada). */
export function inmuneARelaciones(h: Heroe): boolean {
  return h.habilidad === 'sinTestigos' || h.habilidad === 'imperturbable';
}

/** Química de un equipo, en % de poder: suma de lo que aporta cada pareja, con un tope. */
export function quimica(estado: EstadoJuego, equipo: readonly Heroe[]): number {
  const Q = R.quimica;
  const tabla: Record<Vinculo, number> = { enemigos: Q.enemigos, 'mala relación': Q.mala, neutral: 0, amigos: Q.amigos, 'mejores amigos': Q.mejores, pareja: Q.pareja };
  let total = 0;
  const miembros = equipo.filter((h) => !inmuneARelaciones(h));
  for (let i = 0; i < miembros.length; i++) {
    for (let j = i + 1; j < miembros.length; j++) total += tabla[vinculo(estado, miembros[i]!.id, miembros[j]!.id)];
  }
  return Math.max(-Q.maximo, Math.min(Q.maximo, total));
}

/** Tras una misión juntos: la afinidad de cada pareja del equipo cambia. Rima la acelera; Teo frena lo malo. */
export function relacionesTrasMision(estado: EstadoJuego, equipo: readonly Heroe[], exito: boolean, activas: (h: Heroe) => string | null): string[] {
  const textos: string[] = [];
  const balada = equipo.some((h) => activas(h) === 'balada') ? 2 : 1;
  const mediador = equipo.some((h) => activas(h) === 'mediador');
  const miembros = equipo.filter((h) => !inmuneARelaciones(h));
  for (let i = 0; i < miembros.length; i++) {
    for (let j = i + 1; j < miembros.length; j++) {
      const a = miembros[i]!;
      const b = miembros[j]!;
      let delta = (exito ? R.misionExito : R.misionFracaso) + compatibilidad(estado, a.id, b.id) * R.porCompatibilidad;
      if (mediador && delta < 0) delta = 0;
      const t = cambiarAfinidad(estado, a.id, b.id, delta * balada);
      if (t) textos.push(t);
    }
  }
  return textos;
}

// ---------------------------------------------------------------------------
// Semana: deriva, amor, celos, ánimo y lealtad
// ---------------------------------------------------------------------------

export interface ResultadoSemanal {
  textos: string[];
  /** Héroes que se van por falta de lealtad. */
  seVan: string[];
}

export function semanaRelaciones(estado: EstadoJuego, gremioId: string, azar: { probabilidad(p: number): boolean }): ResultadoSemanal {
  const heroes = heroesDe(estado, gremioId);
  const textos: string[] = [];
  // Deriva por compatibilidad.
  for (let i = 0; i < heroes.length; i++) {
    for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i]!;
      const b = heroes[j]!;
      const t = cambiarAfinidad(estado, a.id, b.id, compatibilidad(estado, a.id, b.id) * R.semanalPorCompatibilidad);
      if (t) textos.push(t);
    }
  }
  // Amor: quien no está enamorado puede enamorarse del compañero con quien mejor se lleva.
  const ids = new Set(heroes.map((h) => h.id));
  for (const h of heroes) {
    if (h.amor && !ids.has(h.amor)) h.amor = null;
    if (h.amor) continue;
    const opciones = heroes
      .filter((m) => m.id !== h.id && afinidad(estado, h.id, m.id) >= (m.habilidad === 'lookAtMe' ? R.amor.umbralFacil : R.amor.umbral))
      .sort((x, y) => afinidad(estado, h.id, y.id) - afinidad(estado, h.id, x.id));
    const elegido = opciones[0];
    if (!elegido) continue;
    const prob = R.amor.probabilidad * (elegido.habilidad === 'lookAtMe' ? 2 : 1);
    if (!azar.probabilidad(prob)) continue;
    h.amor = elegido.id;
    textos.push(sonPareja(estado, h.id, elegido.id) ? `${h.nombre} y ${elegido.nombre} ya son pareja.` : `${h.nombre} se ha enamorado de ${elegido.nombre}.`);
  }
  // Celos: quien quiere a alguien que quiere a otro.
  for (const h of heroes) {
    const amado = h.amor ? estado.heroes[h.amor] : undefined;
    if (!amado?.amor || amado.amor === h.id || !ids.has(amado.amor)) continue;
    cambiarAnimo(h, -R.celos);
    cambiarAfinidad(estado, h.id, amado.amor, -R.celos);
  }
  // Ánimo hacia lo que dan sus relaciones, y lealtad según el ánimo.
  const seVan: string[] = [];
  for (const h of heroes) {
    let base = A.base;
    for (const m of heroes) {
      if (m.id === h.id) continue;
      const v = vinculo(estado, h.id, m.id);
      if (v === 'amigos' || v === 'mejores amigos' || v === 'pareja') base += A.porAmigo;
      if (v === 'mala relación' || v === 'enemigos') base += A.porEnemigo;
    }
    base = Math.max(20, Math.min(85, base));
    cambiarAnimo(h, (base - animo(h)) * A.deriva);
    const a = animo(h);
    const antes = h.lealtad;
    if (a >= A.umbralAlto) h.lealtad = Math.min(100, h.lealtad + A.lealtadAlto);
    else if (a < A.umbralBajo) h.lealtad = Math.max(0, h.lealtad + A.lealtadBajo);
    if (h.lealtad <= 0) seVan.push(h.id);
    else if (h.lealtad < A.lealtadAviso && antes >= A.lealtadAviso) textos.push(`${h.nombre} está pensando en dejar el gremio: su lealtad está muy baja.`);
  }
  if (estado.gremios[gremioId]?.esJugador) for (const t of textos) registrar(estado, 'relacion', t);
  return { textos, seVan };
}

/**
 * Un héroe deja el gremio (muere, lo venden o se marcha): sus compañeros lo notan según lo que los unía.
 */
export function perderCompanero(estado: EstadoJuego, gremioId: string, ido: Heroe, causa: 'muerte' | 'marcha'): string[] {
  const tabla = causa === 'muerte' ? R.muerte : { ...R.perdida, todos: 0 };
  const textos: string[] = [];
  for (const m of heroesDe(estado, gremioId)) {
    if (m.id === ido.id) continue;
    const v = vinculo(estado, m.id, ido.id);
    let caida = tabla.todos;
    if (v === 'pareja' || m.amor === ido.id) caida += tabla.pareja;
    else if (v === 'mejores amigos') caida += tabla.mejores;
    else if (v === 'amigos') caida += tabla.amigos;
    if (caida > 0) cambiarAnimo(m, -caida);
    if (m.amor === ido.id) {
      m.lealtad = Math.max(0, m.lealtad - (causa === 'muerte' ? 10 : 15));
      textos.push(causa === 'muerte' ? `${m.nombre} ha perdido a su amor.` : `${m.nombre} echa de menos a ${ido.nombre}.`);
      m.amor = null;
    } else if (v === 'mejores amigos') {
      textos.push(`${m.nombre} ha perdido a su mejor amigo.`);
    }
  }
  if (causa === 'muerte') ido.amor = null;
  return textos;
}

/** Relaciones de un héroe con sus compañeros de gremio, de la mejor a la peor. */
export function relacionesDe(estado: EstadoJuego, gremioId: string, heroeId: string): { heroe: Heroe; afinidad: number; vinculo: Vinculo; leAma: boolean; laAma: boolean }[] {
  const h = estado.heroes[heroeId];
  return heroesDe(estado, gremioId)
    .filter((m) => m.id !== heroeId)
    .map((m) => ({ heroe: m, afinidad: afinidad(estado, heroeId, m.id), vinculo: vinculo(estado, heroeId, m.id), leAma: m.amor === heroeId, laAma: h?.amor === m.id }))
    .sort((a, b) => b.afinidad - a.afinidad);
}
