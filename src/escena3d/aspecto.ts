// Del catálogo al aspecto (docs/direccion-de-arte.md, apartado 8). Función pura: no usa Three.js ni el navegador.
// Orden: clase → género → rasgos → semilla (id y nombre) → ajustes a mano → estado de la partida.
// Las variaciones usan un Azar propio con semilla; no tocan el azar de la partida.

import datos from '../datos/aspecto.json';
import { Azar } from '../motor/azar';

export type FormaCara = 'A' | 'B' | 'C';
export type Expresion = 'neutra' | 'parpadeo' | 'sonrisa' | 'seria' | 'dolor' | 'sorpresa';

/** Lo mínimo que hace falta de un héroe para darle aspecto. */
export interface DatosHeroe {
  id: string;
  nombre?: string;
  clase: string;
  genero?: string;
  rasgos?: string[];
  catalogo?: string;
  gremio?: string;
  zombie?: boolean;
}

export interface Aspecto {
  forma: 'humana' | 'trio';
  /** Factor sobre la altura estándar. */
  altura: number;
  complexion: number;
  hombros: number;
  piel: string;
  pelo: string;
  ojos: string;
  peinado: string;
  flequillo: string;
  orejas: string;
  cara: {
    tipo: 'normal' | 'mascara' | 'lisa';
    ojo: string;
    cejas: string;
    boca: string;
    rubor: number;
    extras: string[];
  };
  prenda: { tipo: string; color: string; color2: string; largo: number; vuelo: number; manga: number; detalle: string };
  piernas: { tipo: string; color: string };
  zapatos: { color: string; tamano: number };
  accesorio: string;
  acento: string;
  colorGremio: string;
  /** Amplitud de los gestos (el carácter la cambia). */
  amplitud: number;
  barbilla: number;
  /** Solo para la forma «trio». */
  ojosTrio?: string[];
  alturasTrio?: number[];
}

type Ajuste = Record<string, unknown>;

