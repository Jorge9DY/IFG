// Atlas de un héroe pintado por código (docs/direccion-de-arte.md, apartado 4): 256 × 256 unidades con las
// caras (8 celdas), la prenda, las mangas, las piernas, el pelo, los zapatos y unos colores lisos.
// Solo usa la API 2D de canvas. Todo se dibuja en unidades lógicas; «escala» decide los píxeles reales.

import type { Aspecto, Expresion, FormaCara } from '../aspecto';

export interface Zona {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const LADO = 256;
export const EXPRESIONES: readonly Expresion[] = ['neutra', 'parpadeo', 'sonrisa', 'seria', 'dolor', 'sorpresa'];

export const ZONAS = {
  cara: { x: 0, y: 0, w: 64, h: 64 },
  prenda: { x: 0, y: 128, w: 128, h: 64 },
  manga: { x: 128, y: 128, w: 32, h: 64 },
  piernas: { x: 160, y: 128, w: 32, h: 64 },
  pelo: { x: 192, y: 128, w: 64, h: 64 },
  zapato: { x: 0, y: 192, w: 32, h: 32 },
  piel: { x: 68, y: 196, w: 8, h: 8 },
  peloLiso: { x: 84, y: 196, w: 8, h: 8 },
  acento: { x: 100, y: 196, w: 8, h: 8 },
  metal: { x: 116, y: 196, w: 8, h: 8 },
  madera: { x: 132, y: 196, w: 8, h: 8 },
  ropa2: { x: 148, y: 196, w: 8, h: 8 },
  ropa: { x: 164, y: 196, w: 8, h: 8 },
  brillo: { x: 180, y: 196, w: 8, h: 8 },
  oscuro: { x: 196, y: 196, w: 8, h: 8 },
  gremio: { x: 212, y: 196, w: 8, h: 8 },
} as const satisfies Record<string, Zona>;

/** Celda de la cara para una expresión. */
export function celdaCara(e: Expresion): Zona {
  const i = Math.max(0, EXPRESIONES.indexOf(e));
  return { x: (i % 4) * 64, y: Math.floor(i / 4) * 64, w: 64, h: 64 };
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const m = (x: number, y: number): string => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
/** Tono de sombra: más oscuro y algo más frío. */
export const sombra = (c: string, t = 0.24): string => mezclar(c, '#1a2238', t);
export const luz = (c: string, t = 0.16): string => mezclar(c, '#ffffff', t);

type Ctx = CanvasRenderingContext2D;

function elipse(c: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function linea(c: Ctx, puntos: number[], color: string, grosor: number): void {
  c.strokeStyle = color;
  c.lineWidth = grosor;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(puntos[0] ?? 0, puntos[1] ?? 0);
  for (let i = 2; i < puntos.length; i += 2) c.lineTo(puntos[i] ?? 0, puntos[i + 1] ?? 0);
  c.stroke();
}
function curva(c: Ctx, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, color: string, grosor: number): void {
  c.strokeStyle = color;
  c.lineWidth = grosor;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x1, y1);
  c.quadraticCurveTo(cx, cy, x2, y2);
  c.stroke();
}
function recortar(c: Ctx, z: Zona, pintar: () => void): void {
  c.save();
  c.beginPath();
  c.rect(z.x, z.y, z.w, z.h);
  c.clip();
  c.translate(z.x, z.y);
  pintar();
  c.restore();
}

// ---------------------------------------------------------------------------
// Cara
// ---------------------------------------------------------------------------

const TRAZO = '#2a2224';

/** Un ojo abierto en (0,0). «lado» es −1 para el de la izquierda de la imagen y 1 para el otro. */
function ojoAbierto(c: Ctx, a: Aspecto, variante: FormaCara, lado: number, grande: boolean): void {
  const forma = a.cara.ojo;
  const k = (forma === 'redondo' ? 1.1 : 1) * (grande ? 1.12 : 1);
  const caida = forma === 'caido' ? 1.6 : forma === 'rasgado' ? -2.2 : 0;
  const parpado = forma === 'entrecerrado' ? 0.42 : forma === 'rasgado' ? 0.22 : 0;
  if (variante === 'A') {
    const rx = 8.8 * k;
    const ry = 10.6 * k;
    elipse(c, 0, 0, rx, ry, '#fbf8f4');
    // Iris en dos tonos, pupila y brillos.
    const iris = c.createLinearGradient(0, -ry, 0, ry);
    iris.addColorStop(0, sombra(a.ojos, 0.55));
    iris.addColorStop(0.55, a.ojos);
    iris.addColorStop(1, luz(a.ojos, 0.45));
    c.fillStyle = iris;
    c.beginPath();
    c.ellipse(0, 0.6, rx * (grande ? 0.62 : 0.8), ry * (grande ? 0.68 : 0.9), 0, 0, Math.PI * 2);
    c.fill();
    elipse(c, 0, 0.8, rx * 0.34, ry * 0.42, sombra(a.ojos, 0.8));
    elipse(c, -2.8, -3.6, 2.8, 3.1, '#ffffff');
    elipse(c, 3, 4.6, 1.4, 1.5, '#ffffff');
    // Párpado: piel por encima y pestaña gruesa en el borde.
    const yLid = -ry + 2 * ry * parpado;
    c.fillStyle = a.piel;
    c.beginPath();
    c.moveTo(-rx - 3, -ry - 4);
    c.lineTo(rx + 3, -ry - 4);
    c.lineTo(rx + 3, yLid + (lado > 0 ? caida : -caida) - 1);
    c.quadraticCurveTo(0, yLid - 3.2, -rx - 3, yLid + (lado > 0 ? -caida : caida) - 1);
    c.fill();
    curva(c, -rx - 1, yLid + (lado > 0 ? -caida : caida) + 1.2, 0, yLid - 3.4, rx + 1, yLid + (lado > 0 ? caida : -caida) + 1.2, TRAZO, 2.6);
    linea(c, [lado * (rx + 1), yLid + caida + 1.2, lado * (rx + 3), yLid + caida - 0.6], TRAZO, 1.6);
  } else if (variante === 'B') {
    const rx = 5.6 * k;
    const ry = 8.2 * k * (1 - parpado * 0.6);
    elipse(c, 0, 0, rx, ry, TRAZO);
    c.fillStyle = a.ojos;
    c.beginPath();
    c.ellipse(0, ry * 0.35, rx * 0.72, ry * 0.5, 0, 0, Math.PI);
    c.fill();
    elipse(c, -1.4, -ry * 0.4, 1.6, 1.9, '#ffffff');
    if (caida) linea(c, [-rx - 1, -ry + (lado > 0 ? -caida : caida) * 0.6, rx + 1, -ry + (lado > 0 ? caida : -caida) * 0.6], TRAZO, 1.8);
  } else {
    // C: bloque de color bajo una pestaña recta y gruesa.
    const rx = 7.8 * k;
    const ry = 8.8 * k * (1 - parpado * 0.5);
    c.fillStyle = a.ojos;
    c.beginPath();
    c.ellipse(0, -1, rx * 0.82, ry, 0, 0, Math.PI);
    c.fill();
    c.fillStyle = sombra(a.ojos, 0.6);
    c.beginPath();
    c.ellipse(0, -1, rx * 0.4, ry * 0.55, 0, 0, Math.PI);
    c.fill();
    elipse(c, -2.4, 1.2, 1.3, 1.3, '#ffffff');
    const dy = (lado > 0 ? caida : -caida) * 0.7;
    linea(c, [-rx - 1, -1 - dy, rx + 1, -1 + dy], TRAZO, 3);
  }
}

function pintarCara(c: Ctx, a: Aspecto, e: Expresion, variante: FormaCara): void {
  const mascara = a.cara.tipo === 'mascara';
  c.fillStyle = a.piel;
  c.fillRect(0, 0, 64, 64);
  if (!mascara) {
    // Sombra del flequillo en la frente y un poco de luz pintada en las mejillas.
    const frente = c.createLinearGradient(0, 8, 0, 26);
    frente.addColorStop(0, sombra(a.piel, 0.2));
    frente.addColorStop(1, a.piel);
    c.fillStyle = frente;
    c.fillRect(0, 0, 64, 26);
    c.fillStyle = sombra(a.piel, 0.1);
    c.fillRect(0, 56, 64, 8);
  }
  if (a.cara.tipo === 'lisa') return;
  const ex = 14.5;
  const ey = 38.5;
  const trazo = mascara ? '#eceef0' : TRAZO;

  // Ojos.
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(32 + lado * ex, ey);
    if (mascara) {
      // Máscara lisa: solo un ojo rasgado de color.
      if (e === 'parpadeo') linea(c, [-6, 0, 6, 0], a.ojos, 1.6);
      else {
        c.fillStyle = a.ojos;
        c.beginPath();
        c.moveTo(-7, lado * 1.5);
        c.quadraticCurveTo(0, -5, 7, -lado * 1.5);
        c.quadraticCurveTo(0, 3.5, -7, lado * 1.5);
        c.fill();
      }
    } else if (e === 'parpadeo') curva(c, -6.5, -1, 0, 4, 6.5, -1, trazo, 2.4);
    else if (e === 'sonrisa') curva(c, -6.5, 2, 0, -6.5, 6.5, 2, trazo, 2.6);
    else if (e === 'dolor') linea(c, [lado * 6, -5, -lado * 4, 0, lado * 6, 5], trazo, 2.6);
    else ojoAbierto(c, a, variante, lado, e === 'sorpresa');
    c.restore();
  }
  if (mascara) return;

  // Cejas.
  const inclinadas = e === 'seria' || a.cara.cejas === 'inclinadas';
  for (const lado of [-1, 1]) {
    const x = 32 + lado * ex;
    const dentro = inclinadas ? 2.2 : e === 'dolor' ? -2.4 : 0;
    const y = e === 'sorpresa' ? 19 : 22.5;
    linea(c, [x - lado * 5.5, y + dentro, x + lado * 5.5, y - dentro * 0.4 - 0.6], mezclar(a.pelo, TRAZO, 0.45), 1.9);
  }

  // Rubor.
  if (a.cara.rubor > 0) {
    c.globalAlpha = Math.min(0.75, a.cara.rubor + (e === 'sonrisa' ? 0.15 : 0));
    elipse(c, 32 - 19, 50, 5.5, 3, '#f08a8a');
    elipse(c, 32 + 19, 50, 5.5, 3, '#f08a8a');
    c.globalAlpha = 1;
  }

  // Boca.
  const by = 55;
  const boca = e === 'neutra' || e === 'parpadeo' ? a.cara.boca : e;
  if (boca === 'sonrisa') {
    c.fillStyle = '#7a2f33';
    c.beginPath();
    c.moveTo(27, by - 1.5);
    c.quadraticCurveTo(32, by + 7, 37, by - 1.5);
    c.closePath();
    c.fill();
    linea(c, [27, by - 1.5, 37, by - 1.5], TRAZO, 1.2);
  } else if (boca === 'media') curva(c, 28, by, 32, by + 3, 37, by - 1.5, TRAZO, 1.6);
  else if (boca === 'dolor') linea(c, [27, by + 1, 29.5, by - 1, 32, by + 1, 34.5, by - 1, 37, by + 1], TRAZO, 1.5);
  else if (boca === 'sorpresa') elipse(c, 32, by + 1, 2.4, 3.2, '#7a2f33');
  else if (boca === 'seria') curva(c, 28.5, by + 1, 32, by - 1.5, 35.5, by + 1, TRAZO, 1.6);
  else linea(c, [29, by, 35, by], TRAZO, 1.6);

  // Extras.
  const extras = a.cara.extras;
  if (extras.includes('colmillo')) {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(34.2, by - 1.6);
    c.lineTo(37.2, by - 1.6);
    c.lineTo(35.8, by + 3.4);
    c.fill();
  }
  if (extras.includes('pecas')) for (const [x, y] of [[-8, 49], [-5, 51], [-11, 52], [8, 49], [5, 51], [11, 52]] as const) elipse(c, 32 + x, y, 0.8, 0.8, sombra(a.piel, 0.4));
  if (extras.includes('lunar')) elipse(c, 43, 51, 1, 1, TRAZO);
  if (extras.includes('ojeras')) for (const lado of [-1, 1]) curva(c, 32 + lado * ex - 6, 46, 32 + lado * ex, 49, 32 + lado * ex + 6, 46, sombra(a.piel, 0.45), 1.6);
}

// ---------------------------------------------------------------------------
// Ropa, pelo y zapatos
// ---------------------------------------------------------------------------

/** Prenda de arriba: 128 × 64, la envuelve entera; el centro (x = 64) es el frente y arriba está el cuello. */
function pintarPrenda(c: Ctx, a: Aspecto): void {
  const { color, color2, tipo, detalle } = a.prenda;
  const W = 128;
  const H = 64;
  c.fillStyle = color;
  c.fillRect(0, 0, W, H);
  // Luz pintada: más oscuro hacia abajo y en la espalda.
  const baja = c.createLinearGradient(0, 0, 0, H);
  baja.addColorStop(0, 'rgba(0,0,0,0)');
  baja.addColorStop(0.55, 'rgba(0,0,0,0)');
  baja.addColorStop(1, 'rgba(20,26,46,0.34)');
  c.fillStyle = baja;
  c.fillRect(0, 0, W, H);
  // Pliegues.
  const pliegue = sombra(color, 0.3);
  for (const x of [14, 30, 46, 82, 98, 114]) linea(c, [x, 34 + (x % 9), x + (x < 64 ? 2 : -2), H - 3], pliegue, 1);
  for (const x of [22, 106]) curva(c, x - 6, 22, x, 26, x + 6, 22, pliegue, 1);

  if (tipo === 'chaqueta') {
    // Chaqueta corta de guerrera: cremallera, cuello, banda del acento en hombros y cintura, bolsillos.
    c.fillStyle = color2;
    c.fillRect(0, 0, W, 9);
    c.fillStyle = sombra(color2);
    c.fillRect(0, 8, W, 1.5);
    c.fillStyle = luz(color, 0.14);
    c.fillRect(0, H - 9, W, 9);
    linea(c, [0, H - 9, W, H - 9], pliegue, 1);
    linea(c, [64, 6, 64, H - 9], '#c9cdd0', 1.6);
    for (const x of [44, 76]) {
      c.strokeStyle = pliegue;
      c.lineWidth = 1;
      c.strokeRect(x, 36, 9, 8);
    }
    c.fillStyle = sombra(color, 0.35);
    c.beginPath();
    c.moveTo(52, 0);
    c.lineTo(64, 13);
    c.lineTo(76, 0);
    c.fill();
  } else if (tipo === 'tunica' || tipo === 'bata') {
    // Túnica larga: ribete del acento en el bajo y en la abertura, cuello grande y botones.
    c.fillStyle = color2;
    c.fillRect(0, H - 7, W, 7);
    c.fillStyle = luz(color2, 0.3);
    c.fillRect(0, H - 8.5, W, 1.5);
    c.fillStyle = color2;
    c.fillRect(62, 10, 4, H - 17);
    c.beginPath();
    c.moveTo(44, 0);
    c.lineTo(64, 17);
    c.lineTo(84, 0);
    c.lineTo(76, 0);
    c.lineTo(64, 11);
    c.lineTo(52, 0);
    c.fill();
    for (const y of [22, 31, 40]) elipse(c, 70.5, y, 1.5, 1.5, '#d8b95a');
  } else if (tipo === 'abrigo') {
    // Abrigo largo: solapas, doble fila de botones y cinturón.
    c.fillStyle = sombra(color, 0.28);
    c.beginPath();
    c.moveTo(48, 0);
    c.lineTo(64, 20);
    c.lineTo(80, 0);
    c.fill();
    linea(c, [64, 20, 64, H], pliegue, 1.2);
    for (const y of [26, 36]) for (const x of [58, 70]) elipse(c, x, y, 1.4, 1.4, '#26272a');
    c.fillStyle = sombra(color, 0.42);
    c.fillRect(0, 42, W, 5);
    c.fillStyle = '#c9cdd0';
    c.fillRect(61, 41.5, 6, 6);
  } else if (tipo === 'mono') {
    // Traje negro: correas y costuras apenas más claras.
    linea(c, [38, 0, 58, 40, 64, H], color2, 1.6);
    linea(c, [90, 0, 70, 40, 64, H], color2, 1.6);
    c.fillStyle = color2;
    c.fillRect(0, 40, W, 3.5);
    c.fillRect(0, H - 4, W, 4);
  } else {
    // Capa corta: cierre y ribete.
    c.fillStyle = color2;
    c.fillRect(0, H - 5, W, 5);
    elipse(c, 64, 7, 3, 3, '#d8b95a');
  }

  // Detalle del pecho.
  if (detalle === 'estrella') {
    c.fillStyle = '#d8b95a';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 5 : 2.2;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      c.lineTo(50 + Math.cos(ang) * r, 27 + Math.sin(ang) * r);
    }
    c.fill();
  }
  // Emblema del gremio en la manga del frente (un rombo con su color).
  c.fillStyle = a.colorGremio;
  c.beginPath();
  c.moveTo(84, 17);
  c.lineTo(88, 21);
  c.lineTo(84, 25);
  c.lineTo(80, 21);
  c.fill();
}

