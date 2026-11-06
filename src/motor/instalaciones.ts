// Instalaciones (biblia, sección 4): la sede da plazas y prestigio; los ojeadores estrechan el potencial visible.

import balance from '../datos/balance.json';
import { gremio, registrar, type EstadoJuego } from './estado';
import type { Gremio } from './tipos';

const I = balance.instalaciones;

export type Instalacion = 'sede' | 'ojeadores';

export const NOMBRE_INSTALACION: Record<Instalacion, string> = { sede: 'Sede', ojeadores: 'Ojeadores' };

export function plazas(g: Gremio): number {
  return I.sede.plazas[g.nivelSede - 1] ?? I.sede.plazas[I.sede.plazas.length - 1] ?? 5;
}

export function plazasLibres(estado: EstadoJuego, gremioId: string): number {
  const g = gremio(estado, gremioId);
  return plazas(g) - g.plantilla.length;
}

function nivel(g: Gremio, tipo: Instalacion): number {
  return tipo === 'sede' ? g.nivelSede : g.nivelOjeadores;
}

/** Coste del siguiente nivel, o null si ya está al máximo. */
export function costeMejora(g: Gremio, tipo: Instalacion): number | null {
  const tabla = tipo === 'sede' ? I.sede.coste : I.ojeadores.coste;
  // La sede empieza en el nivel 1; los ojeadores, en el 0.
  const indice = tipo === 'sede' ? g.nivelSede - 1 : g.nivelOjeadores;
  return tabla[indice] ?? null;
}

export interface InfoInstalacion {
  tipo: Instalacion;
  nivel: number;
  coste: number | null;
  /** Por qué no se puede mejorar ahora, o null si se puede. */
  bloqueo: string | null;
}

export function infoInstalacion(estado: EstadoJuego, gremioId: string, tipo: Instalacion): InfoInstalacion {
  const g = gremio(estado, gremioId);
  const coste = costeMejora(g, tipo);
  let bloqueo: string | null = null;
  if (coste === null) bloqueo = 'Ya está al máximo';
  else if (g.oro < coste) bloqueo = 'No tienes oro suficiente';
  return { tipo, nivel: nivel(g, tipo), coste, bloqueo };
}

export function mejorar(estado: EstadoJuego, gremioId: string, tipo: Instalacion): void {
  const info = infoInstalacion(estado, gremioId, tipo);
  if (info.bloqueo || info.coste === null) throw new Error(info.bloqueo ?? 'No se puede mejorar');
  const g = gremio(estado, gremioId);
  g.oro -= info.coste;
  if (tipo === 'sede') g.nivelSede += 1;
  else g.nivelOjeadores += 1;
  registrar(estado, g.esJugador ? 'instalacion' : 'rival', `${g.nombre} mejora ${NOMBRE_INSTALACION[tipo].toLowerCase()} al nivel ${nivel(g, tipo)}.`);
}
