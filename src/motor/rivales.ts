// Acciones especiales de los gremios rivales (sección 13 del diseño).

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import {
  gremio,
  heroe as obtenerHeroe,
  heroesDe,
  jugador,
  nuevoId,
  registrar,
  type AccionesTemporada,
  type EstadoJuego,
  type MisionEnCurso,
} from './estado';
import { valorMercado } from './heroes';
import { pujadorIA } from './ia';
import type { Oferta, Pujador } from './pujas';
import { indiceRango, type Heroe, type Rango } from './tipos';

const S = balance.sabotajes;

export function accionesTemporada(estado: EstadoJuego): AccionesTemporada {
  estado.accionesTemporada ??= { vetoUsado: false, ofertaCoronaHecha: false };
  return estado.accionesTemporada;
}

/**
 * Pujadores de los rivales cuando el jugador puja por un héroe, con sus acciones especiales:
 * - Veto del Duque (Corona): una vez por temporada, +15 puntos por un héroe de rango B o superior.
 * - Espionaje (Tejedores): si tienen un Explorador, conocen la oferta de la ronda 1 del jugador y la superan.
 */
export function pujadoresRivales(
  estado: EstadoJuego,
  azar: Azar,
  heroe: Heroe,
  interesados: readonly string[],
  ofertaJugador: Oferta | undefined,
): Pujador[] {
  const acciones = accionesTemporada(estado);
  return interesados.map((id) => {
    let bonus = 0;
    let primaMinima = 0;
    if (id === 'corona' && !acciones.vetoUsado && indiceRango(heroe.rango) >= indiceRango(S.rangoMinimoVeto as Rango)) {
      acciones.vetoUsado = true;
      bonus = S.vetoDuque;
      registrar(estado, 'sabotaje', `El Duque Valdric ejerce su veto en la puja por ${heroe.nombre}.`);
    }
    if (id === 'tejedores' && ofertaJugador && heroesDe(estado, id).some((h) => h.clase === 'Explorador')) {
      primaMinima = Math.round(ofertaJugador.prima * S.primaEspionaje);
      registrar(estado, 'sabotaje', `Los Tejedores del Velo parecían conocer tu oferta por ${heroe.nombre}.`);
    }
    return pujadorIA(estado, azar, id, heroe, bonus, primaMinima);
  });
}

/**
 * Sabotajes del Colmillo Carmesí al empezar el cierre de la semana (desde la semana 5):
 * - Rumor: −5 de reputación al jugador; si su reputación supera 70, se descubre y lo pierde el Colmillo.
 * - Robo de misión: le quita al jugador una de las misiones enviadas esta semana; el equipo vuelve sin recompensa.
 */
export function sabotajesColmillo(estado: EstadoJuego, azar: Azar): void {
  const colmillo = estado.gremios.colmillo;
  // Al principio nadie se fija en el gremio recién llegado.
  if (!colmillo || estado.partida.semana < S.semanaInicioSabotajes) return;
  const j = jugador(estado);

  if (azar.probabilidad(S.probRumor)) {
    if (j.reputacion > S.reputacionDescubre) {
      colmillo.reputacion = Math.max(0, colmillo.reputacion - S.rumorReputacion);
      registrar(estado, 'sabotaje', 'El Colmillo Carmesí intentó difundir un rumor contra el gremio, pero nadie le creyó.');
    } else {
      j.reputacion = Math.max(0, j.reputacion - S.rumorReputacion);
      registrar(estado, 'sabotaje', `Un rumor del Colmillo Carmesí corre por Aster: −${S.rumorReputacion} de reputación.`);
    }
  }

  const semana = estado.partida.semana;
  const recientes = estado.enCurso.filter((c) => c.gremioId === j.id && c.semanaInicio === semana);
  if (recientes.length > 0 && azar.probabilidad(S.probRoboMision)) {
    const robada: MisionEnCurso = azar.elegir(recientes);
    estado.enCurso = estado.enCurso.filter((c) => c !== robada);
    for (const plaza of robada.equipo) {
      const h = obtenerHeroe(estado, plaza.heroeId);
      if (h.estado === 'en mision') h.estado = 'disponible';
    }
    registrar(
      estado,
      'sabotaje',
      `El Colmillo Carmesí se adelantó y completó la misión ${robada.mision.rango} (${robada.mision.etiqueta}). Tu equipo vuelve sin recompensa.`,
    );
  }
}

/** Oferta anual de la Corona de Acero por el mejor héroe del jugador (semana 10, un 30% por encima de su valor). */
export function ofertaAnualCorona(estado: EstadoJuego): void {
  const acciones = accionesTemporada(estado);
  const corona = estado.gremios.corona;
  if (!corona || acciones.ofertaCoronaHecha || estado.partida.semana < S.semanaOfertaCorona) return;
  const candidatos = heroesDe(estado, estado.jugadorId).filter((h) => h.id !== 'h_000_elara' && h.estado !== 'muerto');
  const mejor = candidatos.sort((a, b) => valorMercado(b) - valorMercado(a))[0];
  acciones.ofertaCoronaHecha = true;
  if (!mejor) return;
  const precio = Math.min(Math.round(valorMercado(mejor) * S.ofertaCoronaFactor), Math.round(gremio(estado, 'corona').oro * 0.5));
  estado.ofertas.push({ id: nuevoId(estado, 'of'), heroeId: mejor.id, compradorId: 'corona', precio, contraofertas: 0 });
  registrar(estado, 'sabotaje', `El Duque Valdric ofrece ${precio} de oro por ${mejor.nombre}. La oferta caduca la semana que viene.`);
}

/** Al empezar una temporada nueva, los rivales recuperan sus acciones anuales. */
export function reiniciarAccionesTemporada(estado: EstadoJuego): void {
  estado.accionesTemporada = { vetoUsado: false, ofertaCoronaHecha: false };
}
