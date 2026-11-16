// Constructor de mallas low poly con huesos (docs/direccion-de-arte.md, apartado 3).
// Las piezas son «tubos» de anillos y cajas. Cada vértice sigue a un solo hueso (skinning rígido).

import * as THREE from 'three';
import { LADO, type Zona } from '../texturas/atlas';

export type P3 = [number, number, number];

export interface Anillo {
  c: P3;
  rx: number;
  rz: number;
  /** Hueso al que se pega este anillo. */
  h: number;
  /** Posición vertical en la textura (0 arriba, 1 abajo). Por defecto, repartida. */
  v?: number;
}

export interface OpcionesTubo {
  tapaArriba?: boolean;
  tapaAbajo?: boolean;
  /** Tramo de vuelta que se construye, en vueltas: 0 es la espalda y 0,5 el frente. Por defecto, entera. */
  arco?: [number, number];
  /** Cambia la posición de un vértice (u en vueltas, i = anillo). */
  deforma?: (p: P3, u: number, i: number) => void;
  /** Coordenadas de textura propias (0–1 dentro de la zona). */
  uv?: (p: P3, u: number, i: number) => [number, number];
  /** También se ve por dentro (pelo suelto, faldones). */
  dobleCara?: boolean;
}

export class Malla {
  private pos: number[] = [];
  private uvs: number[] = [];
  private idx: number[] = [];
  private huesos: number[] = [];
  private grupos: number[] = [];
  private grupo = 0;

  get vertices(): number {
    return this.pos.length / 3;
  }
  get triangulos(): number {
    return this.idx.length / 3;
  }

  /** Las piezas de grupos distintos no comparten sombreado suave. */
  grupoNuevo(): void {
    this.grupo++;
  }

  private vert(p: P3, z: Zona, tu: number, tv: number, h: number): number {
    this.pos.push(p[0], p[1], p[2]);
    // Medio píxel de margen para que no se cuele la zona vecina.
    const x = z.x + 0.5 + tu * (z.w - 1);
    const y = z.y + 0.5 + tv * (z.h - 1);
    this.uvs.push(x / LADO, 1 - y / LADO);
    this.huesos.push(h);
    this.grupos.push(this.grupo);
    return this.vertices - 1;
  }

  /** Tubo de anillos, de arriba abajo. Devuelve el rango de vértices creados. */
  tubo(anillos: Anillo[], lados: number, zona: Zona, o: OpcionesTubo = {}): [number, number] {
    const inicio = this.vertices;
    this.tuboUnaCara(anillos, lados, zona, o, false);
    if (o.dobleCara) {
      this.grupoNuevo();
      this.tuboUnaCara(anillos, lados, zona, o, true);
      this.grupoNuevo();
    }
    return [inicio, this.vertices];
  }

