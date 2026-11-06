// Ayudas para que el juego sea fácil de usar sin quitar decisiones: equipo recomendado,
// dificultad de las misiones y ofertas sugeridas. Solo leen el estado y usan reglas del motor.

import { heroesDe, jugador, type EstadoJuego } from '../motor/estado';
import { POSICION_NATURAL, aportacion, vistaPreviaMision, type MiembroEquipo } from '../motor/misiones';
import type { Heroe, Mision } from '../motor/tipos';

/** Héroes del jugador que pueden salir de misión ahora. */
export function heroesLibres(estado: EstadoJuego): Heroe[] {
  return heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'disponible' || h.estado === 'luto');
}

function opcionesRiesgo(estado: EstadoJuego) {
  return { despertarII: estado.partida.despertares >= 2 };
}

/**
 * Equipo recomendado: el de menor poder total que alcanza el 80% de éxito, para arriesgar lo justo.
 * Si ninguno llega, devuelve el equipo más fuerte (hasta 5).
 */
export function equipoRecomendado(estado: EstadoJuego, mision: Mision, candidatos = heroesLibres(estado)): MiembroEquipo[] {
  if (candidatos.length === 0) return [];
  const naturales: MiembroEquipo[] = candidatos.map((h) => ({ heroe: h, posicion: POSICION_NATURAL[h.clase] }));
  const ascendentes = [...naturales].sort(
    (a, b) => aportacion(a, naturales) - aportacion(b, naturales),
  );
  const prob = (equipo: MiembroEquipo[]): number => vistaPreviaMision(mision, equipo, opcionesRiesgo(estado)).probabilidad;
  const poder = (equipo: MiembroEquipo[]): number => equipo.reduce((t, m) => t + aportacion(m, naturales), 0);
  const maximo = Math.min(5, ascendentes.length);
  // De todos los equipos de 1 a 5 héroes consecutivos (de más débil a más fuerte) que llegan al 80%,
  // se queda con el de menor poder total: arriesga lo justo.
  let mejor: MiembroEquipo[] | null = null;
  for (let tam = 1; tam <= maximo; tam++) {
    for (let inicio = 0; inicio + tam <= ascendentes.length; inicio++) {
      const equipo = ascendentes.slice(inicio, inicio + tam);
      if (prob(equipo) >= 80 && (!mejor || poder(equipo) < poder(mejor))) mejor = equipo;
    }
  }
  if (mejor) return mejor;
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

/** Probabilidad de éxito de una misión con el equipo recomendado (null si no hay héroes libres). */
export function probabilidadConMejorEquipo(estado: EstadoJuego, mision: Mision): number | null {
  const equipo = equipoRecomendado(estado, mision);
  if (equipo.length === 0) return null;
  return vistaPreviaMision(mision, equipo, opcionesRiesgo(estado)).probabilidad;
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
