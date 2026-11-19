// Utilidades para crear héroes y partidas de prueba.
import { Azar } from '../src/motor/azar';
import type { EstadoJuego } from '../src/motor/estado';
import { CATALOGO, heroeDeCatalogo } from '../src/motor/heroes';
import { MOMENTOS } from '../src/motor/historia';
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
/** Partida nueva con semilla fija y todos los sistemas abiertos (las pruebas del desbloqueo usan crearPartida). */
export function partida(semilla = 7): EstadoJuego {
  const estado = crearPartida({ semilla });
  estado.desbloqueos = ['mercado', 'relaciones', 'ascension', 'retos'];
  // Sin momentos de la historia: las pruebas de reglas no deben depender del guion (tests/historia.test.ts usa crearPartida).
  estado.historia.vistos = MOMENTOS.map((m) => m.id);
  return estado;
}

/** Mete un héroe en el gremio indicado y lo devuelve. */
export function fichar(estado: EstadoJuego, gremioId: string, h: Heroe): Heroe {
  estado.heroes[h.id] = h;
  estado.gremios[gremioId]!.plantilla.push(h.id);
  return h;
}

/** Ficha en el gremio del jugador a un héroe del catálogo (los antiguos Prota ahora llegan por la Prueba). */
export function ficharDeCatalogo(estado: EstadoJuego, catalogoId: string): Heroe {
  const f = CATALOGO.find((x) => x.id === catalogoId)!;
  estado.bolsaNovatos = estado.bolsaNovatos.filter((id) => id !== catalogoId);
  return fichar(estado, 'jugador', heroeDeCatalogo(new Azar(1), f, 'hoja'));
}
