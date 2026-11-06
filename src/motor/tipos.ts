// Modelo de datos del juego (biblia: secciones 4–9 y 14). Todo es serializable con JSON.

export const LETRAS = ['F', 'D', 'C', 'B', 'A', 'S'] as const;
export type Letra = (typeof LETRAS)[number];

export type EstadoHeroe = 'libre' | 'en mision' | 'lesionado';

/** Sección 9: estadísticas de un héroe. Personalidad, relaciones e historia llegan en las fases 3 y 4. */
export interface Heroe {
  id: string;
  nombre: string;
  /** Capacidad de combate actual. */
  poder: number;
  /** Techo de crecimiento (poder máximo). Oculto: el jugador ve un rango de letras. */
  potencial: number;
  /** Desplazamiento fijo (0–1) que coloca la ventana del rango de potencial que ve el jugador. */
  sesgoOjeo: number;
  /** Progreso acumulado hacia el siguiente punto de poder. */
  experiencia: number;
  /** Reconocimiento público (0–100). */
  reputacion: number;
  /** Compromiso con el gremio (0–100). */
  lealtad: number;
  estado: EstadoHeroe;
  /** Días que faltan para recuperarse de una lesión. */
  diasLesion: number;
  /** Semanas seguidas sin cobrar el sueldo. */
  semanasSinCobrar: number;
}

export type RangoMision = 'bajo' | 'medio' | 'alto';
export const RANGOS_MISION: readonly RangoMision[] = ['bajo', 'medio', 'alto'];

export interface Mision {
  id: string;
  rango: RangoMision;
  titulo: string;
  dificultad: number;
  duracion: number;
  recompensa: number;
  equipo: number;
}

export interface PerfilRival {
  /** Qué valora al pujar por un novato. */
  prioridad: 'poder' | 'potencial' | 'destacado' | 'barato';
  agresividad: number;
  /** Probabilidad relativa de invertir en instalaciones. */
  mejora: number;
  /** Si acepta vender a sus héroes en el mercado. */
  vende: boolean;
}

export interface Gremio {
  id: string;
  nombre: string;
  esJugador: boolean;
  oro: number;
  plantilla: string[];
  nivelSede: number;
  nivelOjeadores: number;
  /** Misiones de rango alto completadas (prestigio). */
  misionesAltas: number;
  /** Novatos destacados fichados en la Prueba (prestigio). */
  novatosDestacados: number;
  /** Solo los rivales. */
  personalidad?: string;
  estrategia?: string;
  perfil?: PerfilRival;
}
