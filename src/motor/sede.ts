// Mejorar la sede: un único nivel (1–5). Cada nivel da más plazas de héroe y más prestigio.

import balance from '../datos/balance.json';
import { jugador, registrar, type EstadoJuego } from './estado';
import type { Gremio } from './tipos';

const S = balance.sede;
export const NIVEL_MAXIMO = S.plantillaPorNivel.length;

export function nivelSede(gremio: Gremio): number {
  return gremio.nivelSede ?? 1;
}

export interface InfoSede {
  nivel: number;
  plazas: number;
  /** Datos del siguiente nivel, o null si ya está al máximo. */
  siguiente: { coste: number; plazas: number; prestigio: number } | null;
  /** Por qué no se puede mejorar ahora, o null si se puede. */
  bloqueo: string | null;
}

export function infoSede(estado: EstadoJuego): InfoSede {
  const j = jugador(estado);
  const nivel = nivelSede(j);
  const plazas = S.plantillaPorNivel[nivel - 1] ?? j.plantillaMax;
  if (nivel >= NIVEL_MAXIMO) return { nivel, plazas, siguiente: null, bloqueo: 'La sede ya está al máximo' };
  const siguiente = {
    coste: S.costeSubir[nivel - 1] ?? 0,
    plazas: S.plantillaPorNivel[nivel] ?? plazas,
    prestigio: S.prestigioPorNivel[nivel - 1] ?? 0,
  };
  return { nivel, plazas, siguiente, bloqueo: j.oro < siguiente.coste ? 'No tienes oro suficiente' : null };
}

export function mejorarSede(estado: EstadoJuego): void {
  const info = infoSede(estado);
  if (!info.siguiente || info.bloqueo) throw new Error(info.bloqueo ?? 'No se puede mejorar');
  const j = jugador(estado);
  j.oro -= info.siguiente.coste;
  j.nivelSede = info.nivel + 1;
  j.plantillaMax = info.siguiente.plazas;
  j.prestigio = Math.min(100, j.prestigio + info.siguiente.prestigio);
  registrar(estado, 'sede', `La sede sube al nivel ${j.nivelSede}: ${j.plantillaMax} plazas y +${info.siguiente.prestigio} de prestigio.`);
}

/** Mantenimiento extra por cada nivel por encima del primero. */
export function mantenimientoSede(gremio: Gremio): number {
  return (nivelSede(gremio) - 1) * S.mantenimientoPorNivel;
}
