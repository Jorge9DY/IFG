// Modelo de datos del juego (biblia: secciones 4–9 y 14). Todo es serializable con JSON.

export const LETRAS = ['F', 'D', 'C', 'B', 'A', 'S'] as const;
export type Letra = (typeof LETRAS)[number];

export type EstadoHeroe = 'libre' | 'en mision' | 'lesionado' | 'entrenando' | 'trabajando' | 'investigando';

/** Las tres ramas de desarrollo del gremio. */
export const RAMAS = ['militar', 'economico', 'investigacion'] as const;
export type Rama = (typeof RAMAS)[number];

/** Decisión del propietario: cuatro clases, con un solo efecto pasivo cada una. */
export const CLASES = ['Guerrero', 'Mago', 'Explorador', 'Sanador'] as const;
export type Clase = (typeof CLASES)[number];

/** Sección 9: estadísticas de un héroe. Personalidad, relaciones e historia llegan en las fases 3 y 4. */
export interface Heroe {
  id: string;
  nombre: string;
  clase: Clase;
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
  /** El techo real se conoce (tras una Ascensión, el héroe ha mostrado hasta dónde llega). */
  techoConocido?: boolean;
  /** Semanas seguidas sin cobrar el sueldo. */
  semanasSinCobrar: number;
}

export type RangoMision = 'bajo' | 'medio' | 'alto';
export const RANGOS_MISION: readonly RangoMision[] = ['bajo', 'medio', 'alto'];

export interface Mision {
  id: string;
  rango: RangoMision;
  /** Tipo de misión (Caza, Escolta, Mazmorra…). */
  tipo: string;
  /** Clases que favorece: una en las de un héroe, una combinación en las de grupo. */
  clases: Clase[];
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
  /** Rama de desarrollo que prefiere (militar, económica o investigación). */
  rama?: Rama;
}

export interface Gremio {
  id: string;
  nombre: string;
  esJugador: boolean;
  oro: number;
  plantilla: string[];
  nivelSede: number;
  nivelOjeadores: number;
  /** Zona de entrenamiento (0 = no hay). */
  nivelEntrenamiento?: number;
  /** Misiones de rango alto completadas (prestigio). */
  misionesAltas: number;
  /** Novatos destacados fichados en la Prueba (prestigio). */
  novatosDestacados: number;
  /** Retos de maestros ganados (prestigio). */
  retosGanados?: number;
  /** Categorías del torneo de fin de temporada ganadas (prestigio). */
  torneosGanados?: number;
  /** Niveles de establecimientos construidos e investigaciones completadas (prestigio). */
  nivelesEstablecimientos?: number;
  investigaciones?: number;
  /** Clase en la que se especializa un rival: puja más por ella. */
  clase?: Clase;
  /** Categoría del gremio (D–S): sube con el prestigio, nunca baja, y marca el nivel del tablón. */
  categoria?: Letra;
  /** Solo los rivales. */
  personalidad?: string;
  estrategia?: string;
  perfil?: PerfilRival;
}
