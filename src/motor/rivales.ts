// Gremios rivales (biblia, sección 14): misiones diarias, mejoras, límite oculto en las pujas e interés por fichar.
// Cómo se simula su progreso está [Abierto]: esta es una primera versión sencilla y provisional.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { sueldosDe } from './economia';
import { gremio, heroesDe, registrar, type EstadoJuego } from './estado';
import { letraDe, nivelOjeo, potencialEstimado, valorEstimado } from './heroes';
import datosDesarrollo from '../datos/desarrollo.json';
import { categoria, multiplicadores } from './categorias';
import { infoInstalacion, mejorar, plazasLibres, type Instalacion } from './instalaciones';
import { generarTablon, probabilidadMision } from './misiones';
import { RANGOS_MISION, type Gremio, type Heroe, type Mision, type PerfilRival } from './tipos';

const R = balance.rivales;

export function perfil(g: Gremio): PerfilRival {
  if (!g.perfil) throw new Error(`${g.nombre} no tiene perfil de rival`);
  return g.perfil;
}

/** Potencial que estima un rival con sus ojeadores: puede equivocarse con las joyas ocultas. */
export function potencialVisto(g: Gremio, h: Heroe): number {
  return potencialEstimado(h, nivelOjeo(g, h.id));
}

/** Cuánto le importa a un rival este héroe según su estrategia (≈0,5–1,6). */
export function prioridad(g: Gremio, h: Heroe): number {
  const p = perfil(g);
  let base: number;
  switch (p.prioridad) {
    case 'poder':
      base = 0.6 + h.poder / 40;
      break;
    case 'potencial':
      base = 0.5 + potencialVisto(g, h) / 80;
      break;
    case 'destacado':
      base = (balance.heroes.letrasDestacado as string[]).includes(letraDe(potencialVisto(g, h))) ? 1.5 : 0.7;
      break;
    default:
      base = 0.6;
  }
  // Un gremio especializado puja más fuerte por los héroes de su clase (biblia, sección 8).
  const clase = g.clase && h.clase === g.clase ? balance.clases.prioridadClaseRival : 1;
  return base * p.agresividad * clase;
}

/** Fracción (0–1) de su presupuesto que el rival está dispuesto a usar en este héroe. */
export function factorPresupuesto(estado: EstadoJuego, g: Gremio, h: Heroe): number {
  const disponible = g.oro - R.reservaSueldos * sueldosDe(estado, g.id);
  return Math.max(0, Math.min(1, disponible / (valorEstimado(h, nivelOjeo(g, h.id)) * 2)));
}

/**
 * Límite oculto de puja de un rival por un candidato (sección 8):
 * Límite = valor percibido × prioridad del gremio × presupuesto disponible. Nunca más del oro que le sobra.
 */
export function limitePuja(estado: EstadoJuego, azar: Azar, g: Gremio, h: Heroe): number {
  if (plazasLibres(estado, g.id) <= 0) return 0;
  // Con la plantilla completa solo pujan por alguien mejor que su héroe más flojo.
  const flojo = masFlojo(estado, g.id);
  if (g.plantilla.length >= R.plantillaObjetivo && flojo && potencialVisto(g, h) <= potencialVisto(g, flojo)) return 0;
  // El rival valora con lo que ven sus ojeadores, no con el potencial real.
  const percibido = valorEstimado(h, nivelOjeo(g, h.id)) * (1 + (azar.siguiente() * 2 - 1) * R.ruidoValor);
  const disponible = Math.max(0, g.oro - R.reservaSueldos * sueldosDe(estado, g.id));
  return Math.floor(Math.min(disponible, percibido * prioridad(g, h) * factorPresupuesto(estado, g, h)));
}

/**
 * Un rival elige sus misiones del día: recibe un tablón de su categoría (con tipos y clases favorecidas,
 * igual que el jugador) y, de la más alta a la más baja, manda el equipo libre con más éxito si supera su
 * mínimo. Devuelve las misiones con su equipo.
 */
export function eligeMisiones(estado: EstadoJuego, azar: Azar, gremioId: string, nuevoId: () => string): { mision: Mision; equipo: Heroe[] }[] {
  const libres = heroesDe(estado, gremioId)
    .filter((h) => h.estado === 'libre')
    .sort((a, b) => b.poder - a.poder)
    .slice(0, 10);
  const tablon = generarTablon(azar, nuevoId, multiplicadores(categoria(gremio(estado, gremioId))));
  const elegidas: { mision: Mision; equipo: Heroe[] }[] = [];
  // Igual que el jugador: cada misión se puede repetir mientras queden equipos libres. De la más alta a la más baja.
  for (const carta of [...tablon].reverse()) {
    for (;;) {
      const disponibles = libres.filter((h) => !elegidas.some((e) => e.equipo.includes(h)));
      if (disponibles.length < carta.equipo) break;
      const equipo = combinaciones(disponibles, carta.equipo).sort((a, b) => probabilidadMision(carta, b) - probabilidadMision(carta, a))[0];
      if (!equipo || probabilidadMision(carta, equipo) < R.probExitoMinima) break;
      elegidas.push({ mision: { ...carta, id: nuevoId() }, equipo });
    }
  }
  return elegidas;
}

