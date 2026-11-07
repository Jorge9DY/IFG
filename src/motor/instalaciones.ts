// Instalaciones (biblia, sección 4): la sede da plazas y prestigio; los ojeadores estrechan el potencial visible;
// la zona de entrenamiento deja entrenar héroes a cambio de oro.

import balance from '../datos/balance.json';
import { gremio, registrar, type EstadoJuego } from './estado';
import type { Gremio } from './tipos';

const I = balance.instalaciones;

export type Instalacion = 'sede' | 'ojeadores' | 'entrenamiento';

export const NOMBRE_INSTALACION: Record<Instalacion, string> = { sede: 'Sede', ojeadores: 'Ojeadores', entrenamiento: 'Zona de entrenamiento' };

export function plazas(g: Gremio): number {
  return I.sede.plazas[g.nivelSede - 1] ?? I.sede.plazas[I.sede.plazas.length - 1] ?? 5;
}

export function plazasLibres(estado: EstadoJuego, gremioId: string): number {
  const g = gremio(estado, gremioId);
  return plazas(g) - g.plantilla.length;
}

export function nivelInstalacion(g: Gremio, tipo: Instalacion): number {
  if (tipo === 'sede') return g.nivelSede;
  if (tipo === 'ojeadores') return g.nivelOjeadores;
  return g.nivelEntrenamiento ?? 0;
}
const nivel = nivelInstalacion;

/** Coste del siguiente nivel, o null si ya está al máximo. */
export function costeMejora(g: Gremio, tipo: Instalacion): number | null {
  const tabla = tipo === 'sede' ? I.sede.coste : tipo === 'ojeadores' ? I.ojeadores.coste : I.entrenamiento.coste;
  // La sede empieza en el nivel 1; los ojeadores y la zona de entrenamiento, en el 0.
  const indice = tipo === 'sede' ? g.nivelSede - 1 : nivel(g, tipo);
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
  else if (tipo === 'ojeadores') g.nivelOjeadores += 1;
  else g.nivelEntrenamiento = (g.nivelEntrenamiento ?? 0) + 1;
  registrar(estado, g.esJugador ? 'instalacion' : 'rival', `${g.nombre} mejora ${NOMBRE_INSTALACION[tipo].toLowerCase()} al nivel ${nivel(g, tipo)}.`);
}
