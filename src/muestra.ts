// Muestra de la fase 1 (docs/direccion-de-arte.md): una sala, tres héroes muy distintos y una escena de diálogo.
// Página de prueba aparte (muestra.html); no forma parte del juego ni toca el motor.

import * as THREE from 'three';
import catalogo from './datos/heroes.json';
import historia from './datos/historia.json';
import datos from './datos/aspecto.json';
import type { DatosHeroe, FormaCara } from './escena3d/aspecto';
import { crearFigura, crearMaestro } from './escena3d/fabrica';
import type { Animacion, FiguraHeroe, OpcionesFigura } from './escena3d/figura/figura';
import { construirSalaComun, crearLuces } from './escena3d/sede/escenario';
import { crearNombre, pintarEscena } from './ui/escena';
import './ui/escena.css';

const params = new URLSearchParams(location.search);
const vista = params.get('vista') ?? 'sala';
const opciones: OpcionesFigura = {
  variante: (['A', 'B', 'C'].includes(params.get('cara') ?? '') ? params.get('cara') : 'A') as FormaCara,
  pixel: params.get('pixel') !== '0',
  contorno: params.get('contorno') === '1',
};

const lienzo = document.querySelector<HTMLCanvasElement>('#lienzo')!;
const capaNombres = document.querySelector<HTMLElement>('#nombres')!;
const capaEscena = document.querySelector<HTMLElement>('#escena')!;
const pie = document.querySelector<HTMLElement>('#pie')!;

const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#1c1d1f');
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const escena = new THREE.Scene();
const sala = construirSalaComun();
escena.add(sala.grupo);
const sol = crearLuces(escena);

const camara = new THREE.PerspectiveCamera(datos.camara.maqueta.campo, 1, 0.1, 100);

function heroe(id: string): DatosHeroe & { nombre: string } {
  const h = catalogo.heroes.find((x) => x.id === id)!;
  return { id: h.id, catalogo: h.id, nombre: h.nombre, clase: h.clase, genero: h.genero, rasgos: h.rasgos, gremio: h.gremio };
}

interface Actor {
  figura: FiguraHeroe;
  nombre?: HTMLElement;
  /** Si anda en círculo (prueba de rendimiento): centro, radio y fase. */
  ronda?: { x: number; z: number; r: number; fase: number };
}
const actores: Actor[] = [];
/** Personaje junto al que se coloca el bocadillo de la escena. */
let anclaBocadillo: Actor | null = null;

function poner(figura: FiguraHeroe, x: number, z: number, mira: number, nombre?: string, rango?: string): Actor {
  figura.raiz.position.set(x, 0, z);
  figura.raiz.rotation.y = mira;
  escena.add(figura.raiz);
  const actor: Actor = { figura };
  if (nombre) actor.nombre = crearNombre(capaNombres, nombre, rango);
  actores.push(actor);
  return actor;
}

/** Cámara de maqueta: toda la sala a la vista, desde arriba y en diagonal. */
function camaraMaqueta(distancia: number, objetivo = new THREE.Vector3(0, 0.6, 0)): void {
  const { campo, picado, giro } = datos.camara.maqueta;
  const p = THREE.MathUtils.degToRad(picado);
  const g = THREE.MathUtils.degToRad(giro);
  camara.fov = campo;
  camara.position.set(objetivo.x + Math.sin(g) * Math.cos(p) * distancia, objetivo.y + Math.sin(p) * distancia, objetivo.z + Math.cos(g) * Math.cos(p) * distancia);
  camara.lookAt(objetivo);
}

const haciaCamara = THREE.MathUtils.degToRad(datos.camara.maqueta.giro);

// Las vistas de estudio (caras, cuerpos y animaciones) no usan la sala: fondo gris liso, como una hoja de modelo.
if (vista === 'caras' || vista === 'cuerpos' || vista === 'animaciones') {
  sala.grupo.visible = false;
  renderer.setClearColor('#8b8e91');
  sol.position.set(-5, 9, 10);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: '#8b8e91' }));
  piso.rotation.x = -Math.PI / 2;
  piso.receiveShadow = true;
  escena.add(piso);
}

