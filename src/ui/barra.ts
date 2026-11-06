// Barra superior: oro, deuda, prestigio, reputación, semana y puesto.
import type { Gremio } from '../motor/tipos';
import { num } from './html';


export function pintarBarra(
  contenedor: HTMLElement,
  gremio: Gremio,
  calendario: { temporada: number; semana: number; puesto: number },
): void {
  const dato = (etiqueta: string, valor: string): string => `<span>${etiqueta} <strong>${valor}</strong></span>`;
  contenedor.innerHTML = [
    `<span class="nombre">${gremio.nombre}</span>`,
    dato('Oro', num(gremio.oro)),
    dato('Deuda', num(gremio.deuda)),
    dato('Prestigio', num(gremio.prestigio)),
    dato('Reputación', num(gremio.reputacion)),
    dato('Temporada', `${calendario.temporada} · Semana ${calendario.semana}/20`),
    dato('Puesto', `${calendario.puesto}.º`),
  ].join('');
}
