// Mejoras de la sede (sección 10 del diseño).

import balance from '../datos/balance.json';
import { heroesDe, jugador, registrar, type EstadoJuego } from './estado';
import type { Mejora } from './tipos';

const E = balance.efectosMejoras;

export const MEJORAS = Object.keys(balance.mejoras) as Mejora[];

export interface InfoMejora {
  mejora: Mejora;
  coste: number;
  efecto: string;
  construida: boolean;
  /** Motivo por el que no se puede construir ahora, o null si se puede. */
  bloqueo: string | null;
}

export function infoMejoras(estado: EstadoJuego): InfoMejora[] {
  const j = jugador(estado);
  return MEJORAS.map((mejora) => {
    const datos = balance.mejoras[mejora];
    const construida = j.mejoras.includes(mejora);
    let bloqueo: string | null = null;
    if (construida) bloqueo = 'Ya construida';
    else if (datos.requiere && !j.mejoras.includes(datos.requiere as Mejora)) bloqueo = `Necesita ${datos.requiere}`;
    else if (j.oro < datos.coste) bloqueo = 'No hay oro suficiente';
    return { mejora, coste: datos.coste, efecto: datos.efecto, construida, bloqueo };
  });
}

export function construirMejora(estado: EstadoJuego, mejora: Mejora): void {
  const info = infoMejoras(estado).find((m) => m.mejora === mejora);
  if (!info) throw new Error(`No existe la mejora ${mejora}`);
  if (info.bloqueo) throw new Error(info.bloqueo);
  const j = jugador(estado);
  j.oro -= info.coste;
  j.mejoras.push(mejora);
  aplicarEfectosPermanentes(estado);
  if (mejora === 'Salon de banquetes') j.prestigio = Math.min(100, j.prestigio + E.prestigioBanquetes);
  registrar(estado, 'sede', `Construida la mejora ${mejora} por ${info.coste} de oro.`);
}

/** Efectos que dependen de la plantilla actual: se aplican al construir y en cada cierre. */
export function aplicarEfectosPermanentes(estado: EstadoJuego): void {
  const j = jugador(estado);
  if (j.mejoras.includes('Dormitorios II')) j.plantillaMax = Math.max(j.plantillaMax, E.plantillaDormitoriosII);
  else if (j.mejoras.includes('Dormitorios I')) j.plantillaMax = Math.max(j.plantillaMax, E.plantillaDormitoriosI);
  if (j.mejoras.includes('Biblioteca arcana')) {
    for (const h of heroesDe(estado, j.id)) h.potencialVisible = true;
  }
}

export function multiplicadorXp(estado: EstadoJuego): number {
  return jugador(estado).mejoras.includes('Sala de entrenamiento') ? E.xpEntrenamiento : 1;
}

/** Semanas de baja con la Enfermería: una menos, con un mínimo de 1. */
export function semanasDeBaja(estado: EstadoJuego, semanas: number): number {
  if (semanas <= 0 || !jugador(estado).mejoras.includes('Enfermeria')) return semanas;
  return Math.max(1, semanas - E.semanasMenosEnfermeria);
}
