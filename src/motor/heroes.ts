// Héroes (biblia, sección 9): generación, potencial visible como rango, sueldo, valor y progresión.

import balance from '../datos/balance.json';
import nombres from '../datos/nombres.json';
import type { Azar } from './azar';
import { CLASES, LETRAS, type Clase, type Heroe, type Letra } from './tipos';

const L = balance.letras;

/** Letra de un valor de poder (o de potencial) según la escala de balance.json. */
export function letraDe(valor: number): Letra {
  let letra: Letra = 'F';
  L.umbral.forEach((u, i) => {
    if (valor >= u) letra = LETRAS[i] ?? letra;
  });
  return letra;
}

export function indiceLetra(letra: Letra): number {
  return LETRAS.indexOf(letra);
}

/** Valor numérico de potencial al azar dentro de la franja de una letra. */
function potencialEnLetra(azar: Azar, letra: Letra): number {
  const i = indiceLetra(letra);
  const min = L.umbral[i] ?? 0;
  const max = (L.umbral[i + 1] ?? 101) - 1;
  return azar.entero(min, max);
}

export interface OpcionesHeroe {
  poder: [number, number];
  /** Letras posibles del potencial (se elige una al azar). */
  potencial: readonly Letra[];
  reputacion?: [number, number];
  /** Clase fija; si no se da, una al azar. */
  clase?: Clase;
}

export function generarHeroe(azar: Azar, id: string, o: OpcionesHeroe): Heroe {
  const poder = azar.entero(o.poder[0], o.poder[1]);
  const potencial = Math.max(poder, potencialEnLetra(azar, azar.elegir(o.potencial)));
  const clase = o.clase ?? azar.elegir(CLASES);
  return {
    id,
    nombre: `${azar.elegir(nombres.nombres)} ${azar.elegir(nombres.apellidos)}`,
    clase,
    poder,
    potencial,
    sesgoOjeo: azar.siguiente(),
    experiencia: 0,
    reputacion: o.reputacion ? azar.entero(o.reputacion[0], o.reputacion[1]) : 0,
    lealtad: balance.heroes.lealtadInicial,
    estado: 'libre',
    diasLesion: 0,
    semanasSinCobrar: 0,
  };
}

/** Letra de potencial al azar según una tabla de probabilidades (%) por letra. */
export function letraPotencialNovato(azar: Azar, tabla: Record<string, number> = balance.heroes.potencialPorLetra as Record<string, number>): Letra {
  let tirada = azar.siguiente() * 100;
  for (const letra of LETRAS) {
    const p = tabla[letra] ?? 0;
    if (tirada < p) return letra;
    tirada -= p;
  }
  return 'C';
}

/** Nivel de ojeo máximo: a ese nivel se ve el techo exacto. */
export const OJEO_MAXIMO = balance.instalaciones.ojeadores.anchura.length - 1;

/**
 * Nivel de ojeo con el que un gremio mira a un héroe: el de sus ojeadores, y uno más si el héroe es
 * suyo (lo ve entrenar cada día).
 */
export function nivelOjeo(g: { nivelOjeadores: number; plantilla: string[] }, heroeId: string): number {
  return Math.min(OJEO_MAXIMO, g.nivelOjeadores + (g.plantilla.includes(heroeId) ? 1 : 0));
}

/**
 * Techo (rango máximo) que puede ver un gremio: un abanico de letras posibles (p. ej. C, B, A).
 * Los ojeadores lo estrechan; al nivel máximo, o cuando el héroe llega a su límite, es exacto.
 * Siempre contiene la letra real y nunca baja del rango actual. Todos los gremios ven la misma
 * ventana para el mismo nivel: la diferencia está en cuántos ojeadores tiene cada uno.
 */
export function rangoPotencial(h: Heroe, nivelOjeadores: number): [Letra, Letra] {
  const anchuras = balance.instalaciones.ojeadores.anchura;
  const ancho = anchuras[Math.min(nivelOjeadores, anchuras.length - 1)] ?? 1;
  const real = indiceLetra(letraDe(h.potencial));
  // Al llegar a su límite se revela su potencial real.
  if (h.poder >= h.potencial || h.techoConocido) return [letraDe(h.potencial), letraDe(h.potencial)];
  let inicio = Math.min(Math.max(real - Math.floor(h.sesgoOjeo * ancho), 0), LETRAS.length - ancho);
  const fin = Math.min(inicio + ancho - 1, LETRAS.length - 1);
  inicio = Math.max(inicio, indiceLetra(letraDe(h.poder)));
  return [LETRAS[inicio] ?? 'F', LETRAS[fin] ?? 'S'];
}

