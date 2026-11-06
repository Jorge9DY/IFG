// IA de los gremios rivales (sección 13): pujas, misiones abstractas y ofertas de compra.

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import type { Azar } from './azar';
import {
  gremio,
  heroesDe,
  limiteDeuda,
  manutencionDe,
  puesto,
  registrar,
  salariosDe,
  type EstadoJuego,
} from './estado';
import { salarioPedido, valorMercado } from './heroes';
import { probabilidadExito, sumaCombate } from './misiones';
import type { ContextoGremio, Oferta, Pujador } from './pujas';
import { puntosMision } from './ranking';
import { RANGOS, indiceRango, type Clase, type Heroe, type Rango } from './tipos';

export interface PerfilIA {
  agresividad: number;
  sesgo: 'rango' | 'reputacion' | 'agilidad' | 'potencial';
  clasesPreferidas: Clase[];
}

export function perfil(gremioId: string): PerfilIA {
  const datos = datosGremios.rivales.find((r) => r.id === gremioId);
  if (!datos) throw new Error(`Sin perfil de IA para ${gremioId}`);
  return datos.perfil as PerfilIA;
}

/** Contexto de un gremio frente a un héroe concreto, para la Puntuación de Oferta. */
export function contextoGremio(estado: EstadoJuego, gremioId: string, heroe: Heroe, bonusExtra = 0): ContextoGremio {
  const g = gremio(estado, gremioId);
  const plantilla = new Set(g.plantilla);
  let bonusEspecialidad: boolean;
  if (g.esJugador) {
    // Puesto titular: ningún héroe de su clase con rango igual o superior en la plantilla.
    bonusEspecialidad = !heroesDe(estado, gremioId).some(
      (h) => h.clase === heroe.clase && indiceRango(h.rango) >= indiceRango(heroe.rango),
    );
  } else {
    bonusEspecialidad = g.especialidad === heroe.clase;
  }
  return {
    gremioId,
    prestigio: g.prestigio,
    reputacion: g.reputacion,
    puesto: puesto(estado, gremioId),
    vinculosEnPlantilla: heroe.vinculos.filter((v) => plantilla.has(v.con)).map((v) => v.tipo),
    bonusEspecialidad,
    muertesTemporadaPasada: g.muertesTemporadaPasada,
    ratioDeuda: g.esJugador ? g.deuda / limiteDeuda() : 0,
    bonusExtra,
  };
}

/** Interés (0–1+) de un rival por un héroe: valor del rango × necesidad × sesgo del perfil. */
export function interes(estado: EstadoJuego, gremioId: string, heroe: Heroe): number {
  const g = gremio(estado, gremioId);
  if (g.plantilla.length >= g.plantillaMax) return 0;
  const p = perfil(gremioId);
  const plantilla = heroesDe(estado, gremioId);
  const necesidad = plantilla.some((h) => h.clase === heroe.clase) ? 1 : 1.5;
  let sesgo = 1;
  if (p.sesgo === 'rango') sesgo = indiceRango(heroe.rango) >= indiceRango('A') ? 1.4 : 0.6;
  if (p.sesgo === 'potencial') sesgo = indiceRango(heroe.potencial) > indiceRango(heroe.rango) ? 1.4 : 0.8;
  if (p.sesgo === 'agilidad') sesgo = heroe.stats.agilidad >= 50 ? 1.3 : 0.9;
  if (p.sesgo === 'reputacion') sesgo = heroe.rasgos.includes('Temerario') ? 0 : 1.1;
  if (p.clasesPreferidas.includes(heroe.clase)) sesgo *= 1.2;
  // Los gremios grandes no se interesan por héroes muy por debajo de su nivel.
  const mediaRango = plantilla.reduce((t, h) => t + indiceRango(h.rango), 0) / Math.max(1, plantilla.length);
  if (indiceRango(heroe.rango) + 1.5 < mediaRango) return 0;
  const nivel = 1;
  return (indiceRango(heroe.rango) + 1) / 6 * necesidad * sesgo * nivel;
}

