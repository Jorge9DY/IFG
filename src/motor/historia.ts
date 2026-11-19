// Modo historia (decisión del propietario: eventos con guion y finales según en qué héroes inviertes).
// Tramas (arcos por grupo de personajes), momentos y epílogos en src/datos/historia.json. Ese archivo se
// genera desde el panel de tramas con herramientas/importar-panel.ts (ver docs/guia-narrativa.md).
// Cada día, al terminar, se busca el primer momento cuyas condiciones se cumplen. Solo hay uno pendiente a
// la vez y el jugador lo decide antes de seguir. Cada momento ocurre una vez por partida.

import balance from '../datos/balance.json';
import datos from '../datos/historia.json';
import { marcharse } from './economia';
import { heroesDe, jugador, puesto, registrar, temporadaDe, type EstadoJuego } from './estado';
import { alLimite, indiceLetra, letraDe, valorPublico } from './heroes';
import { sumarPuntos } from './ranking';
import { cambiarMental } from './relaciones';
import type { Heroe, Letra } from './tipos';

export interface Condicion {
  dia?: number;
  temporada?: number;
  rango?: string;
  alLimite?: boolean;
  marca?: string;
  sinMarca?: string;
  /** Hacen falta todas estas marcas. */
  marcas?: string[];
  /** Basta con una de estas marcas (varias decisiones que llevan al mismo momento). */
  algunaMarca?: string[];
  /** Ninguna de estas marcas. */
  sinMarcas?: string[];
  vidaMax?: number;
  misionCumplida?: boolean;
  puestoMax?: number;
  enGremio?: boolean;
  muerto?: boolean;
  causa?: string;
  fuera?: boolean;
}

export interface EfectoHistoria {
  objetivo?: 'heroe' | 'gremio';
  /** Héroe del catálogo al que afecta (si no, el del momento). Sirve para favorecer a uno y perjudicar a otro. */
  heroe?: string;
  felicidad?: number;
  estres?: number;
  lealtad?: number;
  poder?: number;
  oro?: number;
  puntos?: number;
  marca?: string;
  accion?: 'marcharse' | 'descanso' | 'venderDragon';
}

export type TipoMomento = 'momento' | 'dilema' | 'evento';

export interface Momento {
  id: string;
  /** Trama a la que pertenece (agrupa los momentos de un grupo de personajes). */
  trama?: string;
  /** «dilema»: la gran decisión moral de la semana; «momento» y «evento»: escenas más pequeñas. */
  tipo?: TipoMomento;
  heroe?: string;
  /** Personaje que no es héroe (p. ej. la antigua maestra) y que protagoniza la escena. */
  personaje?: string;
  /** Héroe del catálogo cuyo retrato se muestra aunque no sea el protagonista (p. ej. Solus). */
  cara?: string;
  si: Condicion;
  titulo: string;
  texto: string;
  opciones: { texto: string; efectos: EfectoHistoria[] }[];
}

/** Personaje sin ficha de héroe: no lucha ni sale en misiones. */
export interface Personaje {
  id: string;
  nombre: string;
  papel: string;
  descripcion?: string;
}

/** Trama: un grupo de personajes y su arco (ficha de trama de docs/guia-narrativa.md). */
export interface Trama {
  id: string;
  nombre: string;
  premisa?: string;
  reparto?: string[];
}

export const MOMENTOS: readonly Momento[] = datos.momentos as Momento[];
export const PERSONAJES: readonly Personaje[] = (datos.personajes ?? []) as Personaje[];
export const TRAMAS: readonly Trama[] = (datos.tramas ?? []) as Trama[];

export function personaje(id: string | undefined): Personaje | null {
  return PERSONAJES.find((p) => p.id === id) ?? null;
}
const EPILOGOS = datos.epilogos as { heroe: string; si: Condicion; texto: string }[];

/** El héroe del catálogo, esté donde esté (los Zombies no cuentan). */
export function heroeDeCatalogo(estado: EstadoJuego, catalogoId: string): Heroe | null {
  return Object.values(estado.heroes).find((h) => h.catalogo === catalogoId && !h.zombie) ?? null;
}

export function tieneMarca(estado: EstadoJuego, marca: string): boolean {
  return estado.historia.marcas.includes(marca);
}

/** ¿Se cumplen las condiciones? Si hay héroe, por defecto tiene que estar en el gremio del jugador. */
export function cumple(estado: EstadoJuego, si: Condicion, catalogoId?: string): boolean {
  const j = jugador(estado);
  if (si.dia !== undefined && estado.dia < si.dia) return false;
  if (si.temporada !== undefined && temporadaDe(estado.dia) < si.temporada) return false;
  if (si.marca && !tieneMarca(estado, si.marca)) return false;
  if (si.sinMarca && tieneMarca(estado, si.sinMarca)) return false;
  if (si.marcas && !si.marcas.every((x) => tieneMarca(estado, x))) return false;
  if (si.algunaMarca?.length && !si.algunaMarca.some((x) => tieneMarca(estado, x))) return false;
  if (si.sinMarcas?.some((x) => tieneMarca(estado, x))) return false;
  if (si.puestoMax !== undefined && puesto(estado, j.id) > si.puestoMax) return false;
  if (!catalogoId) return true;
  const caido = estado.caidos.find((c) => c.id === catalogoId);
  if (si.muerto !== undefined) return si.muerto === !!caido && (!si.causa || caido?.causa === si.causa);
  const h = heroeDeCatalogo(estado, catalogoId);
  const enGremio = !!h && j.plantilla.includes(h.id);
  if (si.fuera) return !enGremio && !caido && estado.habilidadesConocidas.includes(catalogoId);
  if ((si.enGremio ?? true) !== enGremio || !h) return false;
  if (si.rango && indiceLetra(letraDe(h.poder)) < indiceLetra(si.rango as Letra)) return false;
  if (si.alLimite && !alLimite(h)) return false;
  if (si.vidaMax !== undefined && Number(h.memoria?.vida ?? 10) > si.vidaMax) return false;
  if (si.misionCumplida && !h.memoria?.cumplida) return false;
  return true;
}

