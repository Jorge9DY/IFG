// Escenario de la sede (docs/direccion-de-arte.md, apartados 5 y 9): texturas pintadas por código, luz de
// ventana con persiana y la sala común. Fase 1: solo la sala de la muestra; las demás salas llegan en la fase 3.

import * as THREE from 'three';
import datos from '../../datos/aspecto.json';
import { luz as aclarar, mezclar, sombra } from '../texturas/atlas';

const E = datos.paleta.escenario;
type Ctx = CanvasRenderingContext2D;

function textura(lado: number, pintar: (c: Ctx, lado: number) => void, repetir?: [number, number]): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  pintar(lienzo.getContext('2d')!, lado);
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repetir);
  }
  return t;
}

/** Ruido determinista para manchas y vetas (no usa el azar de la partida). */
function ruido(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const pintores = {
  baldosas: (c: Ctx, n: number): void => {
    c.fillStyle = E.junta;
    c.fillRect(0, 0, n, n);
    const m = n / 2;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = mezclar(E.suelo, i % 3 === 0 ? '#ffffff' : '#6f7880', 0.04 + ruido(i) * 0.08);
      c.fillRect((i % 2) * m + 1, Math.floor(i / 2) * m + 1, m - 2, m - 2);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect((i % 2) * m + 1, Math.floor(i / 2) * m + 1, m - 2, 1);
    }
  },
  pared: (c: Ctx, n: number): void => {
    c.fillStyle = E.pared;
    c.fillRect(0, 0, n, n);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(40,40,44,${0.03 + ruido(i) * 0.05})`;
      c.fillRect(ruido(i + 50) * n, ruido(i + 90) * n * 0.8, 6 + ruido(i + 7) * 18, 2 + ruido(i + 3) * 6);
    }
    // Zócalo y una grieta.
    c.fillStyle = E.paredSombra;
    c.fillRect(0, n * 0.84, n, n * 0.16);
    c.fillStyle = sombra(E.paredSombra, 0.3);
    c.fillRect(0, n * 0.84, n, 2);
    c.strokeStyle = 'rgba(40,40,44,0.45)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(n * 0.2, 0);
    c.lineTo(n * 0.26, n * 0.18);
    c.lineTo(n * 0.22, n * 0.3);
    c.lineTo(n * 0.3, n * 0.46);
    c.stroke();
  },
  madera: (c: Ctx, n: number): void => {
    c.fillStyle = E.madera;
    c.fillRect(0, 0, n, n);
    const tabla = n / 4;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = mezclar(E.madera, E.maderaSombra, ruido(i + 3) * 0.5);
      c.fillRect(0, i * tabla, n, tabla - 1);
      c.fillStyle = 'rgba(60,45,35,0.35)';
      for (let k = 0; k < 3; k++) c.fillRect(ruido(i * 9 + k) * n, i * tabla + 3 + k * 4, 14 + ruido(k + i) * 20, 1);
    }
  },
  oscura: (c: Ctx, n: number): void => {
    c.fillStyle = E.mueble;
    c.fillRect(0, 0, n, n);
    c.fillStyle = E.muebleSombra;
    c.fillRect(0, n * 0.82, n, n * 0.18);
    c.strokeStyle = aclarar(E.mueble, 0.18);
    c.lineWidth = 2;
    c.strokeRect(5, 5, n - 10, n * 0.7);
  },
  libros: (c: Ctx, n: number): void => {
    c.fillStyle = E.muebleSombra;
    c.fillRect(0, 0, n, n);
    const lomos = ['#3f5f9a', '#5a78b0', '#c9cdd0', '#7a8a9a', '#2f3a55', '#8a6a4a', '#4f6f8a'];
    const balda = n / 4;
    for (let fila = 0; fila < 4; fila++) {
      let x = 2;
      let i = fila * 31;
      while (x < n - 4) {
        const w = 4 + Math.floor(ruido(i) * 5);
        const h = balda - 6 - Math.floor(ruido(i + 5) * 6);
        c.fillStyle = lomos[Math.floor(ruido(i + 11) * lomos.length)] ?? '#3f5f9a';
        c.fillRect(x, (fila + 1) * balda - 3 - h, w, h);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(x + 1, (fila + 1) * balda - 3 - h + 3, w - 2, 1);
        x += w + 1;
        i++;
      }
      c.fillStyle = E.maderaSombra;
      c.fillRect(0, (fila + 1) * balda - 3, n, 3);
    }
  },
  corcho: (c: Ctx, n: number): void => {
    c.fillStyle = E.maderaSombra;
    c.fillRect(0, 0, n, n);
    c.fillStyle = '#b08d62';
    c.fillRect(5, 5, n - 10, n - 10);
    // Tres avisos de misión, como las tres del tablón.
    const papeles: [number, number, string][] = [[12, 14, '#8a9a4b'], [50, 20, '#3fd8e8'], [88, 12, '#b8673a']];
    for (const [x, y, color] of papeles) {
      c.fillStyle = E.papel;
      c.fillRect(x, y, 28, 40);
      c.fillStyle = color;
      c.fillRect(x, y, 28, 6);
      c.fillStyle = '#7a756a';
      for (let k = 0; k < 4; k++) c.fillRect(x + 4, y + 12 + k * 6, 20 - (k % 2) * 6, 2);
      c.fillStyle = '#e8574f';
      c.fillRect(x + 12, y - 2, 4, 4);
    }
    c.fillStyle = E.papel;
    c.fillRect(20, 70, 34, 24);
    c.fillRect(70, 66, 40, 30);
  },
  alfombra: (c: Ctx, n: number): void => {
    c.fillStyle = E.alfombra;
    c.fillRect(0, 0, n, n);
    c.strokeStyle = aclarar(E.alfombra, 0.3);
    c.lineWidth = 3;
    c.strokeRect(8, 8, n - 16, n - 16);
    c.strokeStyle = '#b8673a';
    c.lineWidth = 2;
    c.strokeRect(16, 16, n - 32, n - 32);
  },
  piedra: (c: Ctx, n: number): void => {
    c.fillStyle = '#6f7074';
    c.fillRect(0, 0, n, n);
    const alto = n / 6;
    for (let f = 0; f < 6; f++) {
      for (let k = -1; k < 4; k++) {
        const x = k * (n / 3) + (f % 2) * (n / 6);
        c.fillStyle = mezclar('#77797d', '#55575b', ruido(f * 7 + k));
        c.fillRect(x + 1, f * alto + 1, n / 3 - 2, alto - 2);
      }
    }
  },
};

export interface Sala {
  grupo: THREE.Group;
  /** Luz del fuego, para que parpadee. */
  fuego: THREE.PointLight;
  ancho: number;
  fondo: number;
}

/** Luz de la sede: ambiente frío y un sol cálido de ventana, la única luz con sombras. */
export function crearLuces(escena: THREE.Scene, alcance = 9): THREE.DirectionalLight {
  const L = datos.luz;
  escena.add(new THREE.HemisphereLight(L.cielo, L.suelo, L.ambiente));
  const sol = new THREE.DirectionalLight(L.sol, L.intensidadSol);
  sol.position.set(...(L.direccionSol as [number, number, number])).multiplyScalar(1.6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(L.mapaSombras, L.mapaSombras);
  Object.assign(sol.shadow.camera, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: 40 });
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.015;
  escena.add(sol, sol.target);
  return sol;
}

/** Sala común de la muestra: dos paredes altas con ventanas de persiana y las otras dos cortadas bajas. */
export function construirSalaComun(): Sala {
  const grupo = new THREE.Group();
  const ANCHO = 11;
  const FONDO = 8;
  const ALTO = 3.1;
  const mat = (t: THREE.Texture | string): THREE.MeshLambertMaterial => (typeof t === 'string' ? new THREE.MeshLambertMaterial({ color: t }) : new THREE.MeshLambertMaterial({ map: t }));
  const M = {
    pared: mat(textura(128, pintores.pared)),
    madera: mat(textura(64, pintores.madera)),
    oscura: mat(textura(64, pintores.oscura)),
    libros: mat(textura(128, pintores.libros)),
    corcho: mat(textura(128, pintores.corcho)),
    alfombra: mat(textura(64, pintores.alfombra)),
    piedra: mat(textura(64, pintores.piedra)),
    metal: mat(E.metal),
    papel: mat(E.papel),
    paredLisa: mat(E.paredSombra),
    planta: mat('#5f7a52'),
    fuego: new THREE.MeshBasicMaterial({ color: '#ffb35a' }),
  };
  const caja = (m: THREE.Material, t: [number, number, number], p: [number, number, number], sombras = true): THREE.Mesh => {
    const malla = new THREE.Mesh(new THREE.BoxGeometry(...t), m);
    malla.position.set(...p);
    malla.castShadow = sombras;
    malla.receiveShadow = true;
    grupo.add(malla);
    return malla;
  };

  // Suelo.
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, FONDO), mat(textura(64, pintores.baldosas, [ANCHO / 2, FONDO / 2])));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  grupo.add(suelo);
  caja(M.paredLisa, [ANCHO + 0.4, 0.3, FONDO + 0.4], [0, -0.16, 0], false);

  // Pared del fondo con ventana (hueco de x 0,6 a 3,6 y de y 1 a 2,6) y pared izquierda con otra.
  const zF = -FONDO / 2 - 0.1;
  const xI = -ANCHO / 2 - 0.1;
  caja(M.pared, [ANCHO / 2 + 0.6 + 0.2, ALTO, 0.2], [(-ANCHO / 2 - 0.2 + 0.6) / 2, ALTO / 2, zF]);
  caja(M.pared, [ANCHO / 2 - 3.6, ALTO, 0.2], [(3.6 + ANCHO / 2) / 2, ALTO / 2, zF]);
  caja(M.pared, [3, 1, 0.2], [2.1, 0.5, zF]);
  caja(M.paredLisa, [3, ALTO - 2.6, 0.2], [2.1, (ALTO + 2.6) / 2, zF]);
  // Pared izquierda: ventana grande (z de −2 a 2,4; y de 0,9 a 2,7) por la que entra el sol.
  caja(M.pared, [0.2, ALTO, FONDO / 2 - 2], [xI, ALTO / 2, (-FONDO / 2 - 2) / 2]);
  caja(M.pared, [0.2, ALTO, FONDO / 2 - 2.4], [xI, ALTO / 2, (2.4 + FONDO / 2) / 2]);
  caja(M.pared, [0.2, 0.9, 4.4], [xI, 0.45, 0.2]);
  caja(M.paredLisa, [0.2, ALTO - 2.7, 4.4], [xI, (ALTO + 2.7) / 2, 0.2]);
  caja(M.paredLisa, [0.16, 1.8, 0.08], [xI, 1.8, 0.2]);
  // Persianas: lamas reales que proyectan su sombra. Detrás, el cielo claro.
  const cielo = new THREE.MeshBasicMaterial({ color: '#dfe7ea' });
  caja(cielo, [3, 1.6, 0.02], [2.1, 1.8, zF - 0.12], false).castShadow = false;
  caja(cielo, [0.02, 1.8, 4.4], [xI - 0.12, 1.8, 0.2], false).castShadow = false;
  for (let y = 1.06; y < 2.6; y += 0.15) caja(M.papel, [3, 0.02, 0.1], [2.1, y, zF]).rotation.x = 0.5;
  for (let y = 1.0; y < 2.7; y += 0.21) caja(M.papel, [0.1, 0.025, 4.4], [xI, y, 0.2]);
  // Paredes cortadas del lado de la cámara.
  caja(M.paredLisa, [0.2, 0.3, FONDO + 0.2], [ANCHO / 2 + 0.1, 0.15, 0]);
  caja(M.paredLisa, [ANCHO + 0.4, 0.3, 0.2], [0, 0.15, FONDO / 2 + 0.1]);
  // Techo invisible: solo da sombra, para que el sol entre únicamente por las ventanas.
  const techo = new THREE.Mesh(new THREE.BoxGeometry(ANCHO + 0.4, 0.1, FONDO + 0.4), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  techo.position.set(0, ALTO + 0.05, 0);
  techo.castShadow = true;
  grupo.add(techo);
  // Las paredes cortadas siguen dando sombra, como si estuvieran enteras.
  const fantasmas: [[number, number, number], [number, number, number]][] = [[[ANCHO + 1, ALTO, 0.2], [0, ALTO / 2, FONDO / 2 + 0.1]], [[0.2, ALTO, FONDO + 1], [ANCHO / 2 + 0.1, ALTO / 2, 0]]];
  for (const [t, p] of fantasmas) {
    const fantasma = new THREE.Mesh(new THREE.BoxGeometry(...t), techo.material);
    fantasma.position.set(...p);
    fantasma.castShadow = true;
    grupo.add(fantasma);
  }

  // Tablón de misiones y estantería.
  caja(M.corcho, [2.2, 1.5, 0.08], [-2.6, 1.65, -FONDO / 2 + 0.05]);
  caja(M.libros, [2.2, 2.2, 0.4], [-0.2, 1.1, -FONDO / 2 + 0.22]);

  // Chimenea en el rincón del fondo.
  caja(M.piedra, [1.8, 2.3, 0.7], [4.4, 1.15, -FONDO / 2 + 0.36]);
  caja(M.oscura, [1.0, 0.9, 0.1], [4.4, 0.5, -FONDO / 2 + 0.72], false);
  caja(M.fuego, [0.6, 0.35, 0.05], [4.4, 0.3, -FONDO / 2 + 0.78], false);
  const fuego = new THREE.PointLight(datos.luz.fuego, 10, 6);
  fuego.position.set(4.4, 0.7, -FONDO / 2 + 1.2);
  grupo.add(fuego);

  // Mostrador, mesa con taburetes, alfombra, barril y el cubo de la gotera.
  caja(M.oscura, [3.2, 1, 0.8], [2.4, 0.5, 1.6]);
  caja(M.madera, [3.4, 0.08, 1], [2.4, 1.04, 1.6]);
  caja(M.papel, [0.5, 0.03, 0.36], [1.7, 1.1, 1.6], false).rotation.y = 0.3;
  caja(M.madera, [1.7, 0.1, 1.1], [-2.6, 0.78, 1.2]);
  for (const [x, z] of [[-3.3, 0.8], [-1.9, 0.8], [-3.3, 1.6], [-1.9, 1.6]] as const) caja(M.madera, [0.1, 0.74, 0.1], [x, 0.37, z]);
  for (const [x, z] of [[-2.6, 2.2], [-3.9, 1.2]] as const) caja(M.madera, [0.45, 0.45, 0.45], [x, 0.225, z]);
  const alfombra = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), M.alfombra);
  alfombra.rotation.x = -Math.PI / 2;
  alfombra.position.set(0.6, 0.012, -1.2);
  alfombra.receiveShadow = true;
  grupo.add(alfombra);
  const cilindro = (m: THREE.Material, r: number, alto: number, p: [number, number, number], lados = 7): void => {
    const malla = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.86, alto, lados), m);
    malla.position.set(p[0], p[1] + alto / 2, p[2]);
    malla.castShadow = malla.receiveShadow = true;
    grupo.add(malla);
  };
  cilindro(M.madera, 0.36, 0.85, [-4.7, 0, 3.1]);
  cilindro(M.metal, 0.2, 0.3, [0.2, 0, 2.9], 6);
  // Planta en maceta junto a la ventana.
  cilindro(M.piedra, 0.26, 0.4, [-4.8, 0, -3.3], 6);
  const hojas = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 5), M.planta);
  hojas.position.set(-4.8, 1.05, -3.3);
  hojas.castShadow = true;
  grupo.add(hojas);

  return { grupo, fuego, ancho: ANCHO, fondo: FONDO };
}