function semillaDe(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const txt = (a: Ajuste, clave: string, porDefecto: string): string => (typeof a[clave] === 'string' ? (a[clave] as string) : porDefecto);
const numero = (a: Ajuste, clave: string, porDefecto: number): number => (typeof a[clave] === 'number' ? (a[clave] as number) : porDefecto);
const lista = (a: Ajuste, clave: string): string[] | undefined => (Array.isArray(a[clave]) ? (a[clave] as string[]) : undefined);

function construir(h: DatosHeroe, ajuste: Ajuste): Aspecto {
  const P = datos.paleta;
  const azar = new Azar(semillaDe(`${h.catalogo ?? h.id}|${h.nombre ?? ''}`));
  const clase = (datos.clases as Record<string, (typeof datos.clases)['Guerrero']>)[h.clase] ?? datos.clases.Guerrero;
  const genero = h.genero === 'Mujer' ? 'Mujer' : 'Hombre';

  // Rasgos: cara, postura y detalle. El primero que define algo, gana.
  const rasgo: Ajuste = {};
  for (const r of h.rasgos ?? []) {
    const regla = (datos.rasgos as Record<string, Ajuste>)[r];
    if (regla) for (const [k, v] of Object.entries(regla)) if (!(k in rasgo)) rasgo[k] = v;
  }

  // Semilla: lo que no deciden ni la clase ni el carácter.
  const [minA, maxA] = datos.proporciones.variacionAltura as [number, number];
  const base = {
    altura: (minA + azar.siguiente() * (maxA - minA)) * (genero === 'Mujer' ? 0.97 : 1.02),
    complexion: 0.92 + azar.siguiente() * 0.2,
    piel: azar.elegir(P.piel),
    pelo: azar.elegir(P.pelo),
    ojos: azar.elegir(P.ojos),
    peinado: azar.elegir(datos.peinados[genero]),
    flequillo: azar.elegir(['recto', 'abierto', 'lateral']),
    ojo: azar.elegir(['redondo', 'almendrado', 'caido']),
    boca: azar.elegir(['linea', 'media', 'sonrisa']),
    ropa: azar.elegir(P.ropaNeutra),
    piernasColor: azar.elegir(P.ropaNeutra),
    zapatos: azar.elegir(['#26272a', '#eeeae2', '#5a4636', '#4a4e54']),
    accesorio: azar.elegir(clase.accesorios),
    extras: azar.probabilidad(25) ? [azar.elegir(['pecas', 'lunar'])] : [],
  };

  const acento = (P.clase as Record<string, string>)[h.clase] ?? '#9aa0a6';
  const a: Ajuste = { ...rasgo, ...ajuste };
  const aspecto: Aspecto = {
    forma: txt(a, 'forma', 'humana') === 'trio' ? 'trio' : 'humana',
    altura: numero(a, 'altura', base.altura),
    complexion: numero(a, 'complexion', base.complexion),
    hombros: clase.hombros * (genero === 'Mujer' ? 0.94 : 1.04),
    piel: txt(a, 'piel', base.piel),
    pelo: txt(a, 'pelo', base.pelo),
    ojos: txt(a, 'ojos', base.ojos),
    peinado: txt(a, 'peinado', base.peinado),
    flequillo: txt(a, 'flequillo', base.flequillo),
    orejas: txt(a, 'orejas', 'normales'),
    cara: {
      tipo: (['mascara', 'lisa'].includes(txt(a, 'cara', 'normal')) ? txt(a, 'cara', 'normal') : 'normal') as Aspecto['cara']['tipo'],
      ojo: txt(a, 'ojo', base.ojo),
      cejas: txt(a, 'cejas', 'rectas'),
      boca: txt(a, 'boca', base.boca),
      rubor: numero(a, 'rubor', 0.35),
      extras: lista(a, 'extras') ?? base.extras,
    },
    prenda: {
      tipo: txt(a, 'prenda', clase.prenda),
      color: txt(a, 'ropa', base.ropa),
      color2: txt(a, 'ropa2', acento),
      largo: numero(a, 'largo', clase.largo),
      vuelo: numero(a, 'vuelo', clase.vuelo),
      manga: numero(a, 'manga', clase.manga),
      detalle: txt(a, 'detalle', 'ninguno'),
    },
    piernas: { tipo: txt(a, 'piernas', clase.piernas), color: txt(a, 'colorPiernas', base.piernasColor) },
    zapatos: { color: txt(a, 'zapatos', base.zapatos), tamano: clase.zapato },
    accesorio: txt(a, 'accesorio', base.accesorio),
    acento,
    colorGremio: (P.gremio as Record<string, string>)[h.gremio ?? 'jugador'] ?? P.gremio.jugador,
    amplitud: numero(a, 'amplitud', 1),
    barbilla: numero(a, 'barbilla', 0),
  };
  const ojosTrio = lista(a, 'ojosTrio');
  if (ojosTrio) aspecto.ojosTrio = ojosTrio;
  if (Array.isArray(a.alturasTrio)) aspecto.alturasTrio = a.alturasTrio as number[];

  // Estado de la partida.
  if (h.zombie) {
    aspecto.piel = P.pielFantasia.zombie;
    aspecto.cara.rubor = 0;
    aspecto.cara.extras = [...aspecto.cara.extras, 'ojeras'];
  }
  return aspecto;
}

/** Aspecto de un héroe: el mismo héroe da siempre el mismo aspecto. */
export function aspectoDe(h: DatosHeroe): Aspecto {
  const ajustes = datos.heroes as Record<string, unknown>;
  const ajuste = (h.catalogo && typeof ajustes[h.catalogo] === 'object' ? ajustes[h.catalogo] : {}) as Ajuste;
  return construir(h, ajuste);
}

/** Aspecto del maestro (el jugador). */
export function aspectoMaestro(): Aspecto {
  return construir({ id: 'maestro', nombre: 'Maestro', clase: 'Explorador', genero: 'Hombre' }, datos.maestro as Ajuste);
}
