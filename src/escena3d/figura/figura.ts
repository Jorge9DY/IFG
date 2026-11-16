// Figura de un héroe generada por código (docs/direccion-de-arte.md, apartados 3 y 8): una sola malla con
// esqueleto, su atlas pintado y las cinco animaciones. El resto del juego solo conoce «FiguraHeroe».

import * as THREE from 'three';
import datos from '../../datos/aspecto.json';
import type { Aspecto, Expresion, FormaCara } from '../aspecto';
import { ZONAS, celdaCara, pintarAtlas, type Zona } from '../texturas/atlas';
import { Malla, type Anillo, type P3 } from './malla';

export type Animacion = 'respirar' | 'andar' | 'saludar' | 'celebrar' | 'lesionado';

/** Lo único que el resto del juego sabe de un héroe en 3D. Un modelo hecho a mano puede implementarlo igual. */
export interface FiguraHeroe {
  raiz: THREE.Object3D;
  /** Altura en metros, para colocar el nombre y encuadrar el retrato. */
  altura: number;
  triangulos: number;
  animar(nombre: Animacion): void;
  expresion(nombre: Expresion): void;
  actualizar(dt: number): void;
  liberar(): void;
}

export interface OpcionesFigura {
  variante: FormaCara;
  /** true: textura de 256 px con el píxel a la vista; false: 1024 px suavizada. */
  pixel: boolean;
  contorno: boolean;
}

export const OPCIONES_POR_DEFECTO: OpcionesFigura = { variante: 'A', pixel: true, contorno: false };

const H = { cadera: 0, torso: 1, cabeza: 2, brazoI: 3, anteI: 4, brazoD: 5, anteD: 6, musloI: 7, piernaI: 8, musloD: 9, piernaD: 10 } as const;
const Y = { cadera: 0.77, rodilla: 0.44, tobillo: 0.1, torso: 0.9, hombro: 1.2, codo: 0.95, cuello: 1.26, cabeza: 1.42 };
const X_PIERNA = 0.075;
const CABEZA = { rx: datos.proporciones.cabezaAncho / 2, rz: 0.14, alto: datos.proporciones.cabezaAlto };

const sub = (z: Zona, v0: number, v1: number): Zona => ({ x: z.x, y: z.y + z.h * v0, w: z.w, h: z.h * (v1 - v0) });
const suave = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let rampa: THREE.DataTexture | null = null;
function rampaDosTonos(): THREE.DataTexture {
  if (!rampa) {
    rampa = new THREE.DataTexture(new Uint8Array([Math.round(datos.luz.sombraMinima * 255), 255]), 2, 1, THREE.RedFormat);
    rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
    rampa.needsUpdate = true;
  }
  return rampa;
}

