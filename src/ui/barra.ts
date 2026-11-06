// Barra superior: oro, deuda, prestigio, reputación, semana y puesto.
import type { Gremio } from '../motor/tipos';

const numero = new Intl.NumberFormat('es-ES');

export function pintarBarra(
  contenedor: HTMLElement,
  gremio: Gremio,
  calendario: { temporada: number; semana: number; puesto: number },
): void {
  const dato = (etiqueta: string, valor: string): string => `<span>${etiqueta} <strong>${valor}</strong></span>`;
  contenedor.innerHTML = [
    `<span class="nombre">${gremio.nombre}</span>`,
    dato('Oro', numero.format(gremio.oro)),
    dato('Deuda', numero.format(gremio.deuda)),
    dato('Prestigio', numero.format(gremio.prestigio)),
    dato('Reputación', numero.format(gremio.reputacion)),
    dato('Temporada', `${calendario.temporada} · Semana ${calendario.semana}/20`),
    dato('Puesto', `${calendario.puesto}.º`),
  ].join('');
}
