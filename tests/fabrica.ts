// Utilidades para crear héroes y misiones de prueba.
import type { Heroe, Mision } from '../src/motor/tipos';

export function heroe(datos: Partial<Heroe> & Pick<Heroe, 'id'>): Heroe {
  return {
    nombre: datos.id,
    edad: 24,
    raza: 'Humano',
    rango: 'D',
    potencial: 'B',
    potencialVisible: false,
    clase: 'Guerrero',
    stats: { poder: 32, defensa: 31, magia: 31, agilidad: 31, moral: 60 },
    rasgos: [],
    vinculos: [],
    contrato: null,
    estado: 'disponible',
    diasFuera: 0,
    xp: 0,
    misionesExito: 0,
    ...datos,
  };
}

export const elara = (): Heroe =>
  heroe({
    id: 'h_000_elara',
    nombre: 'Elara Nocturne',
    rango: 'S',
    potencial: 'S',
    clase: 'Mago',
    stats: { poder: 75, defensa: 72, magia: 99, agilidad: 88, moral: 40 },
  });

export function mision(datos: Partial<Mision> = {}): Mision {
  return {
    id: 'm_prueba',
    rango: 'C',
    etiqueta: 'Caza',
    tipo: 'justa',
    poderRecomendado: 500,
    duracion: 2,
    recompensa: { oro: 1600, prestigio: 2, xp: 40 },
    heroeRescatable: null,
    ...datos,
  };
}