/** Construye la geometría de una figura humana. Devuelve también el rango de vértices de la cara. */
function construirCuerpo(a: Aspecto): { malla: Malla; cara: [number, number] } {
  const m = new Malla();
  const cx = a.complexion;
  const xH = (datos.proporciones.hombros / 2) * a.hombros * cx;

  // Piernas: muslo y espinilla en un tubo, con la textura por bandas de la cadera al tobillo.
  for (const lado of [1, -1]) {
    const x = lado * X_PIERNA;
    const [muslo, pierna] = lado > 0 ? [H.musloI, H.piernaI] : [H.musloD, H.piernaD];
    const r = datos.proporciones.radioPierna;
    const anillo = (y: number, k: number, h: number): Anillo => ({ c: [x, y, 0], rx: r * k * cx, rz: r * k * cx, h, v: (0.8 - y) / 0.7 });
    m.grupoNuevo();
    m.tubo([anillo(0.8, 1.35, muslo), anillo(0.62, 1.2, muslo), anillo(0.45, 0.98, muslo), anillo(0.43, 0.98, pierna), anillo(0.25, 0.92, pierna), anillo(0.1, 0.78, pierna)], 5, ZONAS.piernas);
    // Zapato grande, con la puntera más baja.
    const t = a.zapatos.tamano;
    const [zx, zy, zz] = datos.proporciones.zapato as [number, number, number];
    m.caja([x, (zy * t) / 2, 0.045 * t], [zx * t, zy * t, zz * t], ZONAS.zapato, pierna, (p) => {
      if (p[2] > 0.045 * t && p[1] > (zy * t) / 2) p[1] -= 0.045 * t;
      if (p[2] > 0.045 * t) p[0] = x + (p[0] - x) * 0.82;
    });
  }

  // Cadera.
  const zonaCadera = a.piernas.tipo === 'corto' || a.piernas.tipo === 'pantalon' ? sub(ZONAS.piernas, 0.02, 0.2) : ZONAS.oscuro;
  m.grupoNuevo();
  m.tubo(
    [
      { c: [0, 0.9, 0], rx: 0.115 * cx, rz: 0.085 * cx, h: H.cadera },
      { c: [0, 0.78, 0], rx: 0.135 * cx, rz: 0.1 * cx, h: H.cadera },
      { c: [0, 0.7, 0], rx: 0.1 * cx, rz: 0.08 * cx, h: H.cadera },
    ],
    6,
    zonaCadera,
    { tapaAbajo: true },
  );

  // Prenda de arriba: holgada, más ancha en el bajo.
  const bajo = 1.2 - a.prenda.largo * 0.9;
  const v = (y: number): number => (1.27 - y) / (1.27 - bajo);
  const prenda: Anillo[] = [
    { c: [0, 1.275, 0], rx: 0.06, rz: 0.055, h: H.torso, v: 0 },
    { c: [0, 1.225, 0], rx: xH + 0.025, rz: 0.1 * cx, h: H.torso, v: v(1.225) },
    { c: [0, 1.08, 0.005], rx: xH * 0.95 + 0.02, rz: 0.118 * cx, h: H.torso, v: v(1.08) },
  ];
  const vueloEn = (y: number): number => 1 + (a.prenda.vuelo - 1) * suave(1.08, bajo, y);
  if (bajo < 0.86) prenda.push({ c: [0, 0.92, 0], rx: 0.15 * cx * vueloEn(0.92), rz: 0.11 * cx * vueloEn(0.92), h: H.torso, v: v(0.92) });
  if (bajo < 0.66) prenda.push({ c: [0, 0.74, 0], rx: 0.155 * cx * vueloEn(0.74), rz: 0.12 * cx * vueloEn(0.74), h: H.cadera, v: v(0.74) });
  prenda.push({ c: [0, bajo, 0], rx: 0.16 * cx * a.prenda.vuelo, rz: 0.125 * cx * a.prenda.vuelo, h: bajo < 0.8 ? H.cadera : H.torso, v: 1 });
  m.grupoNuevo();
  m.tubo(prenda, 8, ZONAS.prenda, { dobleCara: bajo < 0.7 });

  // Cuello.
  m.grupoNuevo();
  m.tubo([{ c: [0, 1.31, 0], rx: 0.042, rz: 0.042, h: H.cabeza }, { c: [0, 1.24, 0], rx: 0.045, rz: 0.045, h: H.torso }], 5, ZONAS.piel);

  // Brazos: manga que se ensancha hacia el puño y manopla.
  for (const lado of [1, -1]) {
    const x = lado * (xH + 0.035);
    const [brazo, ante] = lado > 0 ? [H.brazoI, H.anteI] : [H.brazoD, H.anteD];
    const ancho = a.prenda.manga;
    const anillo = (y: number, r: number, h: number): Anillo => ({ c: [x, y, 0], rx: r * cx, rz: r * cx, h, v: (1.215 - y) / 0.515 });
    m.grupoNuevo();
    m.tubo(
      [
        anillo(1.215, 0.058, brazo),
        anillo(1.08, 0.058 + 0.012 * ancho, brazo),
        anillo(0.96, 0.05 + 0.022 * ancho, brazo),
        anillo(0.94, 0.05 + 0.024 * ancho, ante),
        anillo(0.8, 0.045 + 0.04 * ancho, ante),
        anillo(0.7, 0.04 + 0.05 * ancho, ante),
      ],
      5,
      ZONAS.manga,
      { tapaArriba: true, tapaAbajo: true },
    );
    m.grupoNuevo();
    m.tubo([{ c: [x, 0.71, 0], rx: 0.04, rz: 0.04, h: ante }, { c: [x, 0.65, 0], rx: 0.042, rz: 0.036, h: ante }, { c: [x, 0.615, 0], rx: 0.022, rz: 0.02, h: ante }], 5, ZONAS.piel);
  }

  // Cabeza: media vuelta de frente con la cara proyectada en plano y media de espalda en piel lisa.
  const yC = Y.cabeza;
  const perfil: [number, number][] = [[0.15, 0.22], [0.125, 0.62], [0.06, 0.93], [-0.02, 1], [-0.085, 0.88], [-0.142, 0.5]];
  const cabeza = (rel: number, k: number): Anillo => ({ c: [0, yC + rel, rel < -0.05 ? 0.012 : 0], rx: CABEZA.rx * k, rz: CABEZA.rz * k, h: H.cabeza });
  const anillosCabeza = perfil.map(([rel, k]) => cabeza(rel, k));
  m.grupoNuevo();
  const cara = m.tubo(anillosCabeza, 4, ZONAS.cara, {
    arco: [0.25, 0.75],
    tapaAbajo: true,
    uv: (p) => [0.5 + p[0] / (CABEZA.rx * 2.06), (yC + 0.15 - p[1]) / CABEZA.alto],
  });
  m.tubo(anillosCabeza, 4, ZONAS.piel, { arco: [0.75, 1.25], tapaAbajo: true });

  construirPelo(m, a);

  if (a.orejas === 'puntiagudas') {
    for (const lado of [1, -1]) {
      m.hoja(
        [lado * CABEZA.rx * 0.96, yC + 0.005, -0.01],
        [lado * CABEZA.rx * 0.9, yC - 0.075, 0.01],
        [lado * (CABEZA.rx + 0.17), yC + 0.07, -0.05],
        ZONAS.piel,
        [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]],
        H.cabeza,
      );
    }
  }

  construirAccesorio(m, a, xH);
  return { malla: m, cara };
}

