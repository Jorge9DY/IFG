// Acciones especiales de los gremios rivales (sección 13 del diseño).

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import {
  gremio,
  heroe as obtenerHeroe,
  heroesDe,
  jugador,
  nuevoId,
  puesto,
  registrar,
  type AccionesTemporada,
  type EstadoJuego,
  type MisionEnCurso,
} from './estado';
import { valorMercado } from './heroes';
import { pujadorIA } from './ia';
import type { Oferta, Pujador } from './pujas';
import { indiceRango, type Heroe, type Rango } from './tipos';
import { aplicarPerdida } from './vinculos';

const S = balance.sabotajes;

export function accionesTemporada(estado: EstadoJuego): AccionesTemporada {
  estado.accionesTemporada ??= { vetoUsado: false, ofertaCoronaHecha: false, puestoInicial: 5 };
  return estado.accionesTemporada;
}

/**
 * Modo amenaza: si el jugador ha subido 2 puestos o más desde el inicio de la temporada,
 * los rivales pujan más fuerte contra él y el Colmillo sabotea el doble.
 */
export function enAmenaza(estado: EstadoJuego): boolean {
  const inicial = accionesTemporada(estado).puestoInicial ?? 5;
  return inicial - puesto(estado, estado.jugadorId) >= S.amenazaPuestos;
}

function anunciarAmenaza(estado: EstadoJuego): void {
  const acciones = accionesTemporada(estado);
  if (acciones.amenazaAnunciada || !enAmenaza(estado)) return;
  acciones.amenazaAnunciada = true;
  registrar(estado, 'sabotaje', 'Los demás gremios empiezan a tomarse en serio a la Llama Menguante: pujarán más fuerte y el Colmillo redobla sus sabotajes.');
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
  const multiplicador = enAmenaza(estado) ? S.amenazaAgresividad : 1;
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
    return pujadorIA(estado, azar, id, heroe, bonus, primaMinima, multiplicador);
  });
}

/**
 * Sabotajes del Colmillo Carmesí al empezar el cierre de la semana (desde la semana 5):
 * - Rumor: −5 de reputación al jugador; si su reputación supera 70, se descubre y lo pierde el Colmillo.
 * - Robo de misión: le quita al jugador una de las misiones enviadas esta semana; el equipo vuelve sin recompensa.
 * - Soborno: tienta a un héroe Codicioso; si no se le sube el salario antes del próximo cierre, se va al Colmillo.
 * En modo amenaza, cada sabotaje tira dos veces.
 */
export function sabotajesColmillo(estado: EstadoJuego, azar: Azar): void {
  const colmillo = estado.gremios.colmillo;
  // Al principio nadie se fija en el gremio recién llegado.
  if (!colmillo || estado.partida.semana < S.semanaInicioSabotajes) return;
  anunciarAmenaza(estado);
  const tiradas = enAmenaza(estado) ? 2 : 1;
  for (let i = 0; i < tiradas; i++) {
    rumor(estado, azar);
    roboDeMision(estado, azar);
    soborno(estado, azar);
  }
}

function rumor(estado: EstadoJuego, azar: Azar): void {
  const colmillo = estado.gremios.colmillo;
  const j = jugador(estado);
  if (!colmillo) return;
  if (azar.probabilidad(S.probRumor)) {
    if (j.reputacion > S.reputacionDescubre) {
      colmillo.reputacion = Math.max(0, colmillo.reputacion - S.rumorReputacion);
      registrar(estado, 'sabotaje', 'El Colmillo Carmesí intentó difundir un rumor contra el gremio, pero nadie le creyó.');
    } else {
      j.reputacion = Math.max(0, j.reputacion - S.rumorReputacion);
      registrar(estado, 'sabotaje', `Un rumor del Colmillo Carmesí corre por Aster: −${S.rumorReputacion} de reputación.`);
    }
  }

}

function roboDeMision(estado: EstadoJuego, azar: Azar): void {
  const j = jugador(estado);
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

function soborno(estado: EstadoJuego, azar: Azar): void {
  const sobornos = (estado.sobornos ??= []);
  const candidatos = heroesDe(estado, estado.jugadorId).filter(
    (h) =>
      h.id !== 'h_000_elara' &&
      h.rasgos.includes('Codicioso') &&
      h.estado !== 'en mision' &&
      !sobornos.some((s) => s.heroeId === h.id),
  );
  if (candidatos.length === 0 || !azar.probabilidad(S.probSoborno)) return;
  const h = azar.elegir(candidatos);
  const actual = h.contrato?.salario ?? 0;
  const salarioPedido = Math.max(actual + S.sobornoSubidaMinima, Math.round(actual * S.sobornoSubidaSalario));
  sobornos.push({ heroeId: h.id, salarioPedido, semanaLimite: estado.partida.semana + 1 });
  registrar(
    estado,
    'sabotaje',
    `El Colmillo Carmesí intenta sobornar a ${h.nombre}. Se irá al cierre de la semana que viene si no le subes el salario a ${salarioPedido}.`,
  );
}

/** El jugador iguala el soborno: sube el salario del héroe y se queda. */
export function retenerHeroe(estado: EstadoJuego, heroeId: string): void {
  const s = estado.sobornos?.find((x) => x.heroeId === heroeId);
  if (!s) throw new Error('Ese héroe no tiene ningún soborno pendiente');
  const h = obtenerHeroe(estado, heroeId);
  if (h.contrato) h.contrato.salario = s.salarioPedido;
  estado.sobornos = (estado.sobornos ?? []).filter((x) => x !== s);
  registrar(estado, 'sabotaje', `${h.nombre} se queda en el gremio con un salario de ${s.salarioPedido}.`);
}

/**
 * Resuelve los sobornos que vencen en este cierre: el héroe no retenido se va al Colmillo.
 * Si está de misión, se espera a que vuelva. Devuelve los ids de héroes que abandonan por vínculos.
 */
export function resolverSobornos(estado: EstadoJuego, azar: Azar): string[] {
  const semana = estado.partida.semana;
  const j = jugador(estado);
  const colmillo = estado.gremios.colmillo;
  const abandonan: string[] = [];
  const pendientes: NonNullable<EstadoJuego['sobornos']> = [];
  for (const s of estado.sobornos ?? []) {
    const h = estado.heroes[s.heroeId];
    if (!h || !j.plantilla.includes(h.id) || !colmillo) continue;
    if (s.semanaLimite > semana || h.estado === 'en mision') {
      pendientes.push(s);
      continue;
    }
    abandonan.push(...aplicarPerdida(estado, azar, h, j.id, 'venta'));
    j.plantilla = j.plantilla.filter((id) => id !== h.id);
    colmillo.plantilla.push(h.id);
    h.contrato = { gremio: colmillo.id, salario: s.salarioPedido, temporadasRestantes: 2, clausula: Math.round(valorMercado(h) * 1.5) };
    if (h.estado !== 'herido') h.estado = 'disponible';
    estado.enVenta = estado.enVenta.filter((t) => t.heroeId !== h.id);
    estado.ofertas = estado.ofertas.filter((o) => o.heroeId !== h.id);
    registrar(estado, 'sabotaje', `${h.nombre} acepta el soborno y se marcha al Colmillo Carmesí.`);
  }
  estado.sobornos = pendientes;
  return abandonan;
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
  estado.accionesTemporada = { vetoUsado: false, ofertaCoronaHecha: false, puestoInicial: puesto(estado, estado.jugadorId) };
}
