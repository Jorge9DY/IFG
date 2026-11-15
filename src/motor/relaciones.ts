// Sistema social de los héroes (documento «Sistema social de héroes» v1.0 del propietario).
// Este módulo es el núcleo: relaciones por pareja (afinidad compartida y atracción direccional), estado mental
// (felicidad y estrés), rasgos de personalidad, memoria de hechos importantes, modificadores en misión y
// consecuencias de misiones, marchas y muertes. Los eventos con decisiones están en eventosSociales.ts.
// Las relaciones no cambian solas con el tiempo: solo por acontecimientos. Cifras en src/datos/social.json.

import balance from '../datos/balance.json';
import S from '../datos/social.json';
import { heroesDe, registrar, type EstadoJuego, type EventoPendiente, type Memoria } from './estado';
import type { Heroe, Relacion } from './tipos';

const U = S.umbrales;

export type Nivel = 'enemigos' | 'mala relación' | 'neutral' | 'amigos' | 'grandes amigos';
/** Lo que más pesa de una relación: la pareja, y si no, el nivel de afinidad. */
export type Vinculo = Nivel | 'pareja';
export type Romance = 'ninguno' | 'interés' | 'enamorado' | 'pareja' | 'expareja';

const limitar = (v: number, [min, max]: number[]): number => Math.max(min ?? 0, Math.min(max ?? 100, Math.round(v)));

// ---------------------------------------------------------------------------
// Registro de relaciones
// ---------------------------------------------------------------------------