  private tuboUnaCara(anillos: Anillo[], lados: number, zona: Zona, o: OpcionesTubo, invertir: boolean): void {
    const [u0, u1] = o.arco ?? [0, 1];
    const n = anillos.length;
    const base = this.vertices;
    anillos.forEach((a, i) => {
      for (let j = 0; j <= lados; j++) {
        const u = u0 + ((u1 - u0) * j) / lados;
        const ang = u * Math.PI * 2;
        // Visto de frente, la textura avanza de izquierda a derecha igual que en el atlas.
        const p: P3 = [a.c[0] - Math.sin(ang) * a.rx, a.c[1], a.c[2] - Math.cos(ang) * a.rz];
        o.deforma?.(p, u, i);
        const [tu, tv] = o.uv ? o.uv(p, u, i) : [j / lados, a.v ?? i / (n - 1)];
        this.vert(p, zona, tu, tv, a.h);
      }
    });
    const tri = (a: number, b: number, c: number): void => {
      if (invertir) this.idx.push(a, c, b);
      else this.idx.push(a, b, c);
    };
    const fila = lados + 1;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < lados; j++) {
        const a = base + i * fila + j;
        const c = a + fila;
        tri(a, c, a + 1);
        tri(a + 1, c, c + 1);
      }
    }
    const tapa = (i: number, arriba: boolean): void => {
      const a = anillos[i]!;
      const centro = this.vert([a.c[0], a.c[1], a.c[2]], zona, 0.5, a.v ?? i / (n - 1), a.h);
      for (let j = 0; j < lados; j++) {
        const v = base + i * fila + j;
        if (arriba) tri(v, v + 1, centro);
        else tri(v + 1, v, centro);
      }
    };
    if (o.tapaArriba) tapa(0, true);
    if (o.tapaAbajo) tapa(n - 1, false);
  }

  /** Caja centrada en c con tamaño t. Cada cara usa la zona entera. */
  caja(c: P3, t: P3, zona: Zona, h: number, deforma?: (p: P3) => void): void {
    this.grupoNuevo();
    const [x, y, z] = [t[0] / 2, t[1] / 2, t[2] / 2];
    const caras: [P3, P3, P3][] = [
      [[-x, -y, z], [2 * x, 0, 0], [0, 2 * y, 0]],
      [[x, -y, -z], [-2 * x, 0, 0], [0, 2 * y, 0]],
      [[x, -y, z], [0, 0, -2 * z], [0, 2 * y, 0]],
      [[-x, -y, -z], [0, 0, 2 * z], [0, 2 * y, 0]],
      [[-x, y, z], [2 * x, 0, 0], [0, 0, -2 * z]],
      [[-x, -y, -z], [2 * x, 0, 0], [0, 0, 2 * z]],
    ];
    for (const [o, u, v] of caras) {
      const esquina = (fu: number, fv: number): number => {
        const p: P3 = [c[0] + o[0] + u[0] * fu + v[0] * fv, c[1] + o[1] + u[1] * fu + v[1] * fv, c[2] + o[2] + u[2] * fu + v[2] * fv];
        deforma?.(p);
        return this.vert(p, zona, fu, 1 - fv, h);
      };
      const a = esquina(0, 0);
      const b = esquina(1, 0);
      const d = esquina(1, 1);
      const e = esquina(0, 1);
      this.idx.push(a, b, d, a, d, e);
    }
    this.grupoNuevo();
  }

  /** Triángulo suelto visible por las dos caras (flequillo, orejas). */
  hoja(a: P3, b: P3, c: P3, zona: Zona, uvs: [number, number][], h: number): void {
    this.grupoNuevo();
    const i = [a, b, c].map((p, k) => this.vert(p, zona, uvs[k]![0], uvs[k]![1], h));
    this.idx.push(i[0]!, i[1]!, i[2]!);
    this.grupoNuevo();
    const j = [a, b, c].map((p, k) => this.vert(p, zona, uvs[k]![0], uvs[k]![1], h));
    this.idx.push(j[0]!, j[2]!, j[1]!);
    this.grupoNuevo();
  }

  /** Mueve la textura de un rango de vértices (para cambiar de cara sin repintar). */
  static desplazarUV(geometria: THREE.BufferGeometry, rango: [number, number], base: Float32Array, dx: number, dy: number): void {
    const uv = geometria.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = rango[0]; i < rango[1]; i++) uv.setXY(i, base[i * 2]! + dx / LADO, base[i * 2 + 1]! - dy / LADO);
    uv.needsUpdate = true;
  }

  geometria(): THREE.BufferGeometry {
    const n = this.vertices;
    // Normales suaves dentro de cada grupo: se suman las de las caras que comparten posición.
    const suma = new Map<string, THREE.Vector3>();
    const clave = (i: number): string => `${this.grupos[i]}|${Math.round(this.pos[i * 3]! * 500)}|${Math.round(this.pos[i * 3 + 1]! * 500)}|${Math.round(this.pos[i * 3 + 2]! * 500)}`;
    const punto = (i: number): THREE.Vector3 => new THREE.Vector3(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
    for (let t = 0; t < this.idx.length; t += 3) {
      const [a, b, c] = [this.idx[t]!, this.idx[t + 1]!, this.idx[t + 2]!];
      const pa = punto(a);
      const normal = punto(b).sub(pa).cross(punto(c).sub(pa));
      for (const i of [a, b, c]) {
        const k = clave(i);
        const s = suma.get(k);
        if (s) s.add(normal);
        else suma.set(k, normal.clone());
      }
    }
    const normales = new Float32Array(n * 3);
    const indices = new Uint16Array(n * 4);
    const pesos = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const s = (suma.get(clave(i)) ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
      if (s.lengthSq() === 0) s.set(0, 1, 0);
      normales.set([s.x, s.y, s.z], i * 3);
      indices[i * 4] = this.huesos[i]!;
      pesos[i * 4] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(pesos, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
