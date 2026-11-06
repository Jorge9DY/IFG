// Gremios rivales (biblia, sección 14): misiones diarias, mejoras, límite oculto en las pujas e interés por fichar.
// Cómo se simula su progreso está [Abierto]: esta es una primera versión sencilla y provisional.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { sueldosDe } from './economia';
import { gremio, heroesDe, registrar, type EstadoJuego } from './estado';
import { esDestacado, valor } from './heroes';
import { infoInstalacion, mejorar, plazasLibres, type Instalacion } from './instalaciones';
import { probabilidadExito } from './misiones';
import { RANGOS_MISION, type Gremio, type Heroe, type Mision, type PerfilRival } from './tipos';

const R = balance.rivales;

export function perfil(g: Gremio): PerfilRival {
  if (!g.perfil) throw new Error(`${g.nombre} no tiene perfil de rival`);
  return g.perfil;
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
      base = 0.5 + h.potencial / 80;
      break;
    case 'destacado':
      base = esDestacado(h) ? 1.5 : 0.7;
      break;
    default:
      base = 0.6;
  }
  return base * p.agresividad;
}

/** Fracción (0–1) de su presupuesto que el rival está dispuesto a usar en este héroe. */
export function factorPresupuesto(estado: EstadoJuego, g: Gremio, h: Heroe): number {
  const disponible = g.oro - R.reservaSueldos * sueldosDe(estado, g.id);
  return Math.max(0, Math.min(1, disponible / (valor(h) * 2)));
}

/**
 * Límite oculto de puja de un rival por un candidato (sección 8):
 * Límite = valor percibido × prioridad del gremio × presupuesto disponible. Nunca más del oro que le sobra.
 */
export function limitePuja(estado: EstadoJuego, azar: Azar, g: Gremio, h: Heroe): number {
  if (plazasLibres(estado, g.id) <= 0) return 0;
  // Con la plantilla completa solo pujan por alguien mejor que su héroe más flojo.
  const flojo = masFlojo(estado, g.id);
  if (g.plantilla.length >= R.plantillaObjetivo && flojo && h.potencial <= flojo.potencial) return 0;
  const percibido = valor(h) * (1 + (azar.siguiente() * 2 - 1) * R.ruidoValor);
  const disponible = Math.max(0, g.oro - R.reservaSueldos * sueldosDe(estado, g.id));
  return Math.floor(Math.min(disponible, percibido * prioridad(g, h) * factorPresupuesto(estado, g, h)));
}

/** Misión «estándar» de un rango, para la simulación abstracta de los rivales. */
function misionEstandar(rango: Mision['rango'], id: string): Mision {
  const d = balance.misiones[rango];
  return { id, rango, titulo: '', dificultad: d.dificultad, duracion: d.duracion, recompensa: d.recompensa, equipo: d.equipo };
}

/**
 * Un rival elige sus misiones del día: de la más alta a la más baja, con sus mejores héroes libres,
 * si la probabilidad de éxito supera su mínimo. Devuelve las misiones con su equipo.
 */
export function eligeMisiones(estado: EstadoJuego, gremioId: string, nuevoId: () => string): { mision: Mision; equipo: Heroe[] }[] {
  let huecos = R.misionesSimultaneas - estado.enCurso.filter((c) => c.gremioId === gremioId).length;
  const libres = heroesDe(estado, gremioId)
    .filter((h) => h.estado === 'libre')
    .sort((a, b) => b.poder - a.poder);
  const elegidas: { mision: Mision; equipo: Heroe[] }[] = [];
  for (const rango of [...RANGOS_MISION].reverse()) {
    if (huecos <= 0) break;
    const d = balance.misiones[rango];
    const equipo = libres.slice(0, d.equipo);
    if (equipo.length < d.equipo) continue;
    const poder = equipo.reduce((t, h) => t + h.poder, 0);
    if (probabilidadExito(poder, d.dificultad) < R.probExitoMinima) continue;
    libres.splice(0, d.equipo);
    huecos -= 1;
    elegidas.push({ mision: misionEstandar(rango, nuevoId()), equipo });
  }
  return elegidas;
}

/** Al terminar la semana, un rival puede invertir en instalaciones según su estrategia. */
export function invertir(estado: EstadoJuego, azar: Azar, gremioId: string): void {
  const g = gremio(estado, gremioId);
  const p = perfil(g);
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
