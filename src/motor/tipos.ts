// Modelo de datos del juego (biblia: secciones 4–9 y 14). Todo es serializable con JSON.

/** Escala de rangos del modo historia (hoja «Cupos»): de F (poder 1–9) a S (90–100). */
export const LETRAS = ['F', 'E', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'] as const;
export type Letra = (typeof LETRAS)[number];

/** «descansando»: el jugador le ha dado días libres (evento social); cuenta los días en diasLesion. */
export type EstadoHeroe = 'libre' | 'en mision' | 'lesionado' | 'entrenando' | 'descansando';

export type Genero = 'Hombre' | 'Mujer';

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
  /** Felicidad (0–100): satisfacción con su vida en el gremio. Sistema social. */
  felicidad?: number;
  /** Estrés (0–100): presión acumulada. No es lo contrario de la felicidad. */
  estres?: number;
  /** Rasgos de personalidad (2–3, fijos). */
  rasgos?: string[];
  genero?: Genero;
  /** Héroe diseñado del catálogo (src/datos/heroes.json). Los genéricos no tienen. */
  catalogo?: string;
  /** Habilidad única (id del catálogo). */
  habilidad?: string;
  /** Contadores de su habilidad (rachas, cargas, vida…). Plano y serializable. */
  memoria?: Record<string, number | string | number[] | string[]>;
  /** Último día en que volvió de una misión (para el descanso). */
  ultimoRegreso?: number;
  /** Convertido por el Segador. */
  zombie?: boolean;
}

/**
 * Relación entre dos héroes (un solo registro por pareja, clave «a|b» en orden alfabético).
 * La afinidad es compartida; la atracción es direccional: [del primero al segundo, del segundo al primero].
 */
export interface Relacion {
  afinidad: number;
  atraccion: [number, number];
  /** Estado romántico guardado: solo la pareja y la expareja necesitan un evento; el interés se deriva de la atracción. */
  pareja: 'ninguna' | 'pareja' | 'expareja';
  /** Rivalidad: puede coexistir con la amistad. */
  rivales: boolean;
  /** Hechos importantes de la relación (primera misión juntos, salvado, pareja, ruptura…). */
  historial: string[];
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
  /** Puntos de la temporada en curso (ranking). Vuelven a 0 al empezar cada temporada. */
  puntosTemporada?: number;
  /** Categorías del torneo de fin de temporada ganadas (prestigio). */
  torneosGanados?: number;
  /** Clase en la que se especializa un rival: puja más por ella. */
  clase?: Clase;
  /** Categoría del gremio (D–S): sube con el prestigio, nunca baja, y marca el nivel del tablón. */
  categoria?: Letra;
  /** Solo los rivales. */
  personalidad?: string;
  estrategia?: string;
  perfil?: PerfilRival;
  /** Prestigio ganado o perdido por habilidades (Mascota, sabotajes…). */
  prestigioExtra?: number;
  /** Fichajes y ventas de la semana (Dep). */
  movimientosSemana?: number;
  /** Habilidades de «una vez por temporada» ya usadas: id de habilidad → temporada. */
  usos?: Record<string, number>;
  /** Penalización de éxito pendiente para la próxima misión (Trébol). */
  karma?: number;
  /** Deuda con Usura y semanas que lleva sin pagarse. */
  deuda?: { oro: number; semanas: number };
  /** Alianza de Su Alteza: gremio aliado y temporada. */
  alianza?: { gremioId: string; temporada: number };
  /** Factor del coste de las instalaciones esta semana (Chapuzas). */
  factorObras?: number;
}
