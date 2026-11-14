// Muerte (propuesta de Claude, decisión del propietario: «soluciona e implementa la mecánica de muerte»).
//
// Principio: un héroe solo muere por un riesgo que el jugador ve antes de aceptarlo.
// - La Ascensión: si fracasa, el héroe muere (decisión del propietario).
// - Las misiones de rango alto con menos del 35% de éxito llevan la marca «Riesgo de muerte»: si fracasan,
//   cada héroe del equipo puede morir en lugar de lesionarse.
// - Las habilidades que lo dicen: Chimoku (se le acaba la vida), el Segador (sacrificios) e InsectLover
//   (al ascender lo sustituye GodInsect).
// Al morir: el héroe pasa al muro de los caídos, sus compañeros pierden ánimo según lo que los unía,
// Nox hereda parte de su poder y Beato puede evitarlo una vez por temporada.

import balance from '../datos/balance.json';
import { heroesDe, nuevoId, registrar, temporadaDe, type Caido, type EstadoJuego } from './estado';
import { perderCompanero } from './relaciones';
import type { Heroe, Mision } from './tipos';

const M = balance.muerte;

const TEXTO_CAUSA: Record<Caido['causa'], string> = {
  ascension: 'no volvió de su Ascensión',
  mision: 'cayó en una misión imposible',
  vida: 'agotó su vida en combate',
  segador: 'fue sacrificado por el Segador',
  metamorfosis: 'dio su vida a GodInsect',
};

/** true si fracasar esta misión con esa probabilidad puede costar vidas. */
export function riesgoDeMuerte(mision: Mision, probabilidad: number): boolean {
  return (M.rangos as string[]).includes(mision.rango) && mision.tipo !== 'Ascensión' && probabilidad < M.umbralProbabilidad;
}

export function gremioDe(estado: EstadoJuego, heroeId: string): string | null {
  return Object.values(estado.gremios).find((g) => g.plantilla.includes(heroeId))?.id ?? null;
}

export interface ResultadoMuerte {
  murio: boolean;
  /** Héroe que lo ha salvado (Beato), si alguno. */
  salvadoPor: string | null;
  /** Zombie creado por el Segador. */
  zombie: Heroe | null;
  textos: string[];
}

/** Beato puede salvar a cualquiera de su gremio una vez por temporada. */
function salvador(estado: EstadoJuego, gremioId: string | null, h: Heroe, causa: Caido['causa']): Heroe | null {
  if (!gremioId || causa === 'metamorfosis') return null;
  const g = estado.gremios[gremioId];
  if (!g || g.usos?.ultimaOracion === temporadaDe(estado.dia)) return null;
  return heroesDe(estado, gremioId).find((b) => b.habilidad === 'ultimaOracion') ?? null;
}

/** Quita al héroe del gremio y de todo lo que estuviera haciendo. */
function sacar(estado: EstadoJuego, gremioId: string | null, id: string): void {
  if (gremioId) {
    const g = estado.gremios[gremioId]!;
    g.plantilla = g.plantilla.filter((x) => x !== id);
  }
  for (const c of estado.enCurso) c.equipo = c.equipo.filter((x) => x !== id);
  estado.enCurso = estado.enCurso.filter((c) => c.equipo.length > 0);
  estado.entrenamientos = estado.entrenamientos.filter((e) => e.heroeId !== id);
  for (const h of Object.values(estado.heroes)) if (h.amor === id) h.amor = null;
}

/**
 * Un héroe muere (o Beato lo salva). Aplica las consecuencias en su gremio y lo apunta en el muro de los caídos.
 */
export function morir(estado: EstadoJuego, heroeId: string, causa: Caido['causa']): ResultadoMuerte {
  const h = estado.heroes[heroeId];
  if (!h) return { murio: false, salvadoPor: null, zombie: null, textos: [] };
  const gremioId = gremioDe(estado, heroeId);
  const g = gremioId ? estado.gremios[gremioId] : undefined;
  const beato = salvador(estado, gremioId, h, causa);
  if (beato && g) {
    g.usos = { ...(g.usos ?? {}), ultimaOracion: temporadaDe(estado.dia) };
    h.estado = 'lesionado';
    h.diasLesion = M.diasBeato;
    if (h.memoria && causa === 'vida') h.memoria.vida = 1;
    const texto = `${beato.nombre} reza su Última oración: ${h.nombre} sobrevive de milagro, malherido.`;
    registrar(estado, g.esJugador ? 'muerte' : 'rival', texto);
    return { murio: false, salvadoPor: beato.id, zombie: null, textos: [texto] };
  }
  const textos: string[] = [];
  const texto = `${h.nombre} ${TEXTO_CAUSA[causa]}.`;
  textos.push(texto);
  estado.caidos.push({ id: h.id, nombre: h.nombre, clase: h.clase, gremioId: gremioId ?? '', dia: estado.dia, poder: h.poder, causa, texto });
  if (gremioId) textos.push(...perderCompanero(estado, gremioId, h, 'muerte'));
  sacar(estado, gremioId, h.id);
  // Nox hereda parte del poder del caído.
  if (gremioId) {
    for (const nox of heroesDe(estado, gremioId).filter((x) => x.habilidad === 'herencia')) {
      const extra = Math.round(h.poder * M.herenciaNox);
      nox.poder += extra;
      nox.potencial = Math.max(nox.potencial, nox.poder);
      textos.push(`${nox.nombre} hereda ${extra} de poder de ${h.nombre}.`);
    }
  }
  let zombie: Heroe | null = null;
  if (causa === 'segador' && g) {
    const S = balance.habilidades.sacrificio;
    const poder = Math.max(1, Math.round(h.poder * S.factorZombie));
    zombie = {
      ...h,
      id: nuevoId(estado, 'z'),
      nombre: `Zombie ${h.nombre}`,
      poder,
      potencial: poder,
      experiencia: 0,
      estado: 'libre',
      diasLesion: 0,
      animo: 50,
      lealtad: 100,
      amor: null,
      memoria: { ...(h.memoria ?? {}) },
      zombie: true,
    };
    estado.heroes[zombie.id] = zombie;
    g.plantilla.push(zombie.id);
    textos.push(`${h.nombre} se levanta como ${zombie.nombre}.`);
  }
  delete estado.heroes[h.id];
  if (g) for (const t of textos) registrar(estado, g.esJugador ? 'muerte' : 'rival', t);
  return { murio: true, salvadoPor: null, zombie, textos };
}