if (vista === 'sala' || vista === 'escena') {
  const goblin = poner(crearFigura(heroe('H07'), opciones), -0.5, 0.9, haciaCamara - 0.1, 'HalfGoblin', 'E');
  const lumia = poner(crearFigura(heroe('H05'), opciones), -2.5, -1.3, haciaCamara + 0.1, 'Lumia', 'F');
  poner(crearFigura(heroe('H02'), opciones), 3.3, -1.3, haciaCamara - 0.2, 'AllBlack', 'E');
  const maestro = poner(crearMaestro(opciones), 0.2, 3.0, Math.PI + 0.4);

  if (vista === 'sala') {
    camaraMaqueta(17);
    goblin.figura.animar('saludar');
    void lumia;
  } else {
    // Escena de diálogo: el momento «Media sangre» de HalfGoblin, tal como está en los datos del juego.
    const m = historia.momentos.find((x) => x.id === 'goblin1')!;
    goblin.figura.raiz.position.set(-2.4, 0, -1.2);
    const pos = goblin.figura.raiz.position;
    const E = datos.camara.escena;
    camara.fov = E.campo;
    camara.position.set(pos.x + 0.35, E.altura + 0.4, pos.z + E.distancia + 0.3);
    camara.lookAt(pos.x + 0.12, 0.9, pos.z);
    goblin.figura.raiz.rotation.y = 0.12;
    goblin.figura.expresion('seria');
    // El maestro, de espaldas, en la esquina de abajo a la izquierda del encuadre.
    maestro.figura.raiz.position.set(pos.x - 0.42, 0, pos.z + 1.5);
    maestro.figura.raiz.rotation.y = Math.PI - 0.2;
    lumia.figura.raiz.position.set(1.2, 0, -2.4);
    lumia.figura.raiz.rotation.y = -0.6;
    for (const a of actores) if (a !== goblin) a.nombre?.remove();
    pintarEscena(
      capaEscena,
      { titulo: m.titulo, lugar: 'Sede · Sala común', quien: 'HalfGoblin', texto: m.texto, opciones: m.opciones.map((o) => ({ texto: o.texto })) },
      (i) => {
        goblin.figura.expresion(i === 0 ? 'sonrisa' : 'dolor');
        goblin.figura.animar(i === 0 ? 'celebrar' : 'respirar');
      },
    );
    capaEscena.dataset.ancla = 'H07';
    anclaBocadillo = goblin;
  }
} else if (vista === 'caras') {
  // Las tres variantes de cara, lado a lado, en HalfGoblin y en Lumia.
  const variantes: FormaCara[] = ['A', 'B', 'C'];
  variantes.forEach((v, i) => {
    poner(crearFigura(heroe('H07'), { ...opciones, variante: v }), -2.1 + i * 0.8, 0, 0, `Cara ${v}`);
    poner(crearFigura(heroe('H05'), { ...opciones, variante: v }), 0.5 + i * 0.8, 0, 0, `Cara ${v}`);
  });
  camara.fov = 20;
  camara.position.set(0, 1.4, 9.2);
  camara.lookAt(0, 1.12, 0);
} else if (vista === 'cuerpos') {
  // Los tres héroes y el maestro de cuerpo entero, de frente y de espaldas.
  const fila: [() => FiguraHeroe, string][] = [
    [() => crearFigura(heroe('H07'), opciones), 'HalfGoblin'],
    [() => crearFigura(heroe('H05'), opciones), 'Lumia'],
    [() => crearFigura(heroe('H02'), opciones), 'AllBlack'],
    [() => crearMaestro(opciones), 'Maestro'],
  ];
  fila.forEach(([crear, nombre], i) => {
    poner(crear(), -4.4 + i * 1.3 + (i > 1 ? 0.5 : 0), 0.6, 0.35, nombre);
    poner(crear(), 1.2 + i * 1.1 + (i > 1 ? 0.5 : 0), 0.6, Math.PI - 0.5);
  });
  camara.fov = 27;
  camara.position.set(0.2, 1.5, 13.5);
  camara.lookAt(0.2, 0.85, 0);
} else if (vista === 'animaciones') {
  const lista: Animacion[] = ['respirar', 'andar', 'saludar', 'celebrar', 'lesionado'];
  lista.forEach((anim, i) => {
    const a = poner(crearFigura(heroe(i % 2 === 0 ? 'H07' : 'H05'), opciones), -3.2 + i * 1.5 + (i === 4 ? 0.7 : 0), 0.5, 0.4, anim);
    a.figura.animar(anim);
    if (anim === 'lesionado') a.figura.raiz.rotation.y = Math.PI / 2;
  });
  camara.fov = 24;
  camara.position.set(0, 2.2, 10.5);
  camara.lookAt(0, 0.8, 0);
} else {
  // Rendimiento: 20 figuras andando por la sala.
  const ids = ['H07', 'H05'];
  for (let i = 0; i < 20; i++) {
    const a = poner(crearFigura(heroe(ids[i % 2]!), opciones), 0, 0, 0, i % 2 === 0 ? 'HalfGoblin' : 'Lumia');
    a.ronda = { x: -3 + (i % 5) * 1.6, z: -2.2 + Math.floor(i / 5) * 1.5, r: 0.5 + (i % 3) * 0.15, fase: i };
    a.figura.animar('andar');
  }
  camaraMaqueta(19.5);
}

