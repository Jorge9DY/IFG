// Ayudas para que el juego sea fácil de usar sin quitar decisiones: equipo recomendado,
// dificultad de las misiones y ofertas sugeridas. Solo leen el estado y usan reglas del motor.

import { heroesDe, salariosDe, jugador, type EstadoJuego } from '../motor/estado';
import { salarioPedido, valorMercado } from '../motor/heroes';
import { contextoGremio } from '../motor/ia';
import { POSICION_NATURAL, aportacion, vistaPreviaMision, type MiembroEquipo } from '../motor/misiones';
import { ofertaTotal, puntuacionOferta, type Oferta } from '../motor/pujas';
import type { Heroe, Mision } from '../motor/tipos';

/** Héroes del jugador que pueden salir de misión ahora. */
export function heroesLibres(estado: EstadoJuego): Heroe[] {
  return heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'disponible' || h.estado === 'luto');
}

function opcionesRiesgo(estado: EstadoJuego) {
  return {
    despertarII: estado.partida.despertares >= 2,
    enfermeria: jugador(estado).mejoras.includes('Enfermeria'),
  };
}

/**
 * Equipo recomendado. Busca el equipo más modesto que alcanza
 * el 80% de éxito, para no gastar a los mejores héroes en misiones fáciles: primero prueba con los
 * más débiles y va sustituyéndolos por los más fuertes. Si ninguno llega, devuelve el más fuerte.
 */
export function equipoRecomendado(estado: EstadoJuego, mision: Mision, candidatos = heroesLibres(estado)): MiembroEquipo[] {
  if (candidatos.length < 3) return [];
  const naturales: MiembroEquipo[] = candidatos.map((h) => ({ heroe: h, posicion: POSICION_NATURAL[h.clase] }));
  const ascendentes = [...naturales].sort(
    (a, b) => aportacion(a, naturales) - aportacion(b, naturales),
  );
  const prob = (equipo: MiembroEquipo[]): number => vistaPreviaMision(mision, equipo, opcionesRiesgo(estado)).probabilidad;
  const maximo = Math.min(5, ascendentes.length);
  for (let tam = 3; tam <= maximo; tam++) {
    // Ventana de `tam` héroes que se desliza de los más débiles a los más fuertes.
    for (let inicio = 0; inicio + tam <= ascendentes.length; inicio++) {
      const equipo = ascendentes.slice(inicio, inicio + tam);
      if (prob(equipo) >= 80) return equipo;
    }
  }
  return ascendentes.slice(-maximo);
}

export type NivelDificultad = 'facil' | 'asequible' | 'arriesgada' | 'muy-dificil' | 'sin-equipo';

export const TEXTO_DIFICULTAD: Record<NivelDificultad, string> = {
  facil: 'Fácil',
  asequible: 'Asequible',
  arriesgada: 'Arriesgada',
  'muy-dificil': 'Muy difícil',
  'sin-equipo': 'Sin equipo',
};

export function nivelDificultad(probabilidad: number | null): NivelDificultad {
  if (probabilidad === null) return 'sin-equipo';
  if (probabilidad >= 85) return 'facil';
  if (probabilidad >= 70) return 'asequible';
  if (probabilidad >= 50) return 'arriesgada';
  return 'muy-dificil';
}

/** Probabilidad de éxito de una misión con el equipo recomendado (null si no hay 3 héroes libres). */
export function probabilidadConMejorEquipo(estado: EstadoJuego, mision: Mision): number | null {
  const equipo = equipoRecomendado(estado, mision);
  if (equipo.length < 3) return null;
  return vistaPreviaMision(mision, equipo, opcionesRiesgo(estado)).probabilidad;
}

export type Confianza = 'muy-probable' | 'probable' | 'incierta' | 'dificil' | 'imposible';

export const TEXTO_CONFIANZA: Record<Confianza, string> = {
  'muy-probable': 'Muy probable',
  probable: 'Probable',
  incierta: 'Incierta',
  dificil: 'Difícil',
  imposible: 'No ficharía por ti',
};

/**
 * Lo probable que es ganar una puja con esa puntuación. Un rival típico que paga el valor de
 * mercado ronda los 65–80 puntos; la Corona, con su prestigio, algo más.
 */
export function confianzaPuja(puntuacion: number, elegible: boolean): Confianza {
  if (!elegible) return 'imposible';
  if (puntuacion >= 95) return 'muy-probable';
  if (puntuacion >= 80) return 'probable';
  if (puntuacion >= 65) return 'incierta';
  return 'dificil';
}

export interface OfertaSugerida {
  id: 'justa' | 'generosa' | 'maxima';
  nombre: string;
  oferta: Oferta;
  puntuacion: number;
  confianza: Confianza;
}

/** Oro que se puede ofrecer de prima: el disponible menos 4 semanas de salarios. */
export function oroParaPujar(estado: EstadoJuego): number {
  return Math.max(0, jugador(estado).oro - 4 * salariosDe(estado, estado.jugadorId));
}

export function evaluarOferta(estado: EstadoJuego, heroe: Heroe, oferta: Oferta): { puntuacion: number; confianza: Confianza } {
  const d = puntuacionOferta(ofertaTotal(oferta), valorMercado(heroe), contextoGremio(estado, estado.jugadorId, heroe), heroe.rasgos);
  return { puntuacion: d.total, confianza: confianzaPuja(d.total, d.elegible) };
}

/** Tres ofertas de un clic. Las que no se pueden pagar no aparecen. */
export function ofertasSugeridas(estado: EstadoJuego, heroe: Heroe): OfertaSugerida[] {
  const valor = valorMercado(heroe);
  const salario = salarioPedido(heroe.rango);
  const disponible = oroParaPujar(estado);
  const opciones: { id: OfertaSugerida['id']; nombre: string; prima: number; salario: number }[] = [
    { id: 'justa', nombre: 'Justa', prima: Math.round(valor * 0.9), salario },
    { id: 'generosa', nombre: 'Generosa', prima: Math.round(valor * 1.2), salario: Math.round(salario * 1.1) },
    { id: 'maxima', nombre: 'Todo lo posible', prima: Math.min(disponible, Math.round(valor * 1.5)), salario: Math.round(salario * 1.2) },
  ];
  const vistas = new Set<number>();
  return opciones
    .filter((o) => o.prima <= disponible && o.prima > 0)
    .filter((o) => (vistas.has(o.prima) ? false : (vistas.add(o.prima), true)))
    .map((o) => {
      const oferta: Oferta = { prima: o.prima, salario: o.salario, duracion: 2 };
      return { id: o.id, nombre: o.nombre, oferta, ...evaluarOferta(estado, heroe, oferta) };
    });
}

/** Explicación corta de cada rasgo, para los chips de las cartas. */
export const AYUDA_RASGO: Record<string, string> = {
  Codicioso: 'El dinero le importa más al fichar. El Colmillo puede sobornarlo.',
  Leal: 'Rinde más junto a sus vínculos. No acepta irse si su moral es alta.',
  Temerario: 'Aporta un 10% más de poder, pero arriesga más su vida.',
  Cobarde: 'Nunca muere en misiones de su rango o inferiores.',
  Ambicioso: 'Solo ficha por gremios del Top 3 o con prestigio alto.',
  Romantico: 'Sus vínculos de romance cuentan el doble.',
  Veterano: 'Cuenta como un rango más para el riesgo. Se retira antes.',
};
