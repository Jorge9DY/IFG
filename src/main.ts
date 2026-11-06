// Punto de entrada: monta la sede 3D y el HUD con los paneles de gestión.
import { iniciarSede } from './escena3d/sede';
import { Interfaz } from './ui/paneles';

const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;

const interfaz = new Interfaz({
  cabecera: $('#cabecera'),
  objetivo: $('#objetivo'),
  menu: $('#menu'),
  accion: $('#accion'),
  equipo: $('#equipo'),
  panel: $('#panel'),
});

iniciarSede(document.querySelector<HTMLCanvasElement>('#escena')!, {
  // Sin aviso flotante: tapaba el botón del Mercado. Los anillos cian marcan los puntos y E los usa.
  alAcercarse() {},
  alInteractuar(punto) {
    interfaz.abrirDesdeSede(punto.id);
  },
  estaBloqueada: () => interfaz.bloqueada,
});