/** Clave única de una pareja: el mismo registro para A-B y B-A. */
export function clave(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function nueva(estado: EstadoJuego, a: string, b: string): Relacion {
  // Vael (Redención) empieza llevándose mal con todos: excepción de diseño.
  const vael = [a, b].some((id) => estado.heroes[id]?.habilidad === 'redencion');
  return { afinidad: vael ? balance.habilidades.redencion.afinidadInicial : 0, atraccion: [0, 0], pareja: 'ninguna', rivales: false, historial: [] };
}

/** Relación de una pareja (neutral por defecto si no existe). No la crea. */
export function relacion(estado: EstadoJuego, a: string, b: string): Relacion {
  return estado.relaciones[clave(a, b)] ?? nueva(estado, a, b);
}

/** Relación para modificarla: la crea si no existía (cuando ocurre una interacción relevante). */
export function editar(estado: EstadoJuego, a: string, b: string): Relacion {
  const k = clave(a, b);
  estado.relaciones[k] ??= nueva(estado, a, b);
  return estado.relaciones[k]!;
}

export function existeRelacion(estado: EstadoJuego, a: string, b: string): boolean {
  return clave(a, b) in estado.relaciones;
}

export function afinidad(estado: EstadoJuego, a: string, b: string): number {
  return relacion(estado, a, b).afinidad;
}

/** Atracción romántica de un héroe hacia otro (direccional). */
export function atraccion(estado: EstadoJuego, de: string, hacia: string): number {
  const r = relacion(estado, de, hacia);
  return de < hacia ? r.atraccion[0] : r.atraccion[1];
}

export function nivelDe(af: number): Nivel {
  if (af <= U.enemigos) return 'enemigos';
  if (af <= U.malaRelacion) return 'mala relación';
  if (af >= U.grandesAmigos) return 'grandes amigos';
  if (af >= U.amigos) return 'amigos';
  return 'neutral';
}

const ORDEN: Nivel[] = ['enemigos', 'mala relación', 'neutral', 'amigos', 'grandes amigos'];

export function sonPareja(estado: EstadoJuego, a: string, b: string): boolean {
  return a !== b && relacion(estado, a, b).pareja === 'pareja' && !!estado.heroes[a] && !!estado.heroes[b];
}

export function vinculo(estado: EstadoJuego, a: string, b: string): Vinculo {
  return sonPareja(estado, a, b) ? 'pareja' : nivelDe(afinidad(estado, a, b));
}

/** Estado romántico de un héroe hacia otro: pareja y expareja son compartidos; interés y enamoramiento, direccionales. */
export function romance(estado: EstadoJuego, de: string, hacia: string): Romance {
  const r = relacion(estado, de, hacia);
  if (r.pareja === 'pareja') return 'pareja';
  const at = atraccion(estado, de, hacia);
  if (at >= U.enamorado) return 'enamorado';
  if (at >= U.interes) return 'interés';
  return r.pareja === 'expareja' ? 'expareja' : 'ninguno';
}

/** Pareja actual de un héroe (viva), o null. */
export function parejaDe(estado: EstadoJuego, id: string): string | null {
  for (const [k, r] of Object.entries(estado.relaciones)) {
    if (r.pareja !== 'pareja') continue;
    const [a, b] = k.split('|') as [string, string];
    const otro = a === id ? b : b === id ? a : null;
    if (otro && estado.heroes[otro]) return otro;
  }
  return null;
}

/** De quién está enamorado: su pareja o, si no tiene, a quien más atracción siente (si llega a enamoramiento). */
export function amorDe(estado: EstadoJuego, id: string): string | null {
  const pareja = parejaDe(estado, id);
  if (pareja) return pareja;
  let mejor: string | null = null;
  let max = U.enamorado - 1;
  for (const otro of Object.keys(estado.heroes)) {
    if (otro === id || !existeRelacion(estado, id, otro)) continue;
    const at = atraccion(estado, id, otro);
    if (at > max) {
      max = at;
      mejor = otro;
    }
  }
  return mejor;
}

export interface Cambio {
  afinidad?: number;
  /** Atracción de a hacia b y de b hacia a. */
  atraccionAB?: number;
  atraccionBA?: number;
}

/**
 * Cambia una relación (dentro de sus límites). Devuelve un texto si cambia de nivel o nace un interés.
 * Vael (Redención) gana poder permanente cada vez que una relación suya sube de nivel.
 */
export function cambiar(estado: EstadoJuego, a: string, b: string, c: Cambio): string | null {
  if (a === b) return null;
  const ha = estado.heroes[a];
  const hb = estado.heroes[b];
  if (!ha || !hb) return null;
  const r = editar(estado, a, b);
  const antes = nivelDe(r.afinidad);
  const romAntes = [romance(estado, a, b), romance(estado, b, a)];
  r.afinidad = limitar(r.afinidad + (c.afinidad ?? 0), S.limites.afinidad);
  const [i, j] = a < b ? [0, 1] : [1, 0];
  r.atraccion[i] = limitar(r.atraccion[i]! + (c.atraccionAB ?? 0), S.limites.atraccion);
  r.atraccion[j] = limitar(r.atraccion[j]! + (c.atraccionBA ?? 0), S.limites.atraccion);
  const despues = nivelDe(r.afinidad);
  let texto: string | null = null;
  if (antes !== despues) {
    if (ORDEN.indexOf(despues) > ORDEN.indexOf(antes)) {
      for (const v of [ha, hb]) {
        if (v.habilidad === 'redencion') {
          v.poder += balance.habilidades.redencion.poder;
          v.potencial = Math.max(v.potencial, v.poder);
        }
      }
      if (despues === 'amigos' && !r.historial.includes('amistad')) {
        r.historial.push('amistad');
        recordar(estado, 'amistad', [a, b], `${ha.nombre} y ${hb.nombre} se hacen amigos.`);
      }
    }
    texto = textoNivel(ha, hb, despues);
  }
  const romDespues = [romance(estado, a, b), romance(estado, b, a)];
  for (const [k, [de, hacia]] of [[a, b], [b, a]].entries()) {
    if (romAntes[k] !== romDespues[k] && (romDespues[k] === 'interés' || romDespues[k] === 'enamorado')) {
      const t = `${estado.heroes[de!]!.nombre} ${romDespues[k] === 'enamorado' ? 'se ha enamorado de' : 'se ha fijado en'} ${estado.heroes[hacia!]!.nombre}.`;
      recordar(estado, romDespues[k] === 'enamorado' ? 'enamoramiento' : 'interes', [de!, hacia!], t);
      texto = texto ? `${texto} ${t}` : t;
    }
  }
  return texto;
}

export function cambiarAfinidad(estado: EstadoJuego, a: string, b: string, delta: number): string | null {
  return cambiar(estado, a, b, { afinidad: delta });
}

function textoNivel(a: Heroe, b: Heroe, n: Nivel): string {
  switch (n) {
    case 'grandes amigos':
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

/** Química romántica oculta y fija (0–3) de un héroe hacia otro: sale de la semilla, sin gastar azar. */
export function chispa(estado: EstadoJuego, de: string, hacia: string): number {
  let x = estado.semilla ^ 0x85ebca6b;
  for (const c of `${de}>${hacia}`) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  let tirada = (x % 10000) / 100;
  for (const [valor, p] of Object.entries(S.chispa.probabilidades)) {
    if (tirada < p) return Number(valor);
    tirada -= p;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Rasgos, felicidad y estrés
// ---------------------------------------------------------------------------

export function rasgos(h: Heroe): string[] {
  return h.rasgos ?? [];
}

export function tieneRasgo(h: Heroe, rasgo: string): boolean {
  return rasgos(h).includes(rasgo);
}

/** Multiplicador de los rasgos de un héroe para un acontecimiento (1 si ningún rasgo dice nada). */
export function factorRasgo(h: Heroe, acontecimiento: string): number {
  const P = S.personalidad as unknown as Record<string, Record<string, number | boolean>>;
  return rasgos(h).reduce((f, r) => {
    const v = P[r]?.[acontecimiento];
    return typeof v === 'number' ? f * v : f;
  }, 1);
}

export function felicidad(h: Heroe): number {
  return h.felicidad ?? S.mentalInicial.felicidad;
}

export function estres(h: Heroe): number {
  return h.estres ?? S.mentalInicial.estres;
}

export interface CambioMental {
  felicidad?: number;
  estres?: number;
}

/**
 * Cambia felicidad y estrés (dentro de 0–100). Los rasgos modulan: el paciente acumula menos estrés y,
 * si se indica el acontecimiento, sus rasgos multiplican lo negativo (p. ej. el orgulloso lleva peor un fracaso).
 */
export function cambiarMental(h: Heroe, c: CambioMental, acontecimiento?: string): void {
  const f = acontecimiento ? factorRasgo(h, acontecimiento) : 1;
  const fel = c.felicidad ?? 0;
  const est = c.estres ?? 0;
  h.felicidad = limitar(felicidad(h) + (fel < 0 ? fel * f : fel), S.limites.mental);
  h.estres = limitar(estres(h) + (est > 0 ? est * f * factorRasgo(h, 'estres') : est), S.limites.mental);
}

export function textoFelicidad(h: Heroe): string {
  const v = felicidad(h);
  if (v >= 80) return 'Feliz';
  if (v >= 50) return 'Contento';
  if (v >= S.efectos.descontento) return 'Apagado';
  if (v >= S.efectos.abandono) return 'Descontento';
  return 'Hundido';
}

export function textoEstres(h: Heroe): string {
  const v = estres(h);
  if (v > S.efectos.crisis) return 'Al límite';
  if (v > S.mision.estresAlto) return 'Muy estresado';
  if (v >= 40) return 'Tenso';
  return 'Tranquilo';
}

/** Penalización individual en misión por estrés alto (la única penalización constante del estado mental). */
export function factorEstres(h: Heroe): number {
  return estres(h) > S.mision.estresAlto ? 1 + S.mision.penalizacionEstres / 100 : 1;
}

// ---------------------------------------------------------------------------
// Memoria
// ---------------------------------------------------------------------------

/** Guarda un hecho importante (y su marca en el historial de la pareja, si son dos). */
export function recordar(estado: EstadoJuego, tipo: string, heroes: string[], texto: string): void {
  const m: Memoria = { dia: estado.dia, tipo, heroes, texto };
  estado.social.memorias.push(m);
  if (estado.social.memorias.length > S.eventos.memoriaMaxima) estado.social.memorias.splice(0, estado.social.memorias.length - S.eventos.memoriaMaxima);
  if (heroes.length === 2) {
    const r = editar(estado, heroes[0]!, heroes[1]!);
    if (!r.historial.includes(tipo)) r.historial.push(tipo);
  }
}

/** Recuerdos de un héroe o de una pareja, del más reciente al más antiguo. */
export function memoriasDe(estado: EstadoJuego, ...ids: string[]): Memoria[] {
  return estado.social.memorias.filter((m) => ids.every((id) => m.heroes.includes(id))).reverse();
}

/** Añade un evento social a la cola de decisiones del jugador. */
export function encolarEvento(estado: EstadoJuego, eventoId: string, a: Heroe, b?: Heroe): EventoPendiente {
  estado.social.contador += 1;
  const p: EventoPendiente = { uid: `ev_${estado.social.contador}`, eventoId, a: a.id, b: b?.id, nombres: { a: a.nombre, b: b?.nombre }, dia: estado.dia };
  estado.social.pendientes.push(p);
  return p;
}

// ---------------------------------------------------------------------------
// Misiones
// ---------------------------------------------------------------------------

/** Héroes a los que no les afectan las relaciones en misión (Sable, Nevada). */
export function inmuneARelaciones(h: Heroe): boolean {
  return h.habilidad === 'sinTestigos' || h.habilidad === 'imperturbable';
}

export interface ModificadorSocial {
  /** % de poder para todo el equipo (con tope). */
  total: number;
  detalles: { texto: string; valor: number }[];
}

/** Modificador social del equipo: amistades, parejas, rivalidades y enemistades, con un tope (sección 8.1). */
export function modificadorSocial(estado: EstadoJuego, equipo: readonly Heroe[]): ModificadorSocial {
  const M = S.mision;
  const detalles: ModificadorSocial['detalles'] = [];
  const miembros = equipo.filter((h) => !inmuneARelaciones(h));
  for (let i = 0; i < miembros.length; i++) {
    for (let j = i + 1; j < miembros.length; j++) {
      const a = miembros[i]!;
      const b = miembros[j]!;
      const v = vinculo(estado, a.id, b.id);
      const tabla: Record<Vinculo, number> = { pareja: M.pareja, 'grandes amigos': M.grandesAmigos, amigos: M.amigos, neutral: 0, 'mala relación': M.malaRelacion, enemigos: M.enemigos };
      const nombres = `${a.nombre} y ${b.nombre}`;
      if (tabla[v]) detalles.push({ texto: `${nombres}: ${v}`, valor: tabla[v] });
      if (relacion(estado, a.id, b.id).rivales) detalles.push({ texto: `${nombres}: rivales, se pican`, valor: M.rivales });
    }
  }
  const suma = detalles.reduce((t, d) => t + d.valor, 0);
  return { total: Math.max(-M.tope, Math.min(M.tope, suma)), detalles };
}

/** Compatibilidad con el código anterior: el % social del equipo. */
export function quimica(estado: EstadoJuego, equipo: readonly Heroe[]): number {
  return modificadorSocial(estado, equipo).total;
}

export interface ParteSocial {
  heroeId: string;
  diasLesion: number;
  /** Subió de poder en esta misión (recompensa mayor que la de los demás). */
  subio: boolean;
}

/**
 * Consecuencias sociales de una misión (secciones 5, 7 y 8.3). Puede curar a un lesionado que un compañero
 * protegió (lo devuelve en «salvados»). `activa` dice qué habilidad actúa en misión (Rima, Teo).
 */
export function trasMision(
  estado: EstadoJuego,
  azar: { probabilidad(p: number): boolean; elegir<T>(l: readonly T[]): T },
  equipo: readonly Heroe[],
  exito: boolean,
  partes: readonly ParteSocial[],
  activa: (h: Heroe) => string | null,
): { textos: string[]; salvados: string[] } {
  const A = S.acontecimientos;
  const M = S.mision;
  const textos: string[] = [];
  const salvados: string[] = [];
  const decir = (t: string | null): void => {
    if (t) textos.push(t);
  };
  const balada = equipo.some((h) => activa(h) === 'balada') ? 2 : 1;
  const mediador = equipo.some((h) => activa(h) === 'mediador');
  const miembros = equipo.filter((h) => !inmuneARelaciones(h) && estado.heroes[h.id]);
  const lesionado = (h: Heroe): boolean => (partes.find((p) => p.heroeId === h.id)?.diasLesion ?? 0) > 0;

  // 8.3 Un héroe protege a su pareja o un amigo ayuda a otro en peligro.
  for (const h of miembros.filter(lesionado)) {
    const protector = miembros
      .filter((x) => x.id !== h.id && !lesionado(x) && (sonPareja(estado, x.id, h.id) || afinidad(estado, x.id, h.id) >= U.amigos))
      .sort((x, y) => Number(sonPareja(estado, y.id, h.id)) - Number(sonPareja(estado, x.id, h.id)))[0];
    if (!protector || !azar.probabilidad(M.probSalvar)) continue;
    h.estado = 'libre';
    h.diasLesion = 0;
    salvados.push(h.id);
    decir(cambiar(estado, protector.id, h.id, { afinidad: A.salvar.afinidad * balada, atraccionAB: A.salvar.atraccion, atraccionBA: A.salvar.atraccion }));
    const t = `${protector.nombre} se interpone y salva a ${h.nombre} de una herida.`;
    recordar(estado, 'salvado', [protector.id, h.id], t);
    decir(t);
  }
  // Cada pareja del equipo: misión juntos, discusiones y rivalidades.
  for (let i = 0; i < miembros.length; i++) {
    for (let j = i + 1; j < miembros.length; j++) {
      const a = miembros[i]!;
      const b = miembros[j]!;
      const r = editar(estado, a.id, b.id);
      if (!r.historial.includes('primeraMision')) r.historial.push('primeraMision');
      const factor = (factorRasgo(a, 'misionJuntos') + factorRasgo(b, 'misionJuntos')) / 2;
      decir(cambiar(estado, a.id, b.id, { afinidad: A.misionJuntos.afinidad * factor * balada }));
      // La atracción crece con la química romántica de cada uno (Aimul enamora con más facilidad).
      if (afinidad(estado, a.id, b.id) >= S.chispa.afinidadMinima) {
        // Aimul enamora el doble; Yandere se obsesiona el doble de rápido.
        const extra = (de: Heroe, hacia: Heroe): number =>
          factorEnamoradizo(de) * factorAtractivo(hacia) * (hacia.habilidad === 'lookAtMe' ? 2 : 1) * (de.habilidad === 'obsesion' ? balance.habilidades.obsesion.atraccion : 1);
        const ab = chispa(estado, a.id, b.id) * S.chispa.porMision * extra(a, b);
        const ba = chispa(estado, b.id, a.id) * S.chispa.porMision * extra(b, a);
        decir(cambiar(estado, a.id, b.id, { atraccionAB: ab * balada, atraccionBA: ba * balada }));
      }
      // Dos que se llevan mal discuten (más si sale mal). Teo lo impide.
      const nivel = nivelDe(afinidad(estado, a.id, b.id));
      if (!mediador && (nivel === 'enemigos' || nivel === 'mala relación') && azar.probabilidad(M.probDiscutir * (exito ? 1 : 2))) {
        const f = Math.max(factorRasgo(a, 'discutir'), factorRasgo(b, 'discutir'));
        decir(cambiar(estado, a.id, b.id, { afinidad: A.discutir.afinidad * f * balada }));
        cambiarMental(a, S.mental.discusion, 'discutir');
        cambiarMental(b, S.mental.discusion, 'discutir');
        const t = `${a.nombre} y ${b.nombre} discuten en plena misión.`;
        recordar(estado, 'discusion', [a.id, b.id], t);
        decir(t);
      }
      // Caracteres incompatibles chocan (y Teo lo evita). Es la fuente de las malas relaciones.
      if (!mediador && choque(a, b) && azar.probabilidad(S.choques.probabilidad)) {
        decir(cambiar(estado, a.id, b.id, { afinidad: S.choques.afinidad * balada }));
        const t = `${a.nombre} y ${b.nombre} chocan: ${choque(a, b)}.`;
        recordar(estado, 'choque', [a.id, b.id], t);
        decir(t);
      }
      // Un rival intenta demostrar su superioridad.
      if (r.rivales && azar.probabilidad(M.probRivalidad)) {
        const [fuerte, flojo] = a.poder >= b.poder ? [a, b] : [b, a];
        cambiarMental(fuerte, { felicidad: 3 });
        cambiarMental(flojo, { estres: 5 });
        decir(`${fuerte.nombre} deja claro a ${flojo.nombre} quién manda.`);
      }
    }
  }
  // Recompensa mayor: quien sube de poder delante de los demás despierta celos, admiración o rivalidad.
  const P = S.personalidad as unknown as Record<string, Record<string, number | boolean>>;
  for (const ganador of miembros.filter((h) => partes.find((p) => p.heroeId === h.id)?.subio)) {
    for (const o of miembros.filter((h) => h.id !== ganador.id && !partes.find((p) => p.heroeId === h.id)?.subio)) {
      const delta = rasgos(o).reduce((t, ra) => t + (typeof P[ra]?.recompensaMayor === 'number' ? (P[ra]!.recompensaMayor as number) : 0), 0);
      if (delta) decir(cambiar(estado, o.id, ganador.id, { afinidad: delta }));
      const r = editar(estado, o.id, ganador.id);
      if (tieneRasgo(o, 'competitivo') && !r.rivales) {
        r.rivales = true;
        const t = `${o.nombre} ve crecer a ${ganador.nombre} y se lo toma como algo personal: ahora son rivales.`;
        recordar(estado, 'rivalidad', [o.id, ganador.id], t);
        decir(t);
      }
    }
  }
  // Felicidad y estrés.
  for (const h of equipo) {
    if (!estado.heroes[h.id]) continue;
    cambiarMental(h, exito ? S.mental.misionExito : S.mental.misionFracaso, exito ? undefined : 'misionFracaso');
    if (lesionado(h) && !salvados.includes(h.id)) cambiarMental(h, S.mental.lesion);
  }
  return { textos, salvados };
}

/** Índices de romance de cada héroe (1–5) y su multiplicador sobre la atracción. */
export function indiceEnamoradizo(h: Heroe): number {
  return h.enamoradizo ?? S.indices.porDefecto;
}

export function indiceAtractivo(h: Heroe): number {
  return h.atractivo ?? S.indices.porDefecto;
}

const factorDe = (n: number): number => S.chispa.factorIndice[Math.max(1, Math.min(5, Math.round(n))) - 1] ?? 1;

/** Cuánto más (o menos) se enamora este héroe. */
export function factorEnamoradizo(h: Heroe): number {
  return factorDe(indiceEnamoradizo(h));
}

/** Cuánto más (o menos) se enamoran de este héroe. */
export function factorAtractivo(h: Heroe): number {
  return factorDe(indiceAtractivo(h));
}

export function textoIndices(h: Heroe): { enamoradizo: string; atractivo: string } {
  return { enamoradizo: S.indices.nombreEnamoradizo[indiceEnamoradizo(h) - 1] ?? '', atractivo: S.indices.nombreAtractivo[indiceAtractivo(h) - 1] ?? '' };
}

/** Si dos caracteres chocan, cuál es el motivo (para el texto); si no, null. */
export function choque(a: Heroe, b: Heroe): string | null {
  const N = S.nombreRasgo as Record<string, string>;
  for (const [x, y] of S.choques.parejas as [string, string][]) {
    if ((tieneRasgo(a, x) && tieneRasgo(b, y)) || (tieneRasgo(a, y) && tieneRasgo(b, x))) {
      return x === y ? `dos ${N[x]?.toLowerCase()}s no caben en la misma misión` : `${N[x]?.toLowerCase()} contra ${N[y]?.toLowerCase()}`;
    }
  }
  return null;
}

/** Al terminar el día: quien se ha quedado en la sede descansa un poco (el estrés baja; la felicidad, no sola). */
export function descansoDelDia(estado: EstadoJuego): void {
  for (const h of Object.values(estado.heroes)) {
    if (h.estado === 'descansando') cambiarMental(h, { estres: S.mental.descansoDia.estres * 2 });
    else if (h.estado === 'libre' && h.ultimoRegreso !== estado.dia) cambiarMental(h, S.mental.descansoDia);
    else if (h.estado === 'lesionado') cambiarMental(h, { estres: S.mental.descansoDia.estres / 2 });
  }
}

// ---------------------------------------------------------------------------
// Marchas y muertes
// ---------------------------------------------------------------------------

/**
 * Un héroe deja el gremio (muere, lo venden o se marcha): sus compañeros lo notan según lo que los unía
 * (sección 10). Las relaciones quedan guardadas; una pareja separada por una marcha pasa a expareja.
 */
export function perderCompanero(estado: EstadoJuego, gremioId: string, ido: Heroe, causa: 'muerte' | 'marcha'): string[] {
  const D = S.muerte;
  const textos: string[] = [];
  for (const m of heroesDe(estado, gremioId)) {
    if (m.id === ido.id) continue;
    const v = vinculo(estado, m.id, ido.id);
    const enamorado = romance(estado, m.id, ido.id) === 'enamorado';
    const r = relacion(estado, m.id, ido.id);
    if (causa === 'muerte') {
      let c = D.sinRelacion;
      if (v === 'pareja') c = D.pareja;
      else if (enamorado) c = D.enamorado;
      else if (v === 'grandes amigos') c = D.granAmigo;
      else if (v === 'amigos') c = D.amigo;
      else if (v === 'enemigos' || v === 'mala relación' || r.rivales) c = tieneRasgo(m, 'amable') ? D.enemigoAmable : tieneRasgo(m, 'competitivo') ? D.enemigoCompetitivo : { felicidad: 0, estres: 0 };
      cambiarMental(m, c, 'muerte');
      if (v === 'pareja' || enamorado || v === 'amigos' || v === 'grandes amigos') {
        const t = v === 'pareja' ? `${m.nombre} ha perdido a su pareja.` : enamorado ? `${m.nombre} ha perdido a quien amaba.` : `${m.nombre} llora a su amigo ${ido.nombre}.`;
        recordar(estado, 'duelo', [m.id, ido.id], t);
        textos.push(t);
      }
    } else {
      if (v === 'pareja') {
        cambiarMental(m, S.mental.marchaPareja, 'marcha');
        editar(estado, m.id, ido.id).pareja = 'expareja';
        textos.push(`${m.nombre} se queda sin ${ido.nombre}: la distancia los separa.`);
        recordar(estado, 'separacion', [m.id, ido.id], `${m.nombre} y ${ido.nombre} se separan: uno deja el gremio.`);
      } else if (v === 'amigos' || v === 'grandes amigos') {
        cambiarMental(m, S.mental.marchaAmigo, 'marcha');
        textos.push(`${m.nombre} echa de menos a ${ido.nombre}.`);
      }
    }
  }
  recordar(estado, causa === 'muerte' ? 'muerte' : 'marcha', [ido.id], causa === 'muerte' ? `Muere ${ido.nombre}.` : `${ido.nombre} deja el gremio.`);
  if (estado.gremios[gremioId]?.esJugador) for (const t of textos) registrar(estado, 'social', t);
  return textos;
}

// ---------------------------------------------------------------------------
// Consultas para la interfaz
// ---------------------------------------------------------------------------

export interface VistaRelacion {
  heroe: Heroe;
  afinidad: number;
  nivel: Nivel;
  vinculo: Vinculo;
  /** Lo que siente él hacia el otro y el otro hacia él. */
  romanceDe: Romance;
  romanceHacia: Romance;
  rivales: boolean;
  /** Hay una petición aceptada de no compartir misión. */
  veto: boolean;
  historial: string[];
}

/** Relaciones relevantes de un héroe con sus compañeros de gremio (las neutrales sin historia no salen). */
export function relacionesDe(estado: EstadoJuego, gremioId: string, heroeId: string, todas = false): VistaRelacion[] {
  return heroesDe(estado, gremioId)
    .filter((m) => m.id !== heroeId && (todas || existeRelacion(estado, heroeId, m.id)))
    .map((m) => {
      const r = relacion(estado, heroeId, m.id);
      return {
        heroe: m,
        afinidad: r.afinidad,
        nivel: nivelDe(r.afinidad),
        vinculo: vinculo(estado, heroeId, m.id),
        romanceDe: romance(estado, heroeId, m.id),
        romanceHacia: romance(estado, m.id, heroeId),
        rivales: r.rivales,
        veto: hayVeto(estado, heroeId, m.id),
        historial: r.historial,
      };
    })
    .filter((v) => todas || v.nivel !== 'neutral' || v.rivales || v.romanceDe !== 'ninguno' || v.romanceHacia !== 'ninguno' || v.historial.length > 1 || v.veto)
    .sort((a, b) => b.afinidad - a.afinidad);
}

/** Hay una petición aceptada de que estos dos no compartan misión. */
export function hayVeto(estado: EstadoJuego, a: string, b: string): boolean {
  return estado.social.vetos.some((v) => (v.solicitante === a && v.otro === b) || (v.solicitante === b && v.otro === a));
}

/** Peticiones aceptadas que este equipo rompería. */
export function vetosDelEquipo(estado: EstadoJuego, equipo: readonly string[]): { solicitante: string; otro: string }[] {
  return estado.social.vetos.filter((v) => equipo.includes(v.solicitante) && equipo.includes(v.otro));
}

/** Romper una petición aceptada: el jugador puede hacerlo, pero el que la pidió lo lleva mal. */
export function romperVetos(estado: EstadoJuego, equipo: readonly string[]): string[] {
  const textos: string[] = [];
  for (const v of vetosDelEquipo(estado, equipo)) {
    const s = estado.heroes[v.solicitante];
    const o = estado.heroes[v.otro];
    if (!s || !o) continue;
    cambiarMental(s, S.mental.promesaRota);
    const t = `${s.nombre} no se puede creer que le mandes otra vez con ${o.nombre}.`;
    recordar(estado, 'promesaRota', [s.id, o.id], t);
    registrar(estado, 'social', t);
    textos.push(t);
  }
  return textos;
}