function combinaciones<T>(lista: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const resultado: T[][] = [];
  lista.forEach((x, i) => {
    for (const resto of combinaciones(lista.slice(i + 1), k - 1)) resultado.push([x, ...resto]);
  });
  return resultado;
}

/** Al terminar la semana, un rival puede invertir en instalaciones según su estrategia. */
export function invertir(estado: EstadoJuego, azar: Azar, gremioId: string): void {
  const g = gremio(estado, gremioId);
  const p = perfil(g);
  desarrollarRama(estado, g);
  if (!azar.probabilidad(R.probMejora * p.mejora * 2)) return;
  const opciones: Instalacion[] = plazasLibres(estado, gremioId) <= 1 ? ['sede', 'ojeadores'] : ['ojeadores', 'sede'];
  for (const tipo of opciones) {
    const info = infoInstalacion(estado, gremioId, tipo);
    if (info.coste !== null && g.oro - info.coste >= 2 * sueldosDe(estado, gremioId)) {
      mejorar(estado, gremioId, tipo);
      return;
    }
  }
}

/**
 * Desarrollo abstracto de un rival en su rama preferida (cada semana, si le sobran dos semanas de sueldos):
 * la económica suma niveles de establecimiento que dan ingresos; la de investigación completa proyectos.
 * Ambos dan prestigio, igual que al jugador.
 */
export function desarrollarRama(estado: EstadoJuego, g: Gremio): void {
  const D = datosDesarrollo.rivales;
  const colchon = 4 * sueldosDe(estado, g.id);
  const rama = g.perfil?.rama;
  if (rama === 'economico') {
    const niveles = g.nivelesEstablecimientos ?? 0;
    g.oro += niveles * D.ingresoSemanalPorNivel;
    const coste = D.costeNivelEconomico[niveles];
    if (coste !== undefined && g.oro - coste >= colchon) {
      g.oro -= coste;
      g.nivelesEstablecimientos = niveles + 1;
      registrar(estado, 'rival', `${g.nombre} amplía sus negocios.`);
    }
  } else if (rama === 'investigacion') {
    const hechas = g.investigaciones ?? 0;
    if (hechas < D.maxInvestigaciones && g.oro - D.costeInvestigacion >= colchon) {
      g.oro -= D.costeInvestigacion;
      g.investigaciones = hechas + 1;
      registrar(estado, 'rival', `${g.nombre} completa una investigación.`);
    }
  }
}

/** Rival que compraría ahora a este héroe del jugador al precio dado (el más interesado), o null. */
export function comprador(estado: EstadoJuego, h: Heroe, precio: number): Gremio | null {
  const candidatos = Object.values(estado.gremios)
    .filter((g) => !g.esJugador && plazasLibres(estado, g.id) > 0 && g.oro - sueldosDe(estado, g.id) >= precio)
    .sort((a, b) => prioridad(b, h) - prioridad(a, h));
  return candidatos[0] ?? null;
}

/** Héroe con menos potencial de un gremio (el primero del que se desprendería). */
export function masFlojo(estado: EstadoJuego, gremioId: string): Heroe | null {
  return heroesDe(estado, gremioId).sort((a, b) => a.potencial - b.potencial || a.poder - b.poder)[0] ?? null;
}

/** Si un rival supera su plantilla objetivo, deja marchar a su héroe más flojo (que no esté de misión). */
export function ajustarPlantilla(estado: EstadoJuego, gremioId: string): void {
  const g = gremio(estado, gremioId);
  while (g.plantilla.length > R.plantillaObjetivo) {
    const flojo = heroesDe(estado, gremioId)
      .filter((h) => h.estado !== 'en mision')
      .sort((a, b) => a.potencial - b.potencial || a.poder - b.poder)[0];
    if (!flojo) return;
    g.plantilla = g.plantilla.filter((id) => id !== flojo.id);
    delete estado.heroes[flojo.id];
    registrar(estado, 'rival', `${flojo.nombre} deja ${g.nombre}.`);
  }
}
