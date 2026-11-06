// Sede 3D del gremio (fase 4, versión con formas simples).
// El protagonista se mueve con WASD o flechas; al acercarse a un punto de interacción se avisa a la interfaz.

import * as THREE from 'three';

export interface PuntoInteraccion {
  id: string;
  nombre: string;
  accion: string;
  posicion: THREE.Vector3;
}

export interface EventosSede {
  alAcercarse(punto: PuntoInteraccion | null): void;
  alInteractuar(punto: PuntoInteraccion): void;
  /** true mientras un panel está abierto: el personaje no se mueve ni interactúa. */
  estaBloqueada?(): boolean;
}

const ANCHO = 16;
const FONDO = 12;
const VELOCIDAD = 4.5; // unidades por segundo
const RADIO_JUGADOR = 0.35;
const DISTANCIA_INTERACCION = 1.8;
const EJE_Y = new THREE.Vector3(0, 1, 0);
const GIRO_CAMARA = Math.atan2(14, 16);

interface Obstaculo {
  min: THREE.Vector2;
  max: THREE.Vector2;
}

export function iniciarSede(canvas: HTMLCanvasElement, eventos: EventosSede): () => void {
  // Fondo transparente: la página pinta el negro de alrededor y recorta la habitación.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;

  const escena = new THREE.Scene();

  // Cámara isométrica fija que encuadra toda la habitación.
  const VISTA = 9.5;
  const camara = new THREE.OrthographicCamera(-VISTA, VISTA, VISTA, -VISTA, 0.1, 100);
  camara.position.set(14, 15, 16);
  camara.lookAt(0, 0.4, 0);

  // Estilo de dibujo animado: sombreado en 3 tonos y contorno negro.
  const tonos = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  tonos.minFilter = THREE.NearestFilter;
  tonos.magFilter = THREE.NearestFilter;
  tonos.needsUpdate = true;
  const toon = (color: string, mapa?: THREE.Texture): THREE.MeshToonMaterial =>
    new THREE.MeshToonMaterial({ color, gradientMap: tonos, ...(mapa ? { map: mapa } : {}) });
  const materialContorno = new THREE.MeshBasicMaterial({ color: '#141414', side: THREE.BackSide });
  const contorno = (malla: THREE.Mesh, grosor = 0.06): void => {
    const borde = new THREE.Mesh(malla.geometry, materialContorno);
    malla.geometry.computeBoundingBox();
    const caja = malla.geometry.boundingBox!;
    const tam = new THREE.Vector3();
    caja.getSize(tam);
    borde.scale.set(1 + grosor / Math.max(tam.x, 0.01), 1 + grosor / Math.max(tam.y, 0.01), 1 + grosor / Math.max(tam.z, 0.01));
    malla.add(borde);
  };

  // Luces: ambiente frío y un foco cálido sobre el centro, como en un escenario.
  escena.add(new THREE.HemisphereLight('#dfe8e2', '#3a3f3c', 1.1));
  const foco = new THREE.SpotLight('#fff3dc', 60, 30, Math.PI / 5, 0.6, 1.2);
  foco.position.set(0, 12, 2);
  foco.target.position.set(0, 0, 0);
  escena.add(foco, foco.target);
  const sol = new THREE.DirectionalLight('#ffe2b8', 0.9);
  sol.position.set(-6, 12, 6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  escena.add(sol);
  const fuego = new THREE.PointLight('#ff8a3d', 18, 9);
  fuego.position.set(5.5, 1.2, -4.8);
  escena.add(fuego);

  // Suelo de baldosas claras con cuadrícula.
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d')!;
  ctx.fillStyle = '#c9d0d4';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#9a8fa6';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 64, 64);
  const baldosas = new THREE.CanvasTexture(lienzo);
  baldosas.wrapS = baldosas.wrapT = THREE.RepeatWrapping;
  baldosas.repeat.set(ANCHO, FONDO);
  baldosas.colorSpace = THREE.SRGBColorSpace;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO, FONDO), toon('#ffffff', baldosas));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  const materialPared = toon('#7d8a80');
  const pared = (ancho: number, x: number, z: number, rotacion: number): void => {
    const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, 3, 0.3), materialPared);
    malla.position.set(x, 1.5, z);
    malla.rotation.y = rotacion;
    malla.receiveShadow = true;
    contorno(malla);
    escena.add(malla);
  };
  pared(ANCHO, 0, -FONDO / 2, 0);
  pared(FONDO, -ANCHO / 2, 0, Math.PI / 2);
  pared(FONDO, ANCHO / 2, 0, Math.PI / 2);

  // Mobiliario y puntos de interacción (formas provisionales hasta tener assets).
  const obstaculos: Obstaculo[] = [];
  const puntos: PuntoInteraccion[] = [];
  const caja = (color: string, tam: [number, number, number], x: number, z: number, solido = true): THREE.Mesh => {
    const malla = new THREE.Mesh(new THREE.BoxGeometry(...tam), toon(color));
    malla.position.set(x, tam[1] / 2, z);
    malla.castShadow = true;
    malla.receiveShadow = true;
    contorno(malla);
    escena.add(malla);
    if (solido) {
      obstaculos.push({
        min: new THREE.Vector2(x - tam[0] / 2, z - tam[2] / 2),
        max: new THREE.Vector2(x + tam[0] / 2, z + tam[2] / 2),
      });
    }
    return malla;
  };
  const punto = (id: string, nombre: string, accion: string, x: number, z: number): void => {
    puntos.push({ id, nombre, accion, posicion: new THREE.Vector3(x, 0, z) });
  };

  caja('#e9e4d6', [2.2, 1.6, 0.2], -3, -5.75); // tablón de anuncios
  punto('tablon', 'Tablón de misiones', 'Lanzar misiones', -3, -5.2);
  caja('#3b3e41', [3.5, 1, 0.9], 0, 3.2); // mostrador
  punto('mostrador', 'Mostrador', 'Mercado de héroes', 0, 2.2);
  caja('#3b3f3d', [1.8, 1.4, 0.8], 5.5, -5.4); // chimenea
  const recepcionista = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 1, 4, 12),
    toon('#f2a33a'),
  );
  recepcionista.position.set(4.2, 0.82, -4.2);
  recepcionista.castShadow = true;
  contorno(recepcionista, 0.08);
  escena.add(recepcionista);
  obstaculos.push({ min: new THREE.Vector2(3.85, -4.55), max: new THREE.Vector2(4.55, -3.85) });
  punto('recepcion', 'Recepción', 'Mejorar instalaciones', 4.2, -3.4);
  caja('#2b2b2b', [0.2, 2.2, 1.4], -7.75, -2); // puerta de los dormitorios
  punto('dormitorios', 'Dormitorios', 'Ver tus héroes', -7, -2);
  caja('#4e6b5a', [0.2, 1.4, 1.8], 7.75, 1); // pizarra de la Asociación
  punto('pizarra', 'Pizarra de la Asociación', 'Ver clasificación', 7, 1);
  punto('puerta', 'Puerta de la sede', 'Finalizar día', 0, 5.4);
  caja('#9aa5a0', [1.6, 0.8, 1.6], -4, 1.5); // mesa vacía
  caja('#9aa5a0', [1.6, 0.8, 1.6], 3.5, 0); // mesa vacía

  // Marcadores en el suelo para ver los puntos de interacción.
  const materialMarca = new THREE.MeshBasicMaterial({ color: '#3fd8e8', transparent: true, opacity: 0.7 });
  for (const p of puntos) {
    const marca = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), materialMarca);
    marca.rotation.x = -Math.PI / 2;
    marca.position.set(p.posicion.x, 0.01, p.posicion.z);
    escena.add(marca);
  }

  // Protagonista.
  const jugador = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    new THREE.CapsuleGeometry(RADIO_JUGADOR, 1, 4, 12),
    toon('#7d8a4a'),
  );
  cuerpo.position.y = 0.85;
  cuerpo.castShadow = true;
  contorno(cuerpo, 0.08);
  // Visor verde y triángulo marcador sobre la cabeza.
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.12), new THREE.MeshBasicMaterial({ color: '#3fd8e8' }));
  visor.position.set(0, 1.3, RADIO_JUGADOR - 0.04);
  const marcador = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 3), new THREE.MeshBasicMaterial({ color: '#eceef0' }));
  marcador.rotation.x = Math.PI;
  marcador.position.y = 2.35;
  contorno(marcador, 0.06);
  jugador.add(cuerpo, visor, marcador);
  jugador.position.set(0, 0, 4.5);
  jugador.rotation.y = Math.PI;
  escena.add(jugador);

  // Entrada.
  const teclas = new Set<string>();
  let cercano: PuntoInteraccion | null = null;
  const alPulsar = (e: KeyboardEvent): void => {
    if (eventos.estaBloqueada?.()) {
      teclas.clear();
      return;
    }
    teclas.add(e.code);
    if (e.code === 'KeyE' && cercano) eventos.alInteractuar(cercano);
  };
  const alSoltar = (e: KeyboardEvent): void => {
    teclas.delete(e.code);
  };
  window.addEventListener('keydown', alPulsar);
  window.addEventListener('keyup', alSoltar);

  const redimensionar = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    const aspecto = w / Math.max(1, h);
    camara.left = -VISTA * aspecto;
    camara.right = VISTA * aspecto;
    camara.top = VISTA;
    camara.bottom = -VISTA;
    camara.updateProjectionMatrix();
  };
  window.addEventListener('resize', redimensionar);
  redimensionar();

  const choca = (x: number, z: number): boolean => {
    const limiteX = ANCHO / 2 - 0.15 - RADIO_JUGADOR;
    const limiteZ = FONDO / 2 - 0.15 - RADIO_JUGADOR;
    if (Math.abs(x) > limiteX || z < -limiteZ || z > FONDO / 2 - RADIO_JUGADOR) return true;
    return obstaculos.some(
      (o) =>
        x > o.min.x - RADIO_JUGADOR &&
        x < o.max.x + RADIO_JUGADOR &&
        z > o.min.y - RADIO_JUGADOR &&
        z < o.max.y + RADIO_JUGADOR,
    );
  };

  const reloj = new THREE.Clock();
  const direccion = new THREE.Vector3();
  let activo = true;

  const fotograma = (): void => {
    if (!activo) return;
    const dt = Math.min(reloj.getDelta(), 0.05);

    direccion.set(
      (teclas.has('KeyD') || teclas.has('ArrowRight') ? 1 : 0) - (teclas.has('KeyA') || teclas.has('ArrowLeft') ? 1 : 0),
      0,
      (teclas.has('KeyS') || teclas.has('ArrowDown') ? 1 : 0) - (teclas.has('KeyW') || teclas.has('ArrowUp') ? 1 : 0),
    );
    if (direccion.lengthSq() > 0) {
      // Las teclas son relativas a la pantalla: "arriba" es hacia el fondo de la vista isométrica.
      direccion.applyAxisAngle(EJE_Y, GIRO_CAMARA);
      direccion.normalize().multiplyScalar(VELOCIDAD * dt);
      const { x, z } = jugador.position;
      // Se prueba cada eje por separado para poder deslizarse junto a paredes y muebles.
      if (!choca(x + direccion.x, z)) jugador.position.x += direccion.x;
      if (!choca(jugador.position.x, z + direccion.z)) jugador.position.z += direccion.z;
      jugador.rotation.y = Math.atan2(direccion.x, direccion.z);
    }

    let masCercano: PuntoInteraccion | null = null;
    let mejor = DISTANCIA_INTERACCION;
    for (const p of puntos) {
      const d = Math.hypot(p.posicion.x - jugador.position.x, p.posicion.z - jugador.position.z);
      if (d < mejor) {
        mejor = d;
        masCercano = p;
      }
    }
    if (masCercano !== cercano) {
      cercano = masCercano;
      eventos.alAcercarse(cercano);
    }

    fuego.intensity = 16 + Math.sin(reloj.elapsedTime * 9) * 2 + Math.sin(reloj.elapsedTime * 23);
    renderer.render(escena, camara);
    requestAnimationFrame(fotograma);
  };
  fotograma();

  return () => {
    activo = false;
    window.removeEventListener('keydown', alPulsar);
    window.removeEventListener('keyup', alSoltar);
    window.removeEventListener('resize', redimensionar);
    renderer.dispose();
  };
}