export function textoPotencial(h: Heroe, nivelOjeadores: number): string {
  const [a, b] = rangoPotencial(h, nivelOjeadores);
  return a === b ? a : `${a}–${b}`;
}

/** true si el techo visto con ese nivel de ojeo es una sola letra segura. */
export function techoSeguro(h: Heroe, nivel: number): boolean {
  const [a, b] = rangoPotencial(h, nivel);
  return a === b;
}

/** Potencial que estima quien mira con ese nivel de ojeo: el centro de las letras posibles. */
export function potencialEstimado(h: Heroe, nivel: number): number {
  const U = balance.letras.umbral;
  const [a, b] = rangoPotencial(h, nivel);
  const min = U[indiceLetra(a)] ?? 0;
  const max = (U[indiceLetra(b) + 1] ?? 101) - 1;
  if (a === b && h.poder >= h.potencial) return h.potencial;
  return Math.max(h.poder, Math.round((min + max) / 2));
}

/** Novato destacado (prestigio del ranking): potencial real A o S. */
export function esDestacado(h: Heroe): boolean {
  return (balance.heroes.letrasDestacado as string[]).includes(letraDe(h.potencial));
}

/** Sueldo semanal: crece con el poder y la reputación (sección 4). */
export function sueldo(h: Heroe): number {
  const s = balance.sueldos;
  const bruto = s.base + s.porPoder * h.poder + s.porReputacion * h.reputacion;
  return Math.round(bruto / s.redondeo) * s.redondeo;
}

function valorCon(h: Heroe, potencial: number): number {
  const v = balance.valor;
  const bruto = v.porPoder * h.poder + v.porMargen * Math.max(0, potencial - h.poder) + v.porReputacion * h.reputacion;
  return Math.max(v.minimo, Math.round(bruto / 50) * 50);
}

/** Valor real de un héroe (lo que rinde hoy, su margen de crecimiento real y su reputación). Nadie lo ve tal cual. */
export function valor(h: Heroe): number {
  return valorCon(h, h.potencial);
}

/** Valor que le da quien mira con ese nivel de ojeo: con el potencial que estima, no con el real. */
export function valorEstimado(h: Heroe, nivel: number): number {
  return valorCon(h, potencialEstimado(h, nivel));
}

/**
 * Valor público: el que ve cualquiera sin ojeadores. Marca los precios de salida y del mercado, para que
 * el precio nunca delate a una joya oculta.
 */
export function valorPublico(h: Heroe): number {
  return valorEstimado(h, 0);
}

/** Rango del héroe según su poder actual (F, D, C, B, A, S): las mismas letras que el potencial. */
export function rango(h: Heroe): Letra {
  return letraDe(h.poder);
}

/** true si el héroe ya no puede crecer más: ha llegado a su potencial. */
export function alLimite(h: Heroe): boolean {
  return h.poder >= h.potencial;
}

/** Lo que pasa al sumar experiencia: para enseñar el progreso al volver de una misión. */
export interface Progreso {
  experienciaGanada: number;
  experienciaAntes: number;
  experienciaDespues: number;
  /** Barras de experiencia completadas (cada una sube el poder de golpe). */
  barras: number;
  poderAntes: number;
  poderDespues: number;
  rangoAntes: Letra;
  rangoDespues: Letra;
  sueldoAntes: number;
  sueldoDespues: number;
  /** true si en esta misión ha llegado a su potencial. */
  llegaAlLimite: boolean;
}

/**
 * Suma experiencia a la barra. Cada vez que se llena, el poder sube de golpe (+3), sin pasar del
 * potencial. Al llegar al potencial, la barra se vacía y deja de llenarse.
 */
export function ganarExperiencia(h: Heroe, experiencia: number): Progreso {
  const H = balance.heroes;
  const antes = { experiencia: h.experiencia, poder: h.poder, rango: rango(h), sueldo: sueldo(h), limite: alLimite(h) };
  let barras = 0;
  if (!antes.limite) {
    h.experiencia += experiencia;
    while (h.experiencia >= H.experienciaPorBarra && !alLimite(h)) {
      h.experiencia -= H.experienciaPorBarra;
      h.poder = Math.min(h.potencial, h.poder + H.poderPorBarra);
      barras += 1;
    }
    if (alLimite(h)) h.experiencia = 0;
  }
  return {
    experienciaGanada: antes.limite ? 0 : experiencia,
    experienciaAntes: antes.experiencia,
    experienciaDespues: h.experiencia,
    barras,
    poderAntes: antes.poder,
    poderDespues: h.poder,
    rangoAntes: antes.rango,
    rangoDespues: rango(h),
    sueldoAntes: antes.sueldo,
    sueldoDespues: sueldo(h),
    llegaAlLimite: !antes.limite && alLimite(h),
  };
}
