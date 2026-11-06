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

const aviso = $('#aviso');
iniciarSede(document.querySelector<HTMLCanvasElement>('#escena')!, {
  alAcercarse(punto) {
    aviso.hidden = punto === null;
    if (punto) aviso.innerHTML = `<kbd>E</kbd>${punto.accion}`;
  },
  alInteractuar(punto) {
    interfaz.abrirDesdeSede(punto.id);
  },
  estaBloqueada: () => interfaz.bloqueada,
});
