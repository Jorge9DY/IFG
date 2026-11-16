// Escenas de diálogo y nombres flotantes (docs/direccion-de-arte.md, apartado 7): título sobre barra naranja,
// lugar con borde cian, bocadillo oscuro translúcido y opciones inclinadas apiladas.
// Solo pinta lo que le dan; las opciones y sus efectos los decide el motor.

import { esc } from './html';

export interface OpcionEscena {
  texto: string;
  /** Por qué no se puede elegir, si no se puede. */
  bloqueo?: string;
}

export interface DatosEscena {
  titulo: string;
  lugar: string;
  quien: string;
  texto: string;
  opciones: OpcionEscena[];
  /** Línea pequeña bajo las opciones (por ejemplo, qué pasa si no decides). */
  nota?: string;
}

/** Separa el coste en oro que algunas opciones llevan entre paréntesis: «Paga (300 de oro)» → «−300 oro». */
export function costeDe(texto: string): { texto: string; coste: string } {
  const m = /\s*\(([\d.]+) de oro[^)]*\)/.exec(texto);
  if (!m) return { texto, coste: '' };
  const regala = /regala/i.test(texto);
  return { texto: regala ? texto : texto.replace(m[0], ''), coste: regala ? '' : `−${m[1]} oro` };
}

/** Pinta la escena en su capa. Devuelve el bocadillo para que la escena 3D lo coloque junto al héroe. */
export function pintarEscena(capa: HTMLElement, d: DatosEscena, alElegir: (indice: number) => void): HTMLElement {
  capa.innerHTML = `
    <div class="escena-lugar">${esc(d.lugar)}</div>
    <div class="escena-titulo"><span>Momento</span><b>«${esc(d.titulo)}»</b></div>
    <div class="bocadillo"><em>${esc(d.quien)}</em><p>${esc(d.texto)}</p></div>
    <div class="opciones-escena" role="group" aria-label="Opciones">
      ${d.opciones
        .map((o, i) => {
          const { texto, coste } = costeDe(o.texto);
          return `<button data-opcion="${i}" style="--i:${i}" ${o.bloqueo ? `disabled title="${esc(o.bloqueo)}"` : ''}><span><kbd>${i + 1}</kbd>${esc(texto)}${coste ? `<i>‹ ${esc(coste)} ›</i>` : ''}</span></button>`;
        })
        .join('')}
      ${d.nota ? `<small>${esc(d.nota)}</small>` : ''}
    </div>`;
  capa.hidden = false;
  capa.onclick = (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-opcion]');
    if (b && !b.disabled) alElegir(Number(b.dataset.opcion));
  };
  capa.querySelector<HTMLButtonElement>('[data-opcion]:not([disabled])')?.focus();
  return capa.querySelector<HTMLElement>('.bocadillo')!;
}

/** Nombre flotante sobre un personaje: «Lumia · C». */
export function crearNombre(capa: HTMLElement, nombre: string, rango = ''): HTMLElement {
  const el = document.createElement('div');
  el.className = 'nombre-flotante';
  el.innerHTML = `${esc(nombre)}${rango ? `<span>${esc(rango)}</span>` : ''}`;
  capa.append(el);
  return el;
}
