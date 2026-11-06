// Modelo de datos del juego (sección 17 del documento de diseño).

export const RANGOS = ['F', 'D', 'C', 'B', 'A', 'S'] as const;
export type Rango = (typeof RANGOS)[number];

export type Clase = 'Tanque' | 'Guerrero' | 'Mago' | 'Sanador' | 'Explorador' | 'Soporte';
export type Raza = 'Humano' | 'Elfo' | 'Enano' | 'Bestiahombre' | 'Draconido' | 'Demonio menor';
export type Elemento = 'Fuego' | 'Agua' | 'Tierra' | 'Viento' | 'Luz' | 'Sombra';
export type Posicion = 'vanguardia' | 'centro' | 'retaguardia';
export type TipoVinculo = 'Romance' | 'Familia' | 'Amistad' | 'Rivalidad';
export type Rasgo =
  | 'Codicioso'
  | 'Leal'
  | 'Temerario'
  | 'Cobarde'
  | 'Ambicioso'
  | 'Romantico'
  | 'Veterano';
export type EstadoHeroe = 'disponible' | 'en mision' | 'herido' | 'luto';

export interface Stats {
  poder: number;
  defensa: number;
  magia: number;
  agilidad: number;
  moral: number;
}

export interface Vinculo {
  con: string;
  tipo: TipoVinculo;
  oculto: boolean;
}

export interface Contrato {
  gremio: string;
  salario: number;
  temporadasRestantes: number;
  clausula: number;
}

export interface Heroe {
  id: string;
  nombre: string;
  edad: number;
  raza: Raza;
  rango: Rango;
  potencial: Rango;
  potencialVisible: boolean;
  clase: Clase;
  elemento: Elemento;
  stats: Stats;
  rasgos: Rasgo[];
  vinculos: Vinculo[];
  contrato: Contrato | null;
  estado: EstadoHeroe;
  semanasFuera: number;
  xp: number;
  misionesExito: number;
}

export type EtiquetaMision = 'Caza' | 'Escolta' | 'Exploracion' | 'Rescate' | 'Mazmorra';

export interface Mision {
  id: string;
  rango: Rango;
  etiqueta: EtiquetaMision;
  elemento: Elemento;
  poderRecomendado: number;
  duracion: number;
  recompensa: { oro: number; prestigio: number; xp: number };
  heroeRescatable: string | null;
}

export type Mejora =
  | 'Dormitorios I'
  | 'Dormitorios II'
  | 'Enfermeria'
  | 'Sala de entrenamiento'
  | 'Biblioteca arcana'
  | 'Salon de banquetes';

export interface Gremio {
  id: string;
  nombre: string;
  esJugador: boolean;
  oro: number;
  deuda: number;
  prestigio: number;
  reputacion: number;
  especialidad: Clase | null;
  plantilla: string[];
  plantillaMax: number;
  mejoras: Mejora[];
  puntosMisionTemporada: number;
  cierresNegativos: number;
  muertesTemporadaPasada: number;
}

export interface Partida {
  protagonista: { nombre: string; aspecto: number };
  modoClemente: boolean;
  temporada: number;
  semana: number;
  despertares: number;
  sospecha: number;
  afinidadElara: number;
  semilla: number;
}

export function indiceRango(rango: Rango): number {
  return RANGOS.indexOf(rango);
}
