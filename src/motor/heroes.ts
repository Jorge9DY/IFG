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

/** Letra de potencial de un novato, según las probabilidades de balance.json. */
export function letraPotencialNovato(azar: Azar): Letra {
  const tabla = balance.heroes.potencialPorLetra as Record<string, number>;
  let tirada = azar.siguiente() * 100;
  for (const letra of LETRAS) {
    const p = tabla[letra] ?? 0;
    if (tirada < p) return letra;
    tirada -= p;
  }
  return 'C';
}

/**
 * Rango de potencial que ve el jugador (p. ej. B–S). La instalación de ojeadores lo estrecha.
 * Siempre contiene la letra real y nunca baja de la letra del poder actual.
 */
export function rangoPotencial(h: Heroe, nivelOjeadores: number): [Letra, Letra] {
  const anchuras = balance.instalaciones.ojeadores.anchura;
  const ancho = anchuras[Math.min(nivelOjeadores, anchuras.length - 1)] ?? 1;
  const real = indiceLetra(letraDe(h.potencial));
  // Al llegar a su límite se revela su potencial real.
  if (h.poder >= h.potencial) return [letraDe(h.potencial), letraDe(h.potencial)];
  let inicio = Math.min(Math.max(real - Math.floor(h.sesgoOjeo * ancho), 0), LETRAS.length - ancho);
  const fin = Math.min(inicio + ancho - 1, LETRAS.length - 1);
  inicio = Math.max(inicio, indiceLetra(letraDe(h.poder)));
  return [LETRAS[inicio] ?? 'F', LETRAS[fin] ?? 'S'];
}

export function textoPotencial(h: Heroe, nivelOjeadores: number): string {
  const [a, b] = rangoPotencial(h, nivelOjeadores);
  return a === b ? a : `${a}–${b}`;
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

/** Valor de referencia de un héroe: lo que rinde hoy, su margen de crecimiento y su reputación. */
export function valor(h: Heroe): number {
  const v = balance.valor;
  const bruto = v.porPoder * h.poder + v.porMargen * (h.potencial - h.poder) + v.porReputacion * h.reputacion;
  return Math.max(v.minimo, Math.round(bruto / 50) * 50);
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