function redimensionar(): void {
  const { clientWidth: w, clientHeight: h } = lienzo;
  renderer.setSize(w, h, false);
  camara.aspect = w / Math.max(1, h);
  camara.updateProjectionMatrix();
}
window.addEventListener('resize', redimensionar);
redimensionar();

const reloj = new THREE.Timer();
const cabeza = new THREE.Vector3();
let fotogramas = 0;
let tiempoMedido = 0;
const total = actores.reduce((s, a) => s + a.figura.triangulos, 0);

function fotograma(): void {
  reloj.update();
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.getElapsed();
  const antes = performance.now();
  for (const a of actores) {
    if (a.ronda) {
      const ang = t * 0.9 + a.ronda.fase;
      a.figura.raiz.position.set(a.ronda.x + Math.cos(ang) * a.ronda.r, 0, a.ronda.z + Math.sin(ang) * a.ronda.r);
      a.figura.raiz.rotation.y = -ang;
    }
    a.figura.actualizar(dt);
    if (a.nombre) {
      cabeza.copy(a.figura.raiz.position);
      cabeza.y += a.figura.altura;
      cabeza.project(camara);
      a.nombre.style.transform = `translate(-50%, -100%) translate(${((cabeza.x + 1) / 2) * lienzo.clientWidth}px, ${((1 - cabeza.y) / 2) * lienzo.clientHeight}px)`;
    }
  }
  if (anclaBocadillo) {
    const b = capaEscena.querySelector<HTMLElement>('.bocadillo');
    cabeza.copy(anclaBocadillo.figura.raiz.position);
    cabeza.y += anclaBocadillo.figura.altura * 0.8;
    cabeza.project(camara);
    if (b) {
      b.style.left = `${((cabeza.x + 1) / 2) * lienzo.clientWidth + lienzo.clientWidth * 0.09}px`;
      b.style.top = `${((1 - cabeza.y) / 2) * lienzo.clientHeight - 30}px`;
    }
  }
  sala.fuego.intensity = 9 + Math.sin(t * 9) * 1.2 + Math.sin(t * 23) * 0.6;
  renderer.render(escena, camara);
  tiempoMedido += performance.now() - antes;
  fotogramas++;
  if (fotogramas % 60 === 0) {
    const ms = tiempoMedido / 60;
    tiempoMedido = 0;
    const info = { ms: Number(ms.toFixed(2)), llamadas: renderer.info.render.calls, triangulos: renderer.info.render.triangles, figuras: actores.length, triangulosFiguras: total, porFigura: actores.map((x) => x.figura.triangulos) };
    (window as unknown as { __rendimiento: typeof info }).__rendimiento = info;
    pie.textContent = `${vista} · cara ${opciones.variante} · ${opciones.pixel ? 'píxel' : 'suave'}${opciones.contorno ? ' · contorno' : ''} · ${info.ms} ms · ${info.llamadas} llamadas · ${info.triangulos} triángulos`;
  }
  requestAnimationFrame(fotograma);
}
fotograma();