/** Crea el pujador de un rival: sube un 15% por ronda si va perdiendo, sin pasar del 40% de su oro. */
export function pujadorIA(
  estado: EstadoJuego,
  azar: Azar,
  gremioId: string,
  heroe: Heroe,
  bonusExtra = 0,
  /** Prima mínima de la primera ronda (espionaje de los Tejedores). */
  primaMinima = 0,
  /** Multiplicador de agresividad (modo amenaza). */
  multiplicador = 1,
): Pujador {
  const p = perfil(gremioId);
  const g = gremio(estado, gremioId);
  const valor = valorMercado(heroe);
  const salario = salarioPedido(heroe.rango);
  const tope = Math.max(0, g.oro * 0.4);
  let prima = Math.min(tope, Math.max(primaMinima, valor * (0.6 + azar.siguiente() * 0.4) * p.agresividad * multiplicador));
  const contexto = contextoGremio(estado, gremioId, heroe, bonusExtra);
  return {
    contexto,
    pujar(ronda: number, mejorRival: number | null): Oferta | null {
      if (ronda > 1) {
        if (mejorRival === null) return { prima, salario, duracion: 2 };
        prima = Math.min(tope, prima * 1.15 * (gremioId === 'colmillo' && ronda === 3 ? 1.2 : 1));
      }
      if (prima <= 0) return null;
      return { prima: Math.round(prima), salario, duracion: 2 };
    },
  };
}

/** Rivales que pujarán por un héroe del mercado. */
export function rivalesInteresados(estado: EstadoJuego, azar: Azar, heroe: Heroe, esDraft: boolean): string[] {
  const umbral = esDraft ? 0.15 : 0.35;
  return Object.values(estado.gremios)
    .filter((g) => !g.esJugador)
    .filter((g) => {
      const i = interes(estado, g.id, heroe);
      return i >= umbral && azar.probabilidad(Math.min(95, i * 100 * (esDraft ? 1.5 : balance.ia.interesFichaje)));
    })
    .map((g) => g.id);
}

/** Turno de misiones de un rival: elige 1–3 misiones del rango más alto con ≥70% de éxito. */
export function turnoMisionesIA(estado: EstadoJuego, azar: Azar, gremioId: string): { exitos: number } {
  const g = gremio(estado, gremioId);
  const disponibles = heroesDe(estado, gremioId)
    .filter((h) => h.estado === 'disponible')
    .sort((a, b) => sumaCombate(b) - sumaCombate(a));
  const [min, max] = balance.ia.misionesPorSemana as [number, number];
  const numero = azar.entero(min, max);
  let exitos = 0;
  for (let i = 0; i < numero; i++) {
    const equipo = disponibles.splice(0, 4);
    if (equipo.length < 3) break;
    const poder = equipo.reduce((t, h) => t + sumaCombate(h) * 0.97, 0);
    const rango = mejorRangoAsumible(poder);
    if (!rango) break;
    const m = balance.misiones[rango];
    const prob = probabilidadExito(poder, m.poderRecomendado, false);
    // El equipo queda ocupado lo que dura la misión, igual que los héroes del jugador.
    for (const h of equipo) {
      h.estado = 'en mision';
      h.semanasFuera = m.duracion;
    }
    const exito = azar.probabilidad(prob);
    if (exito) {
      exitos++;
      g.oro += azar.entero(m.oro[0] ?? 0, m.oro[1] ?? 0);
      g.prestigio = Math.min(100, g.prestigio + m.prestigio);
      g.puntosMisionTemporada += puntosMision(rango);
    } else {
      g.prestigio = Math.max(0, g.prestigio - balance.exito.penalizacionPrestigioFracaso);
      if (azar.probabilidad(balance.ia.probMuerteFracaso)) {
        const caido = azar.elegir(equipo);
        caido.estado = 'muerto';
        g.plantilla = g.plantilla.filter((id) => id !== caido.id);
        estado.muertesTemporada[gremioId] = (estado.muertesTemporada[gremioId] ?? 0) + 1;
        registrar(estado, 'rival', `${g.nombre} pierde a ${caido.nombre} en una misión de rango ${rango}.`);
      }
    }
  }
  return { exitos };
}

function mejorRangoAsumible(poder: number): Rango | null {
  for (const rango of [...RANGOS].reverse()) {
    if (probabilidadExito(poder, balance.misiones[rango].poderRecomendado, false) >= balance.ia.probExitoMinima) {
      return rango;
    }
  }
  return null;
}

/** Cierre semanal abstracto de un rival: patrocinio menos licencia, mantenimiento y salarios. */
export function cierreIA(estado: EstadoJuego, gremioId: string, huboExito: boolean): void {
  const g = gremio(estado, gremioId);
  const e = balance.economia;
  g.oro += e.patrocinioPorPrestigio * g.prestigio + e.patrocinioPorReputacion * g.reputacion;
  g.oro -= e.licencia + e.mantenimiento + salariosDe(estado, gremioId) + manutencionDe(estado, gremioId);
  if (!huboExito) g.prestigio = Math.max(0, g.prestigio - e.decaimientoPrestigio);
}