/** Pelo: casquete con la línea del pelo más alta en la frente, flequillo en cuñas y masa trasera según el peinado. */
function construirPelo(m: Malla, a: Aspecto): void {
  const yC = Y.cabeza;
  const capucha = a.peinado === 'capucha';
  const zona = capucha ? ZONAS.ropa : ZONAS.pelo;
  const rx = CABEZA.rx * 1.14;
  const rz = CABEZA.rz * 1.15;
  const lineaFrente = capucha ? 0.105 : 0.088;
  const lineaAtras = a.peinado === 'corto' || a.peinado === 'pincho' ? -0.1 : -0.13;
  const frente = (u: number): number => (1 - Math.cos(u * Math.PI * 2)) / 2;
  const linea = (u: number): number => lineaAtras + (lineaFrente - lineaAtras) * suave(0.5, 0.86, frente(u));
  /** Punto del casquete a una altura relativa al centro de la cabeza. */
  const enCasquete = (u: number, rel: number, k = 1): P3 => {
    const r = Math.sqrt(Math.max(0.03, 1 - (rel / 0.176) ** 2)) * k;
    const ang = u * Math.PI * 2;
    return [-Math.sin(ang) * rx * r, yC + 0.012 + rel, -Math.cos(ang) * rz * r - 0.006];
  };
  const filas = 5;
  m.grupoNuevo();
  m.tubo(
    Array.from({ length: filas }, (): Anillo => ({ c: [0, yC, 0], rx, rz, h: H.cabeza })),
    8,
    capucha ? ZONAS.ropa : sub(ZONAS.pelo, 0, 0.6),
    {
      deforma: (p, u, i) => {
        const t = i / (filas - 1);
        const q = enCasquete(u, 0.17 - t * (0.17 - linea(u)));
        p[0] = q[0];
        p[1] = q[1];
        p[2] = q[2];
      },
    },
  );

  // Flequillo: cuñas que cuelgan de la línea del pelo.
  const cunas: [number, number, number][] = []; // [u inicial, u final, altura de la punta]
  if (a.flequillo === 'recto') for (let i = 0; i < 5; i++) cunas.push([0.31 + i * 0.076, 0.31 + (i + 1) * 0.076, i % 2 === 0 ? 0.03 : 0.042]);
  else if (a.flequillo === 'abierto') cunas.push([0.28, 0.4, -0.005], [0.38, 0.47, 0.04], [0.53, 0.62, 0.04], [0.6, 0.72, -0.005]);
  else if (a.flequillo === 'lateral') cunas.push([0.28, 0.42, -0.03], [0.4, 0.52, 0.0], [0.5, 0.62, 0.03], [0.6, 0.72, 0.045]);
  for (const [ua, ub, punta] of cunas) {
    const um = (ua + ub) / 2;
    m.hoja(enCasquete(ua, linea(ua) + 0.012, 1.01), enCasquete(um, punta, 1.05), enCasquete(ub, linea(ub) + 0.012, 1.01), ZONAS.pelo, [[0.1, 0.55], [0.5, 0.98], [0.9, 0.55]], H.cabeza);
  }

  // Masa trasera y lateral.
  const cortina = (hasta: number, anchoFinal: number, atras: number): void => {
    const pasos = Math.max(2, Math.round(-hasta / 0.16) + 1);
    m.grupoNuevo();
    m.tubo(
      Array.from({ length: pasos }, (_, i): Anillo => {
        const t = i / (pasos - 1);
        const k = 1.0 + (anchoFinal - 1) * t;
        return { c: [0, yC - 0.02 + (hasta + 0.02) * t, -0.01 - atras * t], rx: rx * k, rz: rz * (1 + (anchoFinal - 1) * t * 0.6), h: H.cabeza, v: 0.3 + 0.7 * t };
      }),
      6,
      ZONAS.pelo,
      { arco: [-0.3, 0.3], dobleCara: true },
    );
  };
  const mechon = (desde: P3, hasta: P3, r: number): void => {
    m.grupoNuevo();
    const medio: P3 = [(desde[0] + hasta[0]) / 2 + (hasta[0] - desde[0]) * 0.25, (desde[1] + hasta[1]) / 2 + 0.02, (desde[2] + hasta[2]) / 2];
    m.tubo(
      [
        { c: desde, rx: r * 0.8, rz: r * 0.8, h: H.cabeza, v: 0.3 },
        { c: medio, rx: r, rz: r, h: H.cabeza, v: 0.6 },
        { c: hasta, rx: r * 0.25, rz: r * 0.25, h: H.cabeza, v: 1 },
      ],
      4,
      ZONAS.pelo,
      { tapaArriba: true },
    );
  };
  if (a.peinado === 'bob' || a.peinado === 'coletas' || a.peinado === 'coleta') cortina(-0.19, 1.1, 0);
  if (a.peinado === 'melena') cortina(-0.34, 1.12, 0.02);
  if (a.peinado === 'largo') cortina(-0.72, 0.92, 0.05);
  if (a.peinado === 'coletas') for (const lado of [1, -1]) mechon([lado * 0.15, yC + 0.05, -0.04], [lado * 0.27, yC - 0.42, -0.03], 0.065);
  if (a.peinado === 'coleta') mechon([0, yC + 0.06, -0.15], [0, yC - 0.45, -0.2], 0.07);
  if (a.peinado === 'pincho') {
    // Mechones de punta: pocos y grandes, para que se lean en la silueta.
    const puntas: [number, number, number][] = [[0.5, 0.13, 0.11], [0.36, 0.1, 0.1], [0.64, 0.1, 0.1], [0.2, 0.06, 0.12], [0.8, 0.06, 0.12], [0, 0.08, 0.13], [0.1, -0.04, 0.1], [0.9, -0.04, 0.1]];
    for (const [u, rel, largo] of puntas) {
      const base = enCasquete(u, rel, 0.9);
      const fuera = enCasquete(u, rel + 0.05, 1);
      const punta: P3 = [base[0] + (fuera[0] - 0) * largo * 5.5, base[1] + largo * 0.75, base[2] + (fuera[2] - 0) * largo * 5.5];
      m.grupoNuevo();
      m.tubo(
        [{ c: punta, rx: 0.004, rz: 0.004, h: H.cabeza, v: 0.25 }, { c: base, rx: 0.062, rz: 0.062, h: H.cabeza, v: 0.6 }],
        3,
        ZONAS.pelo,
      );
    }
  }
}

