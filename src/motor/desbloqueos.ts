// Desbloqueo progresivo (decisión del propietario, revisión de diseño): un jugador nuevo empieza con
// misiones y la Prueba; la semana 2 se abren el mercado y las relaciones, y la temporada 2, la Ascensión
// y los retos. Son los mismos sistemas, presentados poco a poco. Días en balance.json (desbloqueo).

import balance from '../datos/balance.json';
import { registrar, type EstadoJuego } from './estado';

export const SISTEMAS = ['mercado', 'relaciones', 'ascension', 'retos'] as const;
export type Sistema = (typeof SISTEMAS)[number];

const TEXTO: Record<Sistema, string> = {
  mercado: '¡Nuevo! Abre el mercado de héroes: ya puedes comprar a los de otros gremios y vender a los tuyos.',
  relaciones: '¡Nuevo! Tus héroes ya se conocen: mira sus relaciones en Gestionar gremio.',
  ascension: '¡Nuevo! Los héroes que lleguen a su límite pueden intentar la Ascensión.',
  retos: '¡Nuevo! Los maestros rivales empiezan a retarte a duelos.',
};

export function diaDesbloqueo(s: Sistema): number {
  return (balance.desbloqueo as Record<Sistema, number>)[s];
}

export function desbloqueado(estado: EstadoJuego, s: Sistema): boolean {
  return estado.desbloqueos.includes(s);
}

/** Recién abierto (para marcarlo como «¡Nuevo!» unos días). */
export function esNuevo(estado: EstadoJuego, s: Sistema): boolean {
  return desbloqueado(estado, s) && estado.dia < diaDesbloqueo(s) + 3;
}

/** Abre los sistemas que tocan hoy y lo anuncia. Devuelve los que se abren. */
export function actualizarDesbloqueos(estado: EstadoJuego): Sistema[] {
  const nuevos = SISTEMAS.filter((s) => !estado.desbloqueos.includes(s) && estado.dia >= diaDesbloqueo(s));
  for (const s of nuevos) {
    estado.desbloqueos.push(s);
    registrar(estado, 'temporada', TEXTO[s]);
  }
  return nuevos;
}

export function textoDesbloqueo(s: Sistema): string {
  return TEXTO[s];
}
