// Habilidades únicas de los 80 héroes del catálogo (src/datos/heroes.json). Cifras provisionales en
// balance.json (habilidades). Cada habilidad engancha en uno o varios momentos del juego: el poder en misión,
// las lesiones, el oro, la experiencia, la semana, el mercado, la Prueba, la Ascensión o la muerte.
// Tokopi («...») anula las habilidades de su equipo en misión; Echo copia la del compañero más fuerte.

import balance from '../datos/balance.json';
import { Azar } from './azar';
import { diaDeTemporada, esFinDeTemporada, heroesDe, puesto, registrar, semanaDe, temporadaDe, type EstadoJuego } from './estado';
import { alLimite, indiceLetra, pisoDe, rango, valorPublico } from './heroes';
import { morir, gremioDe } from './muerte';
import { prestigio } from './ranking';
import { afinidad, amorDe, atraccion, cambiarAfinidad, cambiarMental, factorEstres, felicidad, inmuneARelaciones, quimica, vinculo } from './relaciones';
import S from '../datos/social.json';
import type { Gremio, Heroe, Letra, Mision } from './tipos';

const H = balance.habilidades;

export interface Contexto {
  estado: EstadoJuego;
  gremioId: string;
  mision: Mision;
  equipo: readonly Heroe[];
  /** Día de salida de la misión. */
  dia: number;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function num(h: Heroe, k: string, def = 0): number {
  const v = h.memoria?.[k];
  return typeof v === 'number' ? v : def;
}

function poner(h: Heroe, k: string, v: number | string | string[] | number[]): void {
  h.memoria = { ...(h.memoria ?? {}), [k]: v };
}

function subirPoder(h: Heroe, n: number): void {
  h.poder = Math.max(1, h.poder + n);
  h.potencial = Math.max(h.potencial, h.poder);
}

function tiene(estado: EstadoJuego, gremioId: string | null, habilidad: string): Heroe[] {
  if (!gremioId || !estado.gremios[gremioId]) return [];
  return heroesDe(estado, gremioId).filter((h) => h.habilidad === habilidad);
}

function usado(g: Gremio, habilidad: string, temporada: number): boolean {
  return g.usos?.[habilidad] === temporada;
}

function usar(g: Gremio, habilidad: string, temporada: number): void {
  g.usos = { ...(g.usos ?? {}), [habilidad]: temporada };
}

/** Datos de presentación de la habilidad de un héroe (nombre y texto), o null si no tiene. */
export { ficha } from './heroes';

// ---------------------------------------------------------------------------
// Misiones: quién puede ir y cuántos huecos ocupa
// ---------------------------------------------------------------------------

/** Habilidad que actúa en misión: Tokopi las anula todas y Echo copia la del compañero más fuerte. */
export function activa(h: Heroe, equipo: readonly Heroe[]): string | null {
  if (!h.habilidad) return null;
  if (equipo.some((x) => x.habilidad === 'silencio')) return null;
  if (h.habilidad === 'eco') {
    const otro = equipo.filter((x) => x.id !== h.id && x.habilidad && x.habilidad !== 'eco').sort((a, b) => b.poder - a.poder)[0];
    return otro?.habilidad ?? null;
  }
  return h.habilidad;
}

/** Huecos que ocupa en una misión: AllBlack tres, Pacto dos (el segundo es su bestia). */
export function huecos(h: Heroe): number {
  if (h.habilidad === 'multiplicacion') return H.multiplicacion.huecos;
  if (h.habilidad === 'invocacion') return H.invocacion.huecos;
  return 1;
}

export function huecosEquipo(equipo: readonly Heroe[]): number {
  return equipo.reduce((t, h) => t + huecos(h), 0);
}

/** Por qué este héroe no puede ir en este equipo, o null. */
export function motivoNoIr(estado: EstadoJuego, h: Heroe, equipo: readonly string[]): string | null {
  if (h.habilidad === 'mimo') return `${h.nombre} no sale a misiones: es la mascota del gremio`;
  const amorId = h.habilidad === 'obsesion' ? amorDe(estado, h.id) : null;
  if (amorId) {
    const amor = estado.heroes[amorId];
    const mismoGremio = amor && gremioDe(estado, amor.id) === gremioDe(estado, h.id);
    if (amor && mismoGremio && !equipo.includes(amor.id)) return `${h.nombre} solo sale de misión con ${amor.nombre}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Poder en misión
// ---------------------------------------------------------------------------

function poderBase(ctx: Contexto, h: Heroe, hab: string | null): number {
  if (hab === 'cajaSorpresa') return num(h, 'caja', h.poder);
  if (hab === 'cambiazo') {
    const fuera = heroesDe(ctx.estado, ctx.gremioId).filter((x) => x.id !== h.id && x.estado === 'libre' && !ctx.equipo.includes(x));
    return Math.max(h.poder, ...fuera.map((x) => x.poder));
  }
  return h.poder;
}

/** Multiplicador que da su propia habilidad. */
function factorPropio(ctx: Contexto, h: Heroe, hab: string | null): number {
  const { estado, gremioId, mision, equipo } = ctx;
  const g = estado.gremios[gremioId];
  const mates = g ? heroesDe(estado, gremioId).filter((x) => x.id !== h.id) : [];
  switch (hab) {
    case 'multiplicacion':
      return H.multiplicacion.factor;
    case 'goblinDraft':
      return mision.rango === 'bajo' ? H.goblinDraft.factor : 1;
    case 'cimaSolitaria': {
      const filas = estado.ranking;
      const mia = filas.find((f) => f.gremioId === gremioId);
      if (!mia || mia.puesto !== 1) return H.cimaSolitaria.segundo;
      const segundo = filas.find((f) => f.puesto === 2);
      const ventaja = segundo ? (mia.puntos - segundo.puntos) / Math.max(1, mia.puntos) : 0;
      return 1 + Math.min(H.cimaSolitaria.maximo, Math.max(0, ventaja));
    }
    case 'hiloRojo': {
      let n = 0;
      for (let i = 0; i < mates.length; i++)
        for (let j = i + 1; j < mates.length; j++) {
          const v = vinculo(estado, mates[i]!.id, mates[j]!.id);
          if (v === 'amigos' || v === 'grandes amigos' || v === 'pareja') n++;
        }
      return 1 + Math.min(H.hiloRojo.maximo, n * H.hiloRojo.porVinculo);
    }
    case 'porLasUltimas':
      return 1 + (H.porLasUltimas.vida - num(h, 'vida', H.porLasUltimas.vida)) * H.porLasUltimas.porMision;
    case 'furia':
      return 1 + Math.min(H.furia.maximo, seguidas(h, ctx.dia) * H.furia.porMision);
    case 'racha':
      return 1 + Math.min(H.racha.maximo, num(h, 'racha') * H.racha.porMision);
    case 'haters': {
      const n = mates.filter((m) => ['mala relación', 'enemigos'].includes(vinculo(estado, h.id, m.id))).length;
      return 1 + Math.min(H.haters.maximo, n * H.haters.porOdio);
    }
    case 'lookAtMe':
      return 1 + Math.min(H.lookAtMe.maximo, mates.filter((m) => atraccion(estado, m.id, h.id) >= S.umbrales.enamorado).length * H.lookAtMe.porAmor);
    case 'farolilloRojo': {
      const p = puesto(estado, gremioId);
      return p === 1 ? H.farolilloRojo.primero : 1 + (p - 1) * H.farolilloRojo.porPuesto;
    }
    case 'obsesion':
      return equipo.some((x) => x.id === amorDe(estado, h.id)) ? H.obsesion.factor : 1;
    case 'deudaDeHonor':
      return H.deudaDeHonor.maximo - H.deudaDeHonor.caida * Math.min(1, Math.max(0, g?.oro ?? 0) / H.deudaDeHonor.oroTope);
    case 'sinTestigos':
      return equipo.length === 1 ? H.sinTestigos.factor : 1;
    case 'dosVoces':
      return h.memoria?.voz === 'muneco' ? H.dosVoces.muneco : H.dosVoces.ventrilocuo;
    case 'banquillo': {
      const n = mates.filter((m) => m.estado === 'libre' && !equipo.includes(m)).length;
      return 1 + Math.min(H.banquillo.maximo, n * H.banquillo.porHeroe);
    }
    case 'pagaONada':
      return h.semanasSinCobrar === 0 ? H.pagaONada.factor : 1;
    case 'misionDeVida':
      return num(h, 'cumplida') ? 1 : H.misionDeVida.antes;
    case 'maraton':
      return mision.duracion >= 3 ? H.maraton.largo : mision.duracion === 1 ? H.maraton.corto : 1;
    case 'primerGolpe':
      return h.ultimoRegreso === undefined || ctx.dia - h.ultimoRegreso >= 2 ? H.primerGolpe.factor : 1;
    case 'cierreTemporada':
      return diaDeTemporada(ctx.dia) === balance.calendario.diasPorTemporada ? H.cierreTemporada.ultimoDia : H.cierreTemporada.normal;
    case 'casaLlena':
      return 1 + (g?.plantilla.length ?? 0) * H.casaLlena.porPlaza;
    case 'sombraDeGigantes':
      return g ? 1 + Math.min(H.sombraDeGigantes.maximo, prestigio(g) * H.sombraDeGigantes.porPrestigio) : 1;
    case 'vendetta':
      return 1 + num(h, 'vendetta') * H.vendetta.porDia;
    case 'mejorAmigo':
      return equipo.some((x) => x.id === h.memoria?.dueno) ? H.mejorAmigo.factor : 1;
    case 'rivalidad': {
      const objetivo = h.memoria?.objetivo;
      if (typeof objetivo === 'string' && mates.some((m) => m.id === objetivo)) return H.rivalidad.apagado;
      return 1 + Math.min(H.rivalidad.cargas, num(h, 'cargas')) * H.rivalidad.porCarga;
    }
    case 'sacrificio': {
      const S = H.sacrificio;
      return 1 + mates.filter((m) => m.zombie).length * S.porZombie + equipo.filter((m) => m.zombie).length * S.porZombieEnEquipo;
    }
    case 'banquete':
      return H.banquete.factor;
    default:
      return 1;
  }
}

/** Misiones seguidas sin un día de descanso, contando la que va a empezar (Hartox). */
function seguidas(h: Heroe, dia: number): number {
  return h.ultimoRegreso !== undefined && dia - h.ultimoRegreso <= 1 ? num(h, 'seguidas') + 1 : 0;
}

/** Lo que le dan sus compañeros: Chispa, Bolita, Yandere y la poción de Retorta. */
function factorCompaneros(ctx: Contexto, h: Heroe): number {
  let f = 1;
  const flojo = [...ctx.equipo].sort((a, b) => a.poder - b.poder);
  for (const x of ctx.equipo) {
    if (x.id === h.id) continue;
    const hab = activa(x, ctx.equipo);
    if (hab === 'contagio') f *= H.contagio.factor;
    if (hab === 'mejorAmigo' && x.memoria?.dueno === h.id) f *= H.mejorAmigo.factor;
    if (hab === 'obsesion' && amorDe(ctx.estado, x.id) === h.id) f *= H.obsesion.factor;
    if (hab === 'pocionRara' && flojo.find((y) => y.id !== x.id)?.id === h.id) f *= num(x, 'pocion', 1) > 0 ? H.pocionRara.buena : H.pocionRara.mala;
  }
  return f;
}

/** Poder de la bestia de Pacto que sale en esta misión. */
export function poderBestia(h: Heroe): number {
  const poderes = (h.memoria?.bestias as number[] | undefined) ?? [Math.round(h.poder * H.invocacion.poderBestia)];
  return poderes[num(h, 'bestia')] ?? poderes[0] ?? 0;
}

/** Poder de un héroe en esta misión: clase, habilidad, compañeros, ánimo y química. */
export function poderHeroeEnMision(ctx: Contexto, h: Heroe, quim = quimica(ctx.estado, ctx.equipo)): number {
  const hab = activa(h, ctx.equipo);
  const base = poderBase(ctx, h, hab);
  const mago = h.clase === 'Mago' && ctx.mision.rango === 'alto' ? balance.clases.poderMagoEnAlto : 1;
  const nevada = h.habilidad === 'imperturbable';
  const social = nevada ? 1 : factorCompaneros(ctx, h) * factorEstres(h) * (inmuneARelaciones(h) ? 1 : 1 + quim / 100);
  const bestia = hab === 'invocacion' ? poderBestia(h) : 0;
  return base * mago * factorPropio(ctx, h, hab) * social + bestia;
}

export function poderEquipoEnMision(ctx: Contexto): number {
  const q = quimica(ctx.estado, ctx.equipo);
  return Math.round(ctx.equipo.reduce((t, h) => t + poderHeroeEnMision(ctx, h, q), 0));
}

/** Puntos de éxito extra: Trébol suma y deja karma para la siguiente misión del gremio. */
export function bonusExito(ctx: Contexto): number {
  const trebol = ctx.equipo.some((h) => activa(h, ctx.equipo) === 'karma') ? H.karma.bonus : 0;
  return trebol - (ctx.estado.gremios[ctx.gremioId]?.karma ?? 0);
}

// ---------------------------------------------------------------------------
// Lesiones, duración y oro
// ---------------------------------------------------------------------------

/** Lesión fijada por una habilidad: «nunca» (Blup, Vampire), «grave» (los que van con Vampire), «segura» (con Alaim). */
export function lesionForzada(equipo: readonly Heroe[], h: Heroe): 'nunca' | 'grave' | 'segura' | null {
  if (h.habilidad === 'gelatina') return 'nunca';
  if (activa(h, equipo) === 'roboDePoder') return 'nunca';
  const otros = equipo.filter((x) => x.id !== h.id).map((x) => activa(x, equipo));
  if (otros.includes('roboDePoder')) return 'grave';
  if (otros.includes('godsHateMe')) return 'segura';
  return null;
}

/** Multiplicador de la probabilidad de lesión por los compañeros: Bastión y el ventrílocuo protegen. */
export function factorLesion(equipo: readonly Heroe[], h: Heroe): number {
  let f = 1;
  for (const x of equipo) {
    if (x.id === h.id) continue;
    const hab = activa(x, equipo);
    if (hab === 'muro') f *= H.muro.lesion;
    if (hab === 'dosVoces' && x.memoria?.voz !== 'muneco') f *= H.dosVoces.lesionEquipo;
  }
  return f;
}

/** Días menos por habilidades (Brújula). */
export function diasMenos(equipo: readonly Heroe[]): number {
  return equipo.some((h) => activa(h, equipo) === 'atajo') ? H.atajo.dias : 0;
}

/** Ajusta el oro de una misión: Rastro, Dado, Garra y Pirita. Devuelve el oro final y lo que ha pasado. */
export function ajustarOro(ctx: Contexto, azar: Azar, oro: number, exito: boolean): { oro: number; textos: string[] } {
  const textos: string[] = [];
  const g = ctx.estado.gremios[ctx.gremioId];
  const habs = ctx.equipo.map((h) => [h, activa(h, ctx.equipo)] as const);
  let total = oro;
  if (exito && ctx.mision.rango === 'alto' && habs.some(([, a]) => a === 'presaGrande')) total = Math.round(total * H.presaGrande.factor);
  for (const [h, a] of habs) {
    if (a === 'dobleONada' && exito) {
      const gana = azar.probabilidad(H.dobleONada.probabilidad);
      total = gana ? total * 2 : 0;
      textos.push(gana ? `${h.nombre} lo apuesta todo y dobla la recompensa.` : `${h.nombre} lo apuesta todo… y lo pierde.`);
    }
    if (a === 'botin') {
      if (exito && azar.probabilidad(H.botin.probabilidad)) {
        total = Math.round(total * (1 + H.botin.extra));
        textos.push(`${h.nombre} vuelve con los bolsillos llenos.`);
      } else if (!exito && g) {
        g.oro -= H.botin.perdida;
        textos.push(`${h.nombre} se lleva ${H.botin.perdida} de oro de la caja para cubrir la huida.`);
      }
    }
  }
  for (const [h, a] of habs) {
    if (a === 'tesoro' && total > 0) {
      const parte = Math.round(total * H.tesoro.fraccion);
      total -= parte;
      poner(h, 'tesoro', num(h, 'tesoro') + parte);
    }
  }
  return { oro: total, textos };
}

/** Multiplicador de la experiencia: Luciérnaga, Minshi y Roble. */
export function factorExperiencia(equipo: readonly Heroe[], h: Heroe): number {
  let f = 1;
  const hab = activa(h, equipo);
  if (hab === 'brilloFugaz') f *= H.brilloFugaz.experiencia;
  if (h.habilidad === 'todoJunto') f *= h.memoria?.fase === 'sube' ? 2 : 0;
  const legado = equipo.some((x) => x.id !== h.id && activa(x, equipo) === 'legado');
  if (legado && indiceLetra(rango(h)) <= indiceLetra(H.legado.rangoMaximo as Letra)) f *= H.legado.experiencia;
  return f;
}

// ---------------------------------------------------------------------------
// Al salir y al volver de una misión
// ---------------------------------------------------------------------------

/** Lo que pasa al salir: Hartox se calienta, Ñam come, Trébol deja karma, Pacto invoca, Yandere se pone celosa. */
export function alSalir(ctx: Contexto, azar: Azar): string[] {
  const { estado, gremioId, equipo } = ctx;
  const g = estado.gremios[gremioId];
  const textos: string[] = [];
  if (g) g.karma = 0;
  for (const h of equipo) {
    const hab = activa(h, equipo);
    if (h.habilidad === 'furia') {
      poner(h, 'seguidas', seguidas(h, ctx.dia));
      cambiarMental(h, { estres: H.furia.estres });
      h.lealtad = Math.max(0, h.lealtad + H.furia.lealtad);
    }
    if (hab === 'banquete' && g) {
      const oro = Math.min(Math.max(0, g.oro), azar.entero(H.banquete.oro[0] ?? 100, H.banquete.oro[1] ?? 400));
      g.oro -= oro;
      textos.push(`${h.nombre} se come ${oro} de oro en provisiones antes de salir.`);
    }
    if (hab === 'karma' && g) g.karma = H.karma.penalizacion;
    if (h.habilidad === 'invocacion') {
      const bestias = (h.memoria?.bestias as number[] | undefined) ?? [Math.round(h.poder * H.invocacion.poderBestia)];
      poner(h, 'bestias', bestias);
      poner(h, 'bestia', azar.entero(0, bestias.length - 1));
    }
  }
  // Yandere: si su amor sale sin ella, se pone celosa y la paga con los demás.
  for (const y of tiene(estado, gremioId, 'obsesion')) {
    const amor = amorDe(estado, y.id);
    if (!amor || equipo.includes(y) || !equipo.some((x) => x.id === amor)) continue;
    cambiarMental(y, { felicidad: H.obsesion.felicidad, estres: H.obsesion.estres });
    if (azar.probabilidad(H.obsesion.probLesion)) {
      const victimas = heroesDe(estado, gremioId).filter((x) => x.estado === 'libre' && x.id !== y.id && x.id !== amor && x.habilidad !== 'gelatina' && x.habilidad !== 'imperturbable');
      const v = victimas.length > 0 ? azar.elegir(victimas) : null;
      if (v) {
        v.estado = 'lesionado';
        v.diasLesion = H.obsesion.diasLesion;
        textos.push(`${y.nombre}, celosa, deja malherido a ${v.nombre}.`);
      }
    }
  }
  if (g?.esJugador) for (const t of textos) registrar(estado, 'habilidad', t);
  return textos;
}

/**
 * Lo que pasa al volver: rachas, vidas, cargas, crecimiento permanente y el muñeco de Ventri.
 * Devuelve textos para el informe.
 */
export function alVolver(ctx: Contexto, azar: Azar, exito: boolean, lesionados: readonly string[]): string[] {
  const { estado, equipo } = ctx;
  const textos: string[] = [];
  const sinLesiones = lesionados.length === 0;
  for (const h of equipo) {
    if (!estado.heroes[h.id]) continue;
    const hab = activa(h, equipo);
    switch (h.habilidad) {
      case 'racha': {
        const R = H.racha;
        const nueva = exito && sinLesiones ? num(h, 'racha') + 1 : num(h, 'ascendido') ? Math.floor(num(h, 'racha') / 2) : 0;
        poner(h, 'racha', nueva);
        if (nueva >= R.ascension && !num(h, 'ascendido')) {
          poner(h, 'ascendido', 1);
          h.potencial = 100;
          h.techoConocido = true;
          textos.push(`¡${h.nombre} bate el récord: ${nueva} misiones perfectas seguidas! Su techo pasa a S.`);
        }
        break;
      }
      case 'vendetta':
        poner(h, 'vendetta', 0);
        break;
      case 'dosVoces':
        if (h.memoria?.voz === 'muneco') {
          const otros = equipo.filter((x) => x.id !== h.id && x.habilidad !== 'gelatina');
          if (otros.length > 0 && azar.probabilidad(H.dosVoces.probLesionMuneco)) {
            const v = azar.elegir(otros);
            v.estado = 'lesionado';
            v.diasLesion = Math.max(v.diasLesion, 2);
            textos.push(`El muñeco de ${h.nombre} se descontrola y lesiona a ${v.nombre}.`);
          }
        }
        poner(h, 'voz', h.memoria?.voz === 'muneco' ? 'ventrilocuo' : 'muneco');
        break;
      case 'hieloQueSeDerrite':
        for (const x of equipo) {
          if (x.id === h.id) continue;
          const k = `con:${x.id}`;
          const n = num(h, k) + 1;
          poner(h, k, n);
          const R = H.hieloQueSeDerrite;
          if (n % R.cada === 0 && num(h, 'ganado') < R.tope) {
            subirPoder(h, R.poder);
            poner(h, 'ganado', num(h, 'ganado') + R.poder);
            textos.push(`El hielo de ${h.nombre} se derrite un poco junto a ${x.nombre}: +${R.poder} de poder.`);
          }
        }
        break;
      case 'misionDeVida':
        if (exito && !num(h, 'cumplida')) {
          poner(h, 'misiones', num(h, 'misiones') + 1);
          if (num(h, 'misiones') >= H.misionDeVida.misiones) {
            poner(h, 'cumplida', 1);
            subirPoder(h, H.misionDeVida.poder);
            h.lealtad = Math.min(h.lealtad, H.misionDeVida.lealtad);
            textos.push(`${h.nombre} cumple su misión de vida: +${H.misionDeVida.poder} de poder… y ya no le debe nada a nadie.`);
          }
        }
        break;
      case 'aprendeDerrotas':
        if (!exito) {
          subirPoder(h, H.aprendeDerrotas.poder);
          textos.push(`${h.nombre} aprende de la derrota: +${H.aprendeDerrotas.poder} de poder.`);
        }
        break;
      case 'estudioso': {
        const tipos = (h.memoria?.tipos as string[] | undefined) ?? [];
        if (exito && !tipos.includes(ctx.mision.tipo)) {
          poner(h, 'tipos', [...tipos, ctx.mision.tipo]);
          subirPoder(h, H.estudioso.poder);
          textos.push(`${h.nombre} estudia un tipo de misión nuevo (${ctx.mision.tipo}): +${H.estudioso.poder} de poder.`);
        }
        break;
      }
      case 'todoJunto':
        if (h.memoria?.fase !== 'sube') {
          h.poder = Math.max(H.todoJunto.minimo, h.poder - H.todoJunto.perdida);
          h.experiencia = 0;
          if (h.poder <= H.todoJunto.minimo) poner(h, 'fase', 'sube');
        } else if (alLimite(h)) {
          poner(h, 'fase', 'baja');
        }
        break;
      case 'fama':
        if (exito) poner(h, 'misiones', num(h, 'misiones') + 1);
        break;
      case 'roboFichaje':
        if (exito && ctx.mision.rango === 'alto' && !num(h, 'cargado')) {
          poner(h, 'cargas', num(h, 'cargas') + 1);
          if (num(h, 'cargas') >= H.roboFichaje.cargas) {
            poner(h, 'cargado', 1);
            textos.push(`${h.nombre} tiene listo su Robo de fichaje: las heroínas de rango inferior a A de otros gremios te salen mucho más baratas.`);
          }
        }
        break;
    }
    if (hab === 'roboDePoder') {
      const n = equipo.filter((x) => x.id !== h.id && lesionados.includes(x.id)).length;
      if (n > 0) subirPoder(h, n * H.roboDePoder.poder);
    }
  }
  // Némesis: gana cargas cuando su objetivo completa una misión, sea del gremio que sea.
  if (exito) {
    for (const n of Object.values(estado.heroes)) {
      if (n.habilidad === 'rivalidad' && equipo.some((x) => x.id === n.memoria?.objetivo)) poner(n, 'cargas', Math.min(H.rivalidad.cargas, num(n, 'cargas') + 1));
    }
  }
  // Pacto puede desbloquear una bestia nueva, y la bestia crece con él.
  for (const p of equipo.filter((x) => x.habilidad === 'invocacion' && estado.heroes[x.id])) {
    const I = H.invocacion;
    const bestias = [...((p.memoria?.bestias as number[] | undefined) ?? [Math.round(p.poder * I.poderBestia)])];
    const i = num(p, 'bestia');
    bestias[i] = Math.min(p.potencial, (bestias[i] ?? 0) + (exito ? 1 : 0));
    if (bestias.length < I.bestias.length && azar.probabilidad(I.probNueva)) {
      bestias.push(Math.round(p.poder * I.poderBestia));
      textos.push(`${p.nombre} sella un pacto con una bestia nueva: ${I.bestias[bestias.length - 1]}.`);
    }
    poner(p, 'bestias', bestias);
  }
  // Chimoku: cada misión le quita vida. Al llegar a 0, muere.
  for (const h of equipo.filter((x) => x.habilidad === 'porLasUltimas' && estado.heroes[x.id])) {
    const vida = num(h, 'vida', H.porLasUltimas.vida) - 1;
    poner(h, 'vida', vida);
    if (vida <= 0) textos.push(...morir(estado, h.id, 'vida').textos);
  }
  if (estado.gremios[ctx.gremioId]?.esJugador) for (const t of textos) registrar(estado, 'habilidad', t);
  return textos;
}

// ---------------------------------------------------------------------------
// Cada día y cada semana
// ---------------------------------------------------------------------------

/** Al empezar el día: la caja sorpresa de Gabardina y la poción de Retorta. Lirio cura más deprisa. */
export function cadaDia(estado: EstadoJuego, azar: Azar): void {
  for (const h of Object.values(estado.heroes)) {
    if (h.habilidad === 'cajaSorpresa') poner(h, 'caja', azar.entero(H.cajaSorpresa.minimo, H.cajaSorpresa.maximo));
    if (h.habilidad === 'pocionRara') poner(h, 'pocion', azar.probabilidad(50) ? 1 : -1);
  }
  for (const g of Object.values(estado.gremios)) {
    for (const lirio of tiene(estado, g.id, 'cuidados')) {
      for (const h of heroesDe(estado, g.id)) {
        if (h.estado !== 'lesionado' || h.id === lirio.id) continue;
        h.diasLesion = Math.max(0, h.diasLesion - H.cuidados.diasExtra);
        cambiarAfinidad(estado, h.id, lirio.id, H.cuidados.afinidad);
        if (h.diasLesion === 0) h.estado = 'libre';
      }
    }
  }
}

export interface ResultadoSemanaHabilidades {
  textos: string[];
  /** Héroes que se van por su habilidad (Dep), con el motivo. */
  seVan: { heroeId: string; motivo: string }[];
}

/** El día 7, tras los sueldos: sacrificios, sesiones, sabotajes, obras, prestigio de la mascota… */
export function cadaSemana(estado: EstadoJuego, azar: Azar): ResultadoSemanaHabilidades {
  const textos: string[] = [];
  const seVan: ResultadoSemanaHabilidades['seVan'] = [];
  const temporada = temporadaDe(estado.dia);
  const decir = (g: Gremio, t: string): void => {
    registrar(estado, g.esJugador ? 'habilidad' : 'rival', t);
    if (g.esJugador) textos.push(t);
  };
  for (const g of Object.values(estado.gremios)) {
    const heroes = heroesDe(estado, g.id);
    g.factorObras = heroes.some((h) => h.habilidad === 'chapuza') ? Math.round((H.chapuza.minimo + azar.siguiente() * (H.chapuza.maximo - H.chapuza.minimo)) * 100) / 100 : undefined;
    for (const h of heroes) {
      switch (h.habilidad) {
        case 'mimo':
          g.prestigioExtra = (g.prestigioExtra ?? 0) + H.mimo.prestigio;
          break;
        case 'brilloFugaz':
          if (alLimite(h)) {
            h.poder = Math.max(1, h.poder - H.brilloFugaz.perdida);
            h.potencial = h.poder;
            decir(g, `El brillo de ${h.nombre} se apaga un poco: −${H.brilloFugaz.perdida} de poder.`);
          }
          break;
        case 'mejorAmigo':
          if (!heroes.some((m) => m.id === h.memoria?.dueno && m.id !== h.id)) {
            const opciones = heroes.filter((m) => m.id !== h.id);
            if (opciones.length > 0) {
              const d = azar.elegir(opciones);
              poner(h, 'dueno', d.id);
              decir(g, `${h.nombre} ha elegido a ${d.nombre} como su dueño.`);
            }
          }
          break;
        case 'rivalidad': {
          const obj = typeof h.memoria?.objetivo === 'string' ? estado.heroes[h.memoria.objetivo] : undefined;
          if (!obj) {
            const otros = Object.values(estado.gremios).filter((o) => o.id !== g.id).flatMap((o) => heroesDe(estado, o.id));
            const mejor = otros.sort((a, b) => b.poder - a.poder)[0];
            if (mejor) poner(h, 'objetivo', mejor.id);
          }
          break;
        }
        case 'dopamina':
          if ((g.movimientosSemana ?? 0) === 0) seVan.push({ heroeId: h.id, motivo: `${h.nombre} se aburre: una semana sin fichajes ni ventas.` });
          break;
        case 'dobleJuego':
          if (g.esJugador) {
            const rival = Object.values(estado.gremios).find((o) => o.id === h.memoria?.origen) ?? azar.elegir(Object.values(estado.gremios).filter((o) => !o.esJugador));
            if (rival) decir(g, `${h.nombre} te cuenta que ${rival.nombre} tiene ${rival.oro.toLocaleString('es-ES')} de oro y busca ${rival.clase?.toLowerCase() ?? 'héroes'}s.`);
          }
          if (esFinDeTemporada(estado.dia) && h.lealtad < H.dobleJuego.lealtadMinima && typeof h.memoria?.origen === 'string') {
            seVan.push({ heroeId: h.id, motivo: `${h.nombre} vuelve con su antiguo gremio.` });
          }
          break;
      }
    }
    // Segador: sacrifica a quien peor le cae.
    for (const s of tiene(estado, g.id, 'sacrificio')) {
      if (!estado.heroes[s.id]) continue;
      const victimas = heroesDe(estado, g.id).filter((m) => m.id !== s.id && !m.zombie);
      if (victimas.length === 0) continue;
      const peor = Math.min(...victimas.map((m) => afinidad(estado, s.id, m.id)));
      // Interpretación provisional: solo sacrifica a quien de verdad le cae mal (mala relación o peor).
      if (peor > H.sacrificio.umbralAfinidad) continue;
      const v = azar.elegir(victimas.filter((m) => afinidad(estado, s.id, m.id) === peor));
      const r = morir(estado, v.id, 'segador');
      if (g.esJugador) textos.push(...r.textos);
    }
    // Diván: arregla la peor relación o anima al más hundido.
    for (const d of tiene(estado, g.id, 'sesion')) {
      const hs = heroesDe(estado, g.id);
      let peor: [string, string, number] | null = null;
      for (let i = 0; i < hs.length; i++)
        for (let j = i + 1; j < hs.length; j++) {
          const af = afinidad(estado, hs[i]!.id, hs[j]!.id);
          if (af <= S.umbrales.malaRelacion && (!peor || af < peor[2])) peor = [hs[i]!.id, hs[j]!.id, af];
        }
      const hundido = hs.filter((h) => h.id !== d.id).sort((a, b) => felicidad(a) - felicidad(b))[0];
      if (peor) {
        cambiarAfinidad(estado, peor[0], peor[1], -peor[2]);
        decir(g, `${d.nombre} media entre ${estado.heroes[peor[0]]?.nombre} y ${estado.heroes[peor[1]]?.nombre}: hacen las paces.`);
      } else if (hundido && felicidad(hundido) < H.sesion.umbral) {
        hundido.felicidad = H.sesion.felicidad;
        decir(g, `${d.nombre} tiene una sesión con ${hundido.nombre}, que recupera el ánimo.`);
      } else continue;
      cambiarMental(d, { estres: H.sesion.estres });
    }
    // Zancadilla: sabotea al gremio que va justo por delante.
    for (const z of tiene(estado, g.id, 'malaJugada')) {
      const p = puesto(estado, g.id);
      const victima = estado.ranking.find((f) => f.puesto === p - 1);
      const v = victima ? estado.gremios[victima.gremioId] : undefined;
      if (!v) continue;
      if (g.alianza?.gremioId === v.id && g.alianza.temporada === temporada) continue;
      if (tiene(estado, v.id, 'guardia').length > 0 && !usado(v, 'guardia', temporada)) {
        usar(v, 'guardia', temporada);
        decir(g, `La Guardia de ${v.nombre} frustra la Mala jugada de ${z.nombre}.`);
        if (v.esJugador) registrar(estado, 'habilidad', `Tu Guardia frustra un sabotaje de ${g.nombre}.`);
        continue;
      }
      v.prestigioExtra = (v.prestigioExtra ?? 0) - H.malaJugada.prestigio;
      if (azar.probabilidad(H.malaJugada.probPillada)) {
        g.prestigioExtra = (g.prestigioExtra ?? 0) - H.malaJugada.castigo;
        decir(g, `${z.nombre} sabotea a ${v.nombre}, pero la pillan: ${g.nombre} pierde ${H.malaJugada.castigo} de prestigio.`);
      } else {
        decir(g, `${z.nombre} sabotea a ${v.nombre}: pierde ${H.malaJugada.prestigio} de prestigio.`);
      }
      if (v.esJugador) registrar(estado, 'habilidad', `${g.nombre} te sabotea: pierdes ${H.malaJugada.prestigio} de prestigio.`);
    }
    // Su Alteza: un tratado por temporada (la primera semana).
    for (const a of tiene(estado, g.id, 'tratado')) {
      if (semanaDe(estado.dia) !== 1 || usado(g, 'tratado', temporada)) continue;
      const otros = Object.values(estado.gremios).filter((o) => o.id !== g.id);
      if (otros.length === 0) continue;
      const aliado = azar.elegir(otros);
      usar(g, 'tratado', temporada);
      g.alianza = { gremioId: aliado.id, temporada };
      aliado.alianza = { gremioId: g.id, temporada };
      const k = `tratado:${aliado.id}`;
      poner(a, k, num(a, k) + 1);
      decir(g, `${a.nombre} firma un tratado con ${aliado.nombre} para esta temporada.`);
      if (num(a, k) >= H.tratado.ascension && a.potencial < 100) {
        a.potencial = 100;
        a.techoConocido = true;
        decir(g, `Tres tratados con ${aliado.nombre}: el reino de ${a.nombre} renace. Su techo pasa a S.`);
      }
    }
    g.movimientosSemana = 0;
  }
  return { textos, seVan };
}

// ---------------------------------------------------------------------------
// Mercado, Prueba, sueldos, instalaciones y Ascensión
// ---------------------------------------------------------------------------

/** Por qué no se puede comprar a este héroe por su habilidad, o null. */
export function bloqueoCompra(h: Heroe): string | null {
  if (h.habilidad === 'juramento') return `${h.nombre} ha jurado lealtad: jamás cambia de gremio`;
  return null;
}

/** Multiplicador del precio de compra: Entrman, Letra, Don Hueso y los tratados de Su Alteza. */
export function factorCompra(estado: EstadoJuego, h: Heroe, compradorId: string): number {
  const vendedorId = gremioDe(estado, h.id);
  let f = 1;
  const robo = tiene(estado, compradorId, 'roboFichaje').some((e) => num(e, 'cargado'));
  if (robo && h.genero === 'Mujer' && indiceLetra(rango(h)) < indiceLetra(H.roboFichaje.rangoMaximo as Letra)) f *= H.roboFichaje.factor;
  if (tiene(estado, vendedorId, 'letraPequena').length > 0) f *= H.letraPequena.compras;
  if (tiene(estado, compradorId, 'auditoria').length > 0) f *= H.auditoria.compras;
  const c = estado.gremios[compradorId];
  if (c?.alianza && c.alianza.gremioId === vendedorId && c.alianza.temporada === temporadaDe(estado.dia)) f *= H.tratado.compras;
  return f;
}

/** Valor público para venderlo: Mimi se revaloriza y Disfraz aparenta un rango más. */
export function valorVenta(h: Heroe): number {
  if (h.habilidad === 'falsoRango') return valorPublico({ ...h, poder: h.poder + H.falsoRango.poder, potencial: Math.max(h.potencial, h.poder + H.falsoRango.poder) });
  const fama = h.habilidad === 'fama' ? 1 + num(h, 'misiones') * H.fama.porMision : 1;
  return Math.round(valorPublico(h) * fama);
}

/** Tras comprar un héroe a otro gremio: Tiburón devora, Entrman gasta su carga, Dep se entretiene. */
export function alComprar(estado: EstadoJuego, h: Heroe, compradorId: string, vendedorId: string): string[] {
  const textos: string[] = [];
  const c = estado.gremios[compradorId];
  const v = estado.gremios[vendedorId];
  if (c) c.movimientosSemana = (c.movimientosSemana ?? 0) + 1;
  if (v) v.movimientosSemana = (v.movimientosSemana ?? 0) + 1;
  for (const t of tiene(estado, compradorId, 'devorar')) {
    const extra = Math.max(1, Math.round(h.poder * H.devorar.fraccion));
    subirPoder(t, extra);
    const k = `devorados:${vendedorId}`;
    poner(t, k, num(t, k) + 1);
    textos.push(`${t.nombre} devora parte del poder de ${h.nombre}: +${extra}.`);
    if (num(t, k) >= H.devorar.ascension && t.potencial < 100) {
      t.potencial = 100;
      t.techoConocido = true;
      textos.push(`${t.nombre} ha devorado a tres de ${v?.nombre ?? 'un rival'}: su techo pasa a S.`);
    }
  }
  if (h.genero === 'Mujer') for (const e of tiene(estado, compradorId, 'roboFichaje')) if (num(e, 'cargado')) poner(e, 'cargado', 0), poner(e, 'cargas', 0);
  if (c?.esJugador) for (const t of textos) registrar(estado, 'habilidad', t);
  return textos;
}

/** Tras vender: Pirita devuelve su tesoro, vender a Aldo o a la Mascota duele, a Disfraz lo pueden pillar. */
export function alVender(estado: EstadoJuego, azar: Azar, h: Heroe, vendedorId: string): string[] {
  const textos: string[] = [];
  const g = estado.gremios[vendedorId];
  if (!g) return textos;
  g.movimientosSemana = (g.movimientosSemana ?? 0) + 1;
  if (h.habilidad === 'tesoro' && num(h, 'tesoro') > 0) {
    g.oro += num(h, 'tesoro');
    textos.push(`${h.nombre} te devuelve su tesoro: ${num(h, 'tesoro')} de oro.`);
    poner(h, 'tesoro', 0);
  }
  if (h.habilidad === 'juramento' || h.habilidad === 'mimo') {
    const golpe = h.habilidad === 'juramento' ? H.juramento.felicidad : H.mimo.felicidad;
    for (const m of heroesDe(estado, vendedorId)) {
      if (m.id === h.id) continue;
      cambiarMental(m, { felicidad: golpe });
      if (h.habilidad === 'juramento') m.lealtad = Math.max(0, m.lealtad + H.juramento.lealtad);
    }
    textos.push(h.habilidad === 'juramento' ? `Vender a ${h.nombre} rompe un juramento: todo el gremio lo nota.` : `El gremio echa de menos a ${h.nombre}.`);
  }
  if (h.habilidad === 'falsoRango' && azar.probabilidad(H.falsoRango.probPillado)) {
    g.prestigioExtra = (g.prestigioExtra ?? 0) - H.falsoRango.prestigio;
    textos.push(`Descubren el disfraz de ${h.nombre}: pierdes ${H.falsoRango.prestigio} de prestigio.`);
  }
  if (g.esJugador) for (const t of textos) registrar(estado, 'habilidad', t);
  return textos;
}

/** Sueldo semanal de un héroe en su gremio: Don Hueso lo baja, Letra lo sube y Posadero cobra por plaza. */
export function ajustarSueldo(estado: EstadoJuego, gremioId: string, h: Heroe, base: number): number {
  let s = base;
  if (tiene(estado, gremioId, 'auditoria').length > 0) s *= H.auditoria.sueldos;
  if (tiene(estado, gremioId, 'letraPequena').length > 0) s *= H.letraPequena.sueldos;
  if (h.habilidad === 'casaLlena') s += (estado.gremios[gremioId]?.plantilla.length ?? 0) * H.casaLlena.sueldoPorPlaza;
  return Math.round(s / 10) * 10;
}

/** Yunque: cada gasto de oro del gremio da un punto de poder a un héroe al azar. */
export function alGastar(estado: EstadoJuego, gremioId: string): void {
  const forjas = tiene(estado, gremioId, 'forja');
  if (forjas.length === 0) return;
  const azar = new Azar(estado.azar);
  for (const y of forjas) {
    const opciones = heroesDe(estado, gremioId).filter((h) => !alLimite(h));
    if (opciones.length === 0) continue;
    const h = azar.elegir(opciones);
    h.poder = Math.min(h.potencial, h.poder + H.forja.poder);
    if (estado.gremios[gremioId]?.esJugador) registrar(estado, 'habilidad', `${y.nombre} forja algo para ${h.nombre}: +${H.forja.poder} de poder.`);
  }
  estado.azar = azar.obtenerEstado();
}

/** Al fichar un novato: Profe lo sube un rango; Topo recuerda a qué gremio sirve en secreto. */
export function alFicharNovato(estado: EstadoJuego, azar: Azar, h: Heroe, gremioId: string): void {
  if (tiene(estado, gremioId, 'cantera').some((p) => p.id !== h.id)) h.poder = Math.min(h.potencial, h.poder + H.cantera.poder);
  if (h.habilidad === 'dobleJuego') {
    const otros = Object.values(estado.gremios).filter((g) => g.id !== gremioId && !g.esJugador);
    if (otros.length > 0) poner(h, 'origen', azar.elegir(otros).id);
  }
  const g = estado.gremios[gremioId];
  if (g) g.movimientosSemana = (g.movimientosSemana ?? 0) + 1;
}

/**
 * Martillo: una vez por temporada se queda con un novato de techo A o más que ha ganado otro gremio,
 * pagando el doble. La Guardia de Vigilia lo impide. Devuelve el gremio que se lo lleva, o null.
 */
export function martillazo(estado: EstadoJuego, h: Heroe, ganadorId: string, precio: number): { gremioId: string; precio: number; texto: string } | null {
  if (h.potencial < pisoDe(H.subastador.techoMinimo as Letra)) return null;
  const temporada = temporadaDe(estado.dia);
  for (const g of Object.values(estado.gremios)) {
    if (g.id === ganadorId || usado(g, 'subastador', temporada)) continue;
    const martillo = tiene(estado, g.id, 'subastador')[0];
    if (!martillo) continue;
    const pagar = precio * H.subastador.factor;
    const plazas = balance.instalaciones.sede.plazas[g.nivelSede - 1] ?? 5;
    if (g.oro < pagar || g.plantilla.length >= plazas) continue;
    usar(g, 'subastador', temporada);
    const victima = estado.gremios[ganadorId];
    if (victima && tiene(estado, ganadorId, 'guardia').length > 0 && !usado(victima, 'guardia', temporada)) {
      usar(victima, 'guardia', temporada);
      return null;
    }
    return { gremioId: g.id, precio: pagar, texto: `¡${martillo.nombre} da un martillazo: anula la puja y ${g.nombre} se queda con ${h.nombre} por ${pagar} de oro!` };
  }
  return null;
}

/** Puntos de probabilidad extra en la Ascensión (Crisálida). */
export function bonusAscension(estado: EstadoJuego, gremioId: string, heroeId: string): number {
  return tiene(estado, gremioId, 'muda').some((c) => c.id !== heroeId) ? H.muda.probabilidad : 0;
}

/** Tras una Ascensión con Crisálida en el gremio: le cuesta poder. */
export function trasAscension(estado: EstadoJuego, gremioId: string, heroeId: string): void {
  for (const c of tiene(estado, gremioId, 'muda')) {
    if (c.id === heroeId) continue;
    c.poder = Math.max(1, c.poder - H.muda.coste);
    c.potencial = Math.max(c.poder, c.potencial - H.muda.coste);
    if (estado.gremios[gremioId]?.esJugador) registrar(estado, 'habilidad', `${c.nombre} se deja parte de sí en la Muda: −${H.muda.coste} de poder.`);
  }
}

/** Multiplicador de la experiencia en la zona de entrenamiento (Sparring). Le baja el ánimo a él. */
export function factorEntrenamiento(estado: EstadoJuego, gremioId: string, heroeId: string): number {
  const s = tiene(estado, gremioId, 'sparring').find((x) => x.id !== heroeId && x.estado === 'libre');
  if (!s) return 1;
  cambiarMental(s, { estres: H.sparring.estres });
  return H.sparring.experiencia;
}

/** Nivel de ojeo extra: con Lucre (Ojo de oro) el gremio ve el techo real de todos. */
export function veTechoReal(estado: EstadoJuego, gremioId: string): boolean {
  return tiene(estado, gremioId, 'ojoDeOro').length > 0;
}