function construirAccesorio(m: Malla, a: Aspecto, xH: number): void {
  if (a.accesorio === 'maza') {
    // Maza cruzada a la espalda.
    m.grupoNuevo();
    m.tubo([{ c: [0.2, 1.42, -0.17], rx: 0.02, rz: 0.02, h: H.torso }, { c: [-0.17, 0.82, -0.17], rx: 0.022, rz: 0.022, h: H.torso }], 4, ZONAS.madera, { tapaAbajo: true });
    m.caja([0.22, 1.47, -0.17], [0.19, 0.2, 0.17], ZONAS.metal, H.torso, (p) => {
      p[0] += (p[1] - 1.47) * 0.5;
    });
    m.caja([0.22, 1.47, -0.17], [0.25, 0.06, 0.22], ZONAS.oscuro, H.torso, (p) => {
      p[0] += (p[1] - 1.47) * 0.5;
    });
  } else if (a.accesorio === 'baston') {
    // Bastón en la mano derecha (la del lado −x), con un orbe de luz.
    const x = -(xH + 0.1);
    const z = 0.2;
    m.grupoNuevo();
    m.tubo([{ c: [x, 1.6, z], rx: 0.016, rz: 0.016, h: H.torso }, { c: [x, 0.04, z], rx: 0.014, rz: 0.014, h: H.torso }], 4, ZONAS.madera, { tapaAbajo: true });
    m.grupoNuevo();
    m.tubo(
      [[0.075, 0.02], [0.045, 0.062], [0, 0.078], [-0.045, 0.062], [-0.075, 0.02]].map(([dy, r]): Anillo => ({ c: [x, 1.68 + dy!, z], rx: r!, rz: r!, h: H.torso })),
      6,
      ZONAS.brillo,
    );
    m.caja([x, 1.6, z], [0.07, 0.03, 0.07], ZONAS.ropa2, H.torso);
  } else if (a.accesorio === 'bufanda') {
    m.grupoNuevo();
    m.tubo([{ c: [0, 1.325, 0], rx: 0.085, rz: 0.085, h: H.torso }, { c: [0, 1.28, 0], rx: 0.115, rz: 0.11, h: H.torso }, { c: [0, 1.225, 0], rx: 0.1, rz: 0.1, h: H.torso }], 6, ZONAS.ropa2);
    m.caja([0.06, 1.08, -0.135], [0.085, 0.3, 0.025], ZONAS.ropa2, H.torso);
  }
}

