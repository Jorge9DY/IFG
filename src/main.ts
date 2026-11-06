// Punto de entrada: monta la sede 3D y los paneles de gestión.
import { iniciarSede } from './escena3d/sede';
import { Interfaz } from './ui/paneles';

const interfaz = new Interfaz({
  barra: document.querySelector<HTMLElement>('#barra')!,
  menu: document.querySelector<HTMLElement>('#menu')!,
  panel: document.querySelector<HTMLElement>('#panel')!,
});

const aviso = document.querySelector<HTMLElement>('#aviso')!;
iniciarSede(document.querySelector<HTMLCanvasElement>('#escena')!, {
  alAcercarse(punto) {
    aviso.hidden = punto === null;
    if (punto) aviso.textContent = `E: ${punto.accion}`;
  },
  alInteractuar(punto) {
    interfaz.abrirDesdeSede(punto.id);
  },
  estaBloqueada: () => interfaz.bloqueada,
});
