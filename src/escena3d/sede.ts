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
}

const ANCHO = 16;
const FONDO = 12;
const VELOCIDAD = 4.5; // unidades por segundo
const RADIO_JUGADOR = 0.35;
const DISTANCIA_INTERACCION = 1.8;

interface Obstaculo {
  min: THREE.Vector2;
  max: THREE.Vector2;
}

export function iniciarSede(canvas: HTMLCanvasElement, eventos: EventosSede): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color('#1d1a24');
  escena.fog = new THREE.Fog('#1d1a24', 18, 34);

  const camara = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const desfaseCamara = new THREE.Vector3(0, 9, 9);

  // Luces: ambiente tenue (el gremio está en ruinas) y el fuego de la chimenea.
  escena.add(new THREE.HemisphereLight('#c9b8ff', '#2a2018', 0.6));
  const sol = new THREE.DirectionalLight('#ffe2b8', 1.2);
  sol.position.set(-6, 12, 6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  escena.add(sol);
  const fuego = new THREE.PointLight('#ff8a3d', 18, 9);
  fuego.position.set(5.5, 1.2, -4.8);
  escena.add(fuego);

  // Suelo y paredes.
  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO, FONDO),
    new THREE.MeshStandardMaterial({ color: '#6b5440', roughness: 0.9 }),
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);

  const materialPared = new THREE.MeshStandardMaterial({ color: '#8a7a6a', roughness: 1 });
  const pared = (ancho: number, x: number, z: number, rotacion: number): void => {
    const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, 3, 0.3), materialPared);
    malla.position.set(x, 1.5, z);
    malla.rotation.y = rotacion;
    malla.receiveShadow = true;
    escena.add(malla);
  };
  pared(ANCHO, 0, -FONDO / 2, 0);
  pared(FONDO, -ANCHO / 2, 0, Math.PI / 2);
  pared(FONDO, ANCHO / 2, 0, Math.PI / 2);

  // Mobiliario y puntos de interacción (formas provisionales hasta tener assets).
  const obstaculos: Obstaculo[] = [];
  const puntos: PuntoInteraccion[] = [];
  const caja = (color: string, tam: [number, number, number], x: number, z: number, solido = true): THREE.Mesh => {
    const malla = new THREE.Mesh(
      new THREE.BoxGeometry(...tam),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    malla.position.set(x, tam[1] / 2, z);
    malla.castShadow = true;
    malla.receiveShadow = true;
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

  caja('#4a3426', [2.2, 1.6, 0.2], -3, -5.75); // tablón de anuncios
  punto('tablon', 'Tablón de anuncios', 'Ver misiones', -3, -5.2);
  caja('#5c4030', [3.5, 1, 0.9], 0, 3.2); // mostrador
  punto('mostrador', 'Mostrador', 'Abrir mercado', 0, 2.2);
  caja('#3a3a40', [1.8, 1.4, 0.8], 5.5, -5.4); // chimenea
  const elara = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 1, 4, 12),
    new THREE.MeshStandardMaterial({ color: '#d9643a' }),
  );
  elara.position.set(4.2, 0.82, -4.2);
  elara.castShadow = true;
  escena.add(elara);
  obstaculos.push({ min: new THREE.Vector2(3.85, -4.55), max: new THREE.Vector2(4.55, -3.85) });
  punto('elara', 'Elara', 'Hablar con Elara', 4.2, -3.4);
  caja('#4d3b5c', [0.2, 2.2, 1.4], -7.75, -2); // puerta de los dormitorios
  punto('dormitorios', 'Dormitorios', 'Ver plantilla', -7, -2);
  caja('#2f4a3c', [0.2, 1.4, 1.8], 7.75, 1); // pizarra de la Asociación
  punto('pizarra', 'Pizarra de la Asociación', 'Ver clasificación', 7, 1);
  punto('puerta', 'Puerta de la sede', 'Terminar semana', 0, 5.4);
  caja('#5a4a3a', [1.6, 0.8, 1.6], -4, 1.5); // mesa vacía
  caja('#5a4a3a', [1.6, 0.8, 1.6], 3.5, 0); // mesa vacía

  // Marcadores en el suelo para ver los puntos de interacción.
  const materialMarca = new THREE.MeshBasicMaterial({ color: '#e8a04a', transparent: true, opacity: 0.35 });
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
    new THREE.MeshStandardMaterial({ color: '#4f7cc9' }),
  );
  cuerpo.position.y = 0.85;
  cuerpo.castShadow = true;
  const nariz = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.25), new THREE.MeshStandardMaterial({ color: '#f3ece0' }));
  nariz.position.set(0, 1.25, RADIO_JUGADOR);
  jugador.add(cuerpo, nariz);
  jugador.position.set(0, 0, 4.5);
  jugador.rotation.y = Math.PI;
  escena.add(jugador);

  // Entrada.
  const teclas = new Set<string>();
  let cercano: PuntoInteraccion | null = null;
  const alPulsar = (e: KeyboardEvent): void => {
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
    camara.aspect = w / h;
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
    camara.position.lerp(jugador.position.clone().add(desfaseCamara), 1 - Math.exp(-6 * dt));
    camara.lookAt(jugador.position.x, 0.8, jugador.position.z);
    renderer.render(escena, camara);
    requestAnimationFrame(fotograma);
  };
  camara.position.copy(jugador.position).add(desfaseCamara);
  fotograma();

  return () => {
    activo = false;
    window.removeEventListener('keydown', alPulsar);
    window.removeEventListener('keyup', alSoltar);
    window.removeEventListener('resize', redimensionar);
    renderer.dispose();
  };
}