function crearEsqueleto(xH: number): THREE.Bone[] {
  const hueso = (x: number, y: number, z: number, padre?: THREE.Bone): THREE.Bone => {
    const b = new THREE.Bone();
    b.position.set(x, y, z);
    padre?.add(b);
    return b;
  };
  const cadera = hueso(0, Y.cadera, 0);
  const torso = hueso(0, Y.torso - Y.cadera, 0, cadera);
  const cabeza = hueso(0, Y.cuello - Y.torso, 0, torso);
  const huesos = [cadera, torso, cabeza];
  for (const lado of [1, -1]) {
    const brazo = hueso(lado * (xH + 0.035), Y.hombro - Y.torso, 0, torso);
    huesos.push(brazo, hueso(0, Y.codo - Y.hombro, 0, brazo));
  }
  for (const lado of [1, -1]) {
    const muslo = hueso(lado * X_PIERNA, 0, 0, cadera);
    huesos.push(muslo, hueso(0, Y.rodilla - Y.cadera, 0, muslo));
  }
  return huesos;
}

class FiguraGenerada implements FiguraHeroe {
  readonly raiz = new THREE.Group();
  readonly altura: number;
  readonly triangulos: number;
  /** Desfase para que varias figuras no respiren ni parpadeen a la vez. */
  fase = Math.random() * 10;
  private readonly cuerpo = new THREE.Group();
  private readonly huesos: THREE.Bone[];
  private readonly geometria: THREE.BufferGeometry;
  private readonly textura: THREE.CanvasTexture;
  private readonly materiales: THREE.Material[] = [];
  private readonly uvBase: Float32Array;
  private readonly cara: [number, number];
  private anim: Animacion = 'respirar';
  private tAnim = 0;
  private t = 0;
  private expresionBase: Expresion = 'neutra';
  private expresionVista: Expresion = 'neutra';
  private proximoParpadeo = 2;