/** Manga: 32 × 64, arriba el hombro y abajo el puño. */
function pintarManga(c: Ctx, a: Aspecto): void {
  const { color, color2, tipo } = a.prenda;
  c.fillStyle = color;
  c.fillRect(0, 0, 32, 64);
  const baja = c.createLinearGradient(0, 0, 0, 64);
  baja.addColorStop(0.4, 'rgba(0,0,0,0)');
  baja.addColorStop(1, 'rgba(20,26,46,0.3)');
  c.fillStyle = baja;
  c.fillRect(0, 0, 32, 64);
  for (const y of [22, 30, 41]) curva(c, 4, y, 16, y + 3, 28, y - 1, sombra(color, 0.3), 1);
  c.fillStyle = color2;
  if (tipo === 'chaqueta') {
    c.fillRect(0, 0, 32, 12);
    c.fillRect(0, 56, 32, 8);
  } else if (tipo === 'mono') c.fillRect(0, 50, 32, 3);
  else {
    c.fillRect(0, 55, 32, 9);
    c.fillStyle = luz(color2, 0.3);
    c.fillRect(0, 53.5, 32, 1.5);
  }
}

/** Piernas: 32 × 64, arriba la cadera y abajo el tobillo. */
function pintarPiernas(c: Ctx, a: Aspecto): void {
  const { tipo, color } = a.piernas;
  const piel = a.piel;
  c.fillStyle = tipo === 'pantalon' || tipo === 'medias' ? color : piel;
  c.fillRect(0, 0, 32, 64);
  if (tipo === 'corto') {
    c.fillStyle = color;
    c.fillRect(0, 0, 32, 20);
    c.fillStyle = sombra(color);
    c.fillRect(0, 18, 32, 2);
    // Vendas en la espinilla.
    c.fillStyle = '#e6e1d3';
    c.fillRect(0, 44, 32, 14);
    for (const y of [47, 51, 55]) linea(c, [0, y, 32, y + 2], '#bdb8aa', 1);
  } else if (tipo === 'calcetines') {
    c.fillStyle = color;
    c.fillRect(0, 40, 32, 24);
    c.fillStyle = luz(color, 0.3);
    c.fillRect(0, 40, 32, 2.5);
  } else if (tipo === 'medias') {
    c.fillStyle = luz(color, 0.25);
    c.fillRect(0, 13, 32, 2);
    c.fillStyle = piel;
    c.fillRect(0, 0, 32, 13);
  }
  // Sombra del bajo de la prenda sobre el muslo.
  const arriba = c.createLinearGradient(0, 0, 0, 22);
  arriba.addColorStop(0, 'rgba(20,26,46,0.4)');
  arriba.addColorStop(1, 'rgba(20,26,46,0)');
  c.fillStyle = arriba;
  c.fillRect(0, 0, 32, 22);
}

