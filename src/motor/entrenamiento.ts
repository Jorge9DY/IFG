// Zona de entrenamiento (idea del propietario): un héroe pasa unos días entrenando, gana experiencia
// a cambio de oro y no se lesiona. Sirve sobre todo para subir a héroes demasiado flojos para las misiones.
// No supera el límite del héroe: para eso está la Ascensión.

import balance from '../datos/balance.json';
import { heroe as obtenerHeroe, jugador, registrar, type EstadoJuego } from './estado';
import { alLimite, ganarExperiencia, type Progreso } from './heroes';
import { nivelInstalacion } from './instalaciones';

const E = balance.entrenamiento;
const I = balance.instalaciones.entrenamiento;

/** Plazas de entrenamiento según el nivel de la instalación (0 si no se ha construido). */
export function plazasEntrenamiento(estado: EstadoJuego): number {
  return I.plazas[nivelInstalacion(jugador(estado), 'entrenamiento')] ?? 0;
}

export function experienciaPorDia(estado: EstadoJuego): number {
  return I.experienciaPorDia[nivelInstalacion(jugador(estado), 'entrenamiento')] ?? 0;
}

export function costeEntrenamiento(estado: EstadoJuego, heroeId: string): number {
  const h = obtenerHeroe(estado, heroeId);
  return Math.round((E.dias * (E.porDia + E.porPoderPorDia * h.poder)) / 10) * 10;
}

export interface CondicionesEntrenamiento {
  coste: number;
  dias: number;
  /** Experiencia total que ganará. */
  experiencia: number;
  bloqueo: string | null;
}

export function condicionesEntrenamiento(estado: EstadoJuego, heroeId: string): CondicionesEntrenamiento {
  const h = obtenerHeroe(estado, heroeId);
  const base = { coste: costeEntrenamiento(estado, heroeId), dias: E.dias, experiencia: E.dias * experienciaPorDia(estado) };
  if (!jugador(estado).plantilla.includes(heroeId)) return { ...base, bloqueo: 'No es de tu gremio' };
  if (plazasEntrenamiento(estado) === 0) return { ...base, bloqueo: 'Construye la zona de entrenamiento' };
  if (h.estado !== 'libre') return { ...base, bloqueo: 'No está libre' };
  if (alLimite(h)) return { ...base, bloqueo: 'Ha llegado a su límite: solo la Ascensión lo hará crecer' };
  if (estado.entrenamientos.length >= plazasEntrenamiento(estado)) return { ...base, bloqueo: 'No quedan plazas de entrenamiento' };
  if (jugador(estado).oro < base.coste) return { ...base, bloqueo: 'No tienes oro suficiente' };
  return { ...base, bloqueo: null };
}

/** Paga y manda al héroe a entrenar unos días. */
export function entrenar(estado: EstadoJuego, heroeId: string): void {
  if (estado.fase !== 'gestion') throw new Error('Ahora no se puede entrenar');
  const c = condicionesEntrenamiento(estado, heroeId);
  if (c.bloqueo) throw new Error(c.bloqueo);
  const h = obtenerHeroe(estado, heroeId);
  jugador(estado).oro -= c.coste;
  h.estado = 'entrenando';
  estado.entrenamientos.push({ heroeId, diaVuelta: estado.dia + c.dias - 1 });
  registrar(estado, 'mision', `${h.nombre} entrena ${c.dias} días (−${c.coste} de oro).`);
}

export interface ResultadoEntrenamiento {
  heroeId: string;
  nombre: string;
  progreso: Progreso;
}

/** Al finalizar el día, los que terminan su entrenamiento vuelven con la experiencia ganada. */
export function resolverEntrenamientos(estado: EstadoJuego): ResultadoEntrenamiento[] {
  const terminan = estado.entrenamientos.filter((e) => e.diaVuelta <= estado.dia);
  estado.entrenamientos = estado.entrenamientos.filter((e) => e.diaVuelta > estado.dia);
  const resultados: ResultadoEntrenamiento[] = [];
  for (const e of terminan) {
    const h = estado.heroes[e.heroeId];
    if (!h) continue;
    h.estado = 'libre';
    const progreso = ganarExperiencia(h, E.dias * experienciaPorDia(estado));
    resultados.push({ heroeId: h.id, nombre: h.nombre, progreso });
  }
  return resultados;
}