  constructor(
    private readonly aspecto: Aspecto,
    opciones: OpcionesFigura,
  ) {
    const { malla, cara } = construirCuerpo(aspecto);
    this.cara = cara;
    this.geometria = malla.geometria();
    this.triangulos = malla.triangulos;
    this.uvBase = new Float32Array((this.geometria.getAttribute('uv') as THREE.BufferAttribute).array);

    this.textura = new THREE.CanvasTexture(pintarAtlas(aspecto, { variante: opciones.variante, escala: opciones.pixel ? 1 : 4 }));
    this.textura.colorSpace = THREE.SRGBColorSpace;
    if (opciones.pixel) {
      this.textura.magFilter = this.textura.minFilter = THREE.NearestFilter;
      this.textura.generateMipmaps = false;
    }
    const material = new THREE.MeshToonMaterial({ map: this.textura, gradientMap: rampaDosTonos() });
    this.materiales.push(material);

    const xH = (datos.proporciones.hombros / 2) * aspecto.hombros * aspecto.complexion;
    this.huesos = crearEsqueleto(xH);
    const esqueleto = new THREE.Skeleton(this.huesos);
    const piel = new THREE.SkinnedMesh(this.geometria, material);
    piel.add(this.huesos[0]!);
    piel.bind(esqueleto);
    piel.castShadow = true;
    piel.receiveShadow = true;
    piel.frustumCulled = false;
    this.cuerpo.add(piel);

    if (opciones.contorno) {
      // Contorno fino: la misma malla vista por dentro y empujada hacia fuera por sus normales.
      const borde = new THREE.MeshBasicMaterial({ color: '#2b211f', side: THREE.BackSide });
      borde.onBeforeCompile = (s) => {
        s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * 0.011;');
      };
      this.materiales.push(borde);
      const contorno = new THREE.SkinnedMesh(this.geometria, borde);
      contorno.bind(esqueleto, piel.bindMatrix);
      contorno.frustumCulled = false;
      this.cuerpo.add(contorno);
    }

    this.raiz.add(this.cuerpo);
    this.raiz.scale.setScalar(aspecto.altura);
    this.altura = (datos.proporciones.altura + (aspecto.peinado === 'pincho' ? 0.08 : 0.02)) * aspecto.altura;
    this.actualizar(0);
  }

  animar(nombre: Animacion): void {
    if (this.anim === nombre) return;
    this.anim = nombre;
    this.tAnim = 0;
  }

  expresion(nombre: Expresion): void {
    this.expresionBase = nombre;
  }

  private verCara(e: Expresion): void {
    if (e === this.expresionVista) return;
    this.expresionVista = e;
    const celda = celdaCara(e);
    Malla.desplazarUV(this.geometria, this.cara, this.uvBase, celda.x, celda.y);
  }