/** Pelo: 64 × 64, mechones verticales y una banda de brillo. */
function pintarPelo(c: Ctx, a: Aspecto): void {
  c.fillStyle = a.pelo;
  c.fillRect(0, 0, 64, 64);
  const baja = c.createLinearGradient(0, 0, 0, 64);
  baja.addColorStop(0.3, 'rgba(0,0,0,0)');
  baja.addColorStop(1, 'rgba(20,26,46,0.32)');
  c.fillStyle = baja;
  c.fillRect(0, 0, 64, 64);
  const oscuro = sombra(a.pelo, 0.3);
  for (let x = 5; x < 64; x += 9) linea(c, [x, 20 + ((x * 7) % 11), x + ((x % 2) * 2 - 1), 62], oscuro, 1.1);
  // Banda de brillo en zigzag.
  c.fillStyle = luz(a.pelo, 0.38);
  c.beginPath();
  c.moveTo(0, 15);
  for (let x = 0; x <= 64; x += 8) c.lineTo(x, x % 16 === 0 ? 12 : 16);
  for (let x = 64; x >= 0; x -= 8) c.lineTo(x, x % 16 === 0 ? 17 : 20);
  c.fill();
}

function pintarZapato(c: Ctx, a: Aspecto): void {
  const color = a.zapatos.color;
  c.fillStyle = color;
  c.fillRect(0, 0, 32, 32);
  c.fillStyle = sombra(color, 0.4);
  c.fillRect(0, 25, 32, 7);
  c.fillStyle = luz(color, 0.3);
  c.fillRect(0, 0, 32, 5);
  linea(c, [6, 12, 26, 12], sombra(color, 0.3), 1.2);
  linea(c, [6, 17, 26, 17], sombra(color, 0.3), 1.2);
}