/** Busca el siguiente momento de la historia (si no hay uno pendiente). Lo deja pendiente y lo devuelve. */
export function evaluarHistoria(estado: EstadoJuego): Momento | null {
  if (estado.historia.pendiente || estado.fase === 'victoria') return null;
  const m = MOMENTOS.find((x) => !estado.historia.vistos.includes(x.id) && cumple(estado, x.si, x.heroe));
  if (!m) return null;
  estado.historia.pendiente = m.id;
  return m;
}

export function momentoPendiente(estado: EstadoJuego): Momento | null {
  return MOMENTOS.find((m) => m.id === estado.historia.pendiente) ?? null;
}

/** El héroe más valioso del jugador (para la oferta del Dragón). */
function mejorHeroe(estado: EstadoJuego): Heroe | null {
  return heroesDe(estado, estado.jugadorId).filter((h) => h.estado !== 'en mision').sort((a, b) => b.poder - a.poder)[0] ?? null;
}

/** El jugador elige una opción. Aplica los efectos, guarda la marca y la memoria. Devuelve lo que pasa. */
export function decidirMomento(estado: EstadoJuego, opcion: number): string[] {
  const m = momentoPendiente(estado);
  if (!m) throw new Error('No hay ningún momento pendiente');
  const o = m.opciones[opcion];
  if (!o) throw new Error('Esa opción no existe');
  const j = jugador(estado);
  const h = m.heroe ? heroeDeCatalogo(estado, m.heroe) : null;
  const textos: string[] = [];
  for (const e of o.efectos) {
    const otro = e.heroe ? heroeDeCatalogo(estado, e.heroe) : null;
    const delJugador = otro && j.plantilla.includes(otro.id) ? otro : null;
    const objetivos = e.objetivo === 'gremio' ? heroesDe(estado, j.id) : e.heroe ? (delJugador ? [delJugador] : []) : h ? [h] : [];
    for (const x of objetivos) {
      if (e.felicidad || e.estres) cambiarMental(x, { felicidad: e.felicidad, estres: e.estres });
      if (e.lealtad) x.lealtad = Math.max(0, Math.min(100, x.lealtad + e.lealtad));
      if (e.poder) {
        x.poder = Math.max(1, x.poder + e.poder);
        x.potencial = Math.max(x.potencial, x.poder);
      }
    }
    if (e.oro) j.oro += e.oro;
    if (e.puntos) j.puntosTemporada = (j.puntosTemporada ?? 0) + e.puntos;
    if (e.marca && !tieneMarca(estado, e.marca)) estado.historia.marcas.push(e.marca);
    const quien = e.heroe ? delJugador : h;
    if (e.accion === 'marcharse' && quien && j.plantilla.includes(quien.id)) marcharse(estado, quien, j, `${quien.nombre} se despide`);
    if (e.accion === 'descanso' && quien && quien.estado === 'libre') {
      quien.estado = 'descansando';
      quien.diasLesion = 3;
    }
    if (e.accion === 'venderDragon') {
      const mejor = mejorHeroe(estado);
      const dragon = estado.gremios.dragon;
      if (mejor && dragon) {
        const precio = Math.round((valorPublico(mejor) * balance.historia.ofertaDragon) / 50) * 50;
        j.plantilla = j.plantilla.filter((id) => id !== mejor.id);
        dragon.plantilla.push(mejor.id);
        j.oro += precio;
        textos.push(`${mejor.nombre} se va al Dragón Carmesí por ${precio.toLocaleString('es-ES')} de oro.`);
      }
    }
  }
  estado.historia.vistos.push(m.id);
  estado.historia.pendiente = null;
  const resumen = `${m.titulo}: ${o.texto.toLowerCase()}.`;
  registrar(estado, 'temporada', resumen);
  return [resumen, ...textos];
}

/** Epílogos al terminar la historia: uno por héroe con arco, el primero cuyas condiciones se cumplan. */
export function epilogos(estado: EstadoJuego): { heroe: string; texto: string }[] {
  const r: { heroe: string; texto: string }[] = [];
  for (const e of EPILOGOS) {
    if (r.some((x) => x.heroe === e.heroe)) continue;
    // Los de marca solo miran la marca; los de muerte o marcha miran al héroe.
    if (cumple(estado, e.si, e.si.marca ? undefined : e.heroe)) r.push({ heroe: e.heroe, texto: e.texto });
  }
  return r;
}

/** Cuántos arcos de héroe se han completado (los tres momentos o su desenlace). */
export function arcosCompletos(estado: EstadoJuego): number {
  const porHeroe = new Map<string, number>();
  for (const m of MOMENTOS) if (m.heroe) porHeroe.set(m.heroe, (porHeroe.get(m.heroe) ?? 0) + 1);
  let n = 0;
  for (const [heroe, total] of porHeroe) if (MOMENTOS.filter((m) => m.heroe === heroe && estado.historia.vistos.includes(m.id)).length >= Math.min(total, 2)) n++;
  return n;
}

