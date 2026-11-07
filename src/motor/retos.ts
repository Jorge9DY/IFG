// Retos de los maestros (decisión del propietario, biblia sección 14): un maestro rival te reta a un duelo
// de héroes de una clase y un rango. Eliges a uno de los tuyos sin ver el suyo y gana el más fuerte.
// Para que sea justo, el rival no saca a su mejor héroe, sino a uno del mismo rango. Apuesta en oro;
// si ganas, te llevas la apuesta y prestigio.

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import type { Azar } from './azar';
import { gremio, heroe as obtenerHeroe, heroesDe, jugador, registrar, rivales, type EstadoJuego } from './estado';
import { indiceLetra, letraDe } from './heroes';
import type { Clase, Heroe, Letra } from './tipos';

const T = balance.retos;

export interface Reto {
  gremioId: string;
  clase: Clase;
  rango: Letra;
  apuesta: number;
  /** El reto caduca al finalizar este día (el día 7 de la semana). */
  diaLimite: number;
  /** Resultado, una vez aceptado. */
  resultado: ResultadoReto | null;
}

export interface ResultadoReto {
  heroeJugador: string;
  nombreJugador: string;
  poderJugador: number;
  nombreRival: string;
  poderRival: number;
  /** 'victoria', 'derrota' o 'empate' (nadie paga). */
  desenlace: 'victoria' | 'derrota' | 'empate';
}

function candidatosRival(estado: EstadoJuego, gremioId: string, clase: Clase, rango: Letra): Heroe[] {
  return heroesDe(estado, gremioId).filter((h) => h.clase === clase && letraDe(h.poder) === rango);
}

/**
 * Al empezar la semana, un maestro rival lanza un reto. El rango es el de uno de tus héroes (al azar)
 * y la clase, la de un héroe del rival de ese rango. Si no hay emparejamiento posible, no hay reto.
 */
export function generarReto(estado: EstadoJuego, azar: Azar): Reto | null {
  const mios = heroesDe(estado, estado.jugadorId);
  const opciones: { gremioId: string; clase: Clase; rango: Letra }[] = [];
  const rangos = [...new Set(mios.map((h) => letraDe(h.poder)))];
  for (const g of rivales(estado)) {
    for (const h of heroesDe(estado, g.id)) {
      const rango = letraDe(h.poder);
      if (rangos.includes(rango)) opciones.push({ gremioId: g.id, clase: h.clase, rango });
    }
  }
  if (opciones.length === 0) return null;
  const elegido = azar.elegir(opciones);
  const diasSemana = balance.calendario.diasPorSemana;
  const reto: Reto = {
    ...elegido,
    apuesta: T.apuestaPorRango[indiceLetra(elegido.rango)] ?? T.apuestaPorRango[0] ?? 300,
    diaLimite: Math.ceil(estado.dia / diasSemana) * diasSemana,
    resultado: null,
  };
  estado.reto = reto;
  registrar(estado, 'reto', `El maestro de ${gremio(estado, reto.gremioId).nombre} te reta: ¿tienes un ${reto.clase.toLowerCase()} de rango ${reto.rango} más fuerte que el suyo? Apuesta: ${reto.apuesta} de oro.`);
  return reto;
}

/** Frase del maestro que reta. */
export function fraseReto(gremioId: string): string {
  return (datosGremios.frasesReto as Record<string, string>)[gremioId] ?? '';
}

/** Héroes del jugador que pueden responder al reto (misma clase y mismo rango). */
export function heroesParaReto(estado: EstadoJuego): Heroe[] {
  const r = estado.reto;
  if (!r || r.resultado) return [];
  return heroesDe(estado, estado.jugadorId).filter((h) => h.clase === r.clase && letraDe(h.poder) === r.rango);
}

export function motivoNoAceptar(estado: EstadoJuego, heroeId: string): string | null {
  const r = estado.reto;
  if (!r) return 'No hay ningún reto';
  if (r.resultado) return 'El reto ya se ha resuelto';
  if (!heroesParaReto(estado).some((h) => h.id === heroeId)) return `Hace falta un ${r.clase.toLowerCase()} de rango ${r.rango}`;
  if (jugador(estado).oro < r.apuesta) return 'No tienes oro para cubrir la apuesta';
  return null;
}

/**
 * Acepta el reto con un héroe. El rival saca, sin que lo veas, a uno de los suyos de esa clase y rango
 * (al azar, no al mejor). Gana el de más poder; con empate nadie paga.
 */
export function aceptarReto(estado: EstadoJuego, azar: Azar, heroeId: string): ResultadoReto {
  const motivo = motivoNoAceptar(estado, heroeId);
  if (motivo) throw new Error(motivo);
  const r = estado.reto!;
  const rival = gremio(estado, r.gremioId);
  const j = jugador(estado);
  const mio = obtenerHeroe(estado, heroeId);
  const suyos = candidatosRival(estado, rival.id, r.clase, r.rango);
  // Si el rival ya no tiene a nadie de ese rango (lo vendió o subió), saca al más parecido de esa clase.
  const deClase = heroesDe(estado, rival.id).filter((h) => h.clase === r.clase);
  const suyo = suyos.length > 0
    ? azar.elegir(suyos)
    : deClase.sort((a, b) => Math.abs(a.poder - mio.poder) - Math.abs(b.poder - mio.poder))[0];
  const poderRival = suyo?.poder ?? 0;
  const desenlace = mio.poder > poderRival ? 'victoria' : mio.poder < poderRival ? 'derrota' : 'empate';
  if (desenlace === 'victoria') {
    j.oro += r.apuesta;
    rival.oro -= r.apuesta;
    j.retosGanados = (j.retosGanados ?? 0) + 1;
  } else if (desenlace === 'derrota') {
    j.oro -= r.apuesta;
    rival.oro += r.apuesta;
  }
  const resultado: ResultadoReto = {
    heroeJugador: mio.id,
    nombreJugador: mio.nombre,
    poderJugador: mio.poder,
    nombreRival: suyo?.nombre ?? 'nadie',
    poderRival,
    desenlace,
  };
  r.resultado = resultado;
  const texto = {
    victoria: `${mio.nombre} (${mio.poder}) vence a ${resultado.nombreRival} (${poderRival}) en el reto de ${rival.nombre}: +${r.apuesta} de oro y prestigio.`,
    derrota: `${resultado.nombreRival} (${poderRival}) vence a ${mio.nombre} (${mio.poder}) en el reto de ${rival.nombre}: −${r.apuesta} de oro.`,
    empate: `${mio.nombre} y ${resultado.nombreRival} empatan (${poderRival}) en el reto de ${rival.nombre}.`,
  }[desenlace];
  registrar(estado, 'reto', texto);
  return resultado;
}

/** Rechaza el reto sin coste. */
export function rechazarReto(estado: EstadoJuego): void {
  const r = estado.reto;
  if (!r || r.resultado) return;
  registrar(estado, 'reto', `Rechazas el reto de ${gremio(estado, r.gremioId).nombre}. Su maestro se ríe, pero no pierdes nada.`);
  estado.reto = null;
}

/** Al terminar el día límite, el reto caduca (si no se respondió, cuenta como rechazado, sin coste). */
export function caducarReto(estado: EstadoJuego): void {
  const r = estado.reto;
  if (!r || estado.dia < r.diaLimite) return;
  if (!r.resultado) registrar(estado, 'reto', `El reto de ${gremio(estado, r.gremioId).nombre} caduca sin respuesta.`);
  estado.reto = null;
}