// ---------------------------------------------------------------------------

export interface OpcionesAtlas {
  variante: FormaCara;
  /** Píxeles reales por unidad (1 = 256 px, estilo píxel; 4 = 1024 px, suavizado). */
  escala: number;
}

/** Pinta el atlas completo de un héroe. */
export function pintarAtlas(a: Aspecto, opciones: OpcionesAtlas): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = LADO * opciones.escala;
  const c = lienzo.getContext('2d')!;
  c.scale(opciones.escala, opciones.escala);
  c.fillStyle = a.prenda.color;
  c.fillRect(0, 0, LADO, LADO);
  for (const e of EXPRESIONES) recortar(c, celdaCara(e), () => pintarCara(c, a, e, opciones.variante));
  recortar(c, ZONAS.prenda, () => pintarPrenda(c, a));
  recortar(c, ZONAS.manga, () => pintarManga(c, a));
  recortar(c, ZONAS.piernas, () => pintarPiernas(c, a));
  recortar(c, ZONAS.pelo, () => pintarPelo(c, a));
  recortar(c, ZONAS.zapato, () => pintarZapato(c, a));
  const lisos: [Zona, string][] = [
    [ZONAS.piel, a.piel],
    [ZONAS.peloLiso, sombra(a.pelo, 0.12)],
    [ZONAS.acento, a.acento],
    [ZONAS.metal, '#8d9499'],
    [ZONAS.madera, '#6b5a4a'],
    [ZONAS.ropa2, a.prenda.color2],
    [ZONAS.ropa, a.prenda.color],
    [ZONAS.brillo, '#fff6c8'],
    [ZONAS.oscuro, '#26272a'],
    [ZONAS.gremio, a.colorGremio],
  ];
  for (const [z, color] of lisos) {
    c.fillStyle = color;
    c.fillRect(z.x - 4, z.y - 4, z.w + 8, z.h + 8);
  }
  return lienzo;
}
