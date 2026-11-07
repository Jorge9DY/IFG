// Utilidades para crear héroes y partidas de prueba.
import type { EstadoJuego } from '../src/motor/estado';
import { crearPartida } from '../src/motor/partida';
import type { Heroe } from '../src/motor/tipos';

export function heroe(datos: Partial<Heroe> & Pick<Heroe, 'id'>): Heroe {
  return {
    nombre: datos.id,
    clase: 'Guerrero',
    poder: 30,
    potencial: 60,
    sesgoOjeo: 0.5,
    experiencia: 0,
    reputacion: 0,
    lealtad: 60,
    estado: 'libre',
    diasLesion: 0,
    semanasSinCobrar: 0,
    ...datos,
  };
}

/** Partida nueva con semilla fija. */
export function partida(semilla = 7): EstadoJuego {
  return crearPartida({ semilla });
}

/** Mete un héroe en el gremio indicado y lo devuelve. */
export function fichar(estado: EstadoJuego, gremioId: string, h: Heroe): Heroe {
  estado.heroes[h.id] = h;
  estado.gremios[gremioId]!.plantilla.push(h.id);
  return h;
}
