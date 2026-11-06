// Punto de entrada: monta la sede 3D y la barra superior con el estado inicial del gremio.
import { iniciarSede } from './escena3d/sede';
import { pintarBarra } from './ui/barra';
import { estadoInicialJugador } from './motor/estadoInicial';

const gremio = estadoInicialJugador();
pintarBarra(document.querySelector('#barra')!, gremio, { temporada: 1, semana: 1, puesto: 5 });

const aviso = document.querySelector<HTMLElement>('#aviso')!;
iniciarSede(document.querySelector<HTMLCanvasElement>('#escena')!, {
  alAcercarse(punto) {
    aviso.hidden = punto === null;
    if (punto) aviso.textContent = `E: ${punto.accion}`;
  },
  alInteractuar(punto) {
    // Los paneles de gestión llegan en la fase 3; por ahora solo se confirma la interacción.
    aviso.textContent = `${punto.nombre}: panel en construcción`;
  },
});