  actualizar(dt: number): void {
    this.t += dt;
    this.tAnim += dt;
    const t = this.t + this.fase;
    const amp = this.aspecto.amplitud;
    const [cadera, torso, cabeza, brazoI, anteI, brazoD, anteD, musloI, piernaI, musloD, piernaD] = this.huesos as [THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone];
    for (const h of this.huesos) h.rotation.set(0, 0, 0);
    this.cuerpo.position.set(0, 0, 0);
    this.cuerpo.rotation.set(0, 0, 0);
    cadera.position.y = Y.cadera;

    // Respirar: siempre de fondo.
    const aire = Math.sin(t * 1.9);
    torso.scale.set(1, 1 + aire * 0.012, 1 + aire * 0.015);
    cabeza.rotation.set(-this.aspecto.barbilla + Math.sin(t * 0.7) * 0.025, Math.sin(t * 0.43) * 0.06, Math.sin(t * 0.9) * 0.02);
    const sujeta = this.aspecto.accesorio === 'baston';
    brazoI.rotation.z = 0.16 + aire * 0.01;
    brazoD.rotation.z = -0.16 - aire * 0.01;
    anteI.rotation.x = -0.12;
    anteD.rotation.x = -0.12;
    if (sujeta) {
      brazoD.rotation.x = -0.35;
      anteD.rotation.x = -0.75;
    }
    let cara = this.expresionBase;

    if (this.anim === 'andar') {
      const f = this.tAnim * 8.5;
      const paso = Math.sin(f);
      musloI.rotation.x = -paso * 0.55 * amp;
      musloD.rotation.x = paso * 0.55 * amp;
      piernaI.rotation.x = (1 - Math.cos(f - 0.9)) * 0.38;
      piernaD.rotation.x = (1 + Math.cos(f - 0.9)) * 0.38;
      brazoI.rotation.x = paso * 0.42 * amp;
      if (!sujeta) brazoD.rotation.x = -paso * 0.42 * amp;
      anteI.rotation.x = -0.3;
      cadera.position.y = Y.cadera + Math.abs(Math.cos(f)) * 0.022;
      torso.rotation.x = 0.05;
    } else if (this.anim === 'saludar') {
      brazoI.rotation.z = 2.55;
      anteI.rotation.x = 0;
      anteI.rotation.z = 0.25 + Math.sin(this.tAnim * 11) * 0.4 * amp;
      cabeza.rotation.z += 0.08;
      cara = 'sonrisa';
    } else if (this.anim === 'celebrar') {
      const salto = Math.abs(Math.sin(this.tAnim * 6.5));
      this.cuerpo.position.y = salto * 0.14;
      brazoI.rotation.z = 2.7 - salto * 0.2;
      if (!sujeta) brazoD.rotation.z = -2.7 + salto * 0.2;
      anteI.rotation.x = 0;
      musloI.rotation.x = musloD.rotation.x = -(1 - salto) * 0.25;
      piernaI.rotation.x = piernaD.rotation.x = (1 - salto) * 0.5;
      cadera.position.y = Y.cadera - (1 - salto) * 0.03;
      cara = 'sonrisa';
    } else if (this.anim === 'lesionado') {
      // Tumbado boca arriba, con la respiración lenta.
      this.cuerpo.rotation.x = -Math.PI / 2;
      this.cuerpo.position.y = 0.14;
      torso.scale.set(1, 1, 1 + Math.sin(t * 1.1) * 0.03);
      brazoI.rotation.z = 0.1;
      brazoD.rotation.z = -0.1;
      cabeza.rotation.set(0, 0.25, 0);
      cara = Math.sin(t * 0.6) > 0.7 ? 'dolor' : 'parpadeo';
    }

    // Parpadeo.
    if (this.t > this.proximoParpadeo) this.proximoParpadeo = this.t + 3 + Math.random() * 3;
    if (this.proximoParpadeo - this.t < 0.12 && (cara === 'neutra' || cara === 'seria')) cara = 'parpadeo';
    this.verCara(cara);
  }

  liberar(): void {
    this.geometria.dispose();
    this.textura.dispose();
    for (const m of this.materiales) m.dispose();
    this.raiz.removeFromParent();
  }
}

/** AllBlack: tres figuras iguales que se mueven casi a la vez. */
class FiguraTrio implements FiguraHeroe {
  readonly raiz = new THREE.Group();
  readonly altura: number;
  readonly triangulos: number;
  private readonly figuras: FiguraGenerada[];

  constructor(aspecto: Aspecto, opciones: OpcionesFigura) {
    const ojos = aspecto.ojosTrio ?? [aspecto.ojos, aspecto.ojos, aspecto.ojos];
    const alturas = aspecto.alturasTrio ?? [1.05, 0.98, 0.92];
    const sitios: [number, number][] = [[0, 0.16], [-0.42, -0.2], [0.42, -0.24]];
    this.figuras = sitios.map(([x, z], i) => {
      const f = new FiguraGenerada({ ...aspecto, forma: 'humana', ojos: ojos[i] ?? aspecto.ojos, altura: alturas[i] ?? 1 }, opciones);
      f.raiz.position.set(x, 0, z);
      f.fase = i * 0.18;
      this.raiz.add(f.raiz);
      return f;
    });
    this.altura = Math.max(...this.figuras.map((f) => f.altura));
    this.triangulos = this.figuras.reduce((s, f) => s + f.triangulos, 0);
  }
  animar(nombre: Animacion): void {
    for (const f of this.figuras) f.animar(nombre);
  }
  expresion(nombre: Expresion): void {
    for (const f of this.figuras) f.expresion(nombre);
  }
  actualizar(dt: number): void {
    for (const f of this.figuras) f.actualizar(dt);
  }
  liberar(): void {
    for (const f of this.figuras) f.liberar();
    this.raiz.removeFromParent();
  }
}

/** Figura generada por código a partir de un aspecto. */
export function figuraDesdeAspecto(aspecto: Aspecto, opciones: OpcionesFigura = OPCIONES_POR_DEFECTO): FiguraHeroe {
  return aspecto.forma === 'trio' ? new FiguraTrio(aspecto, opciones) : new FiguraGenerada(aspecto, opciones);
}
