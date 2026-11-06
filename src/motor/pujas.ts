// Fichajes: Puntuación de Oferta y subasta a ciegas en 3 rondas (sección 7).

import balance from '../datos/balance.json';
import type { Rasgo, TipoVinculo } from './tipos';

const P = balance.pujas;

export interface Oferta {
  /** Prima de fichaje, pagada una vez. */
  prima: number;
  salario: number;
  /** Temporadas de contrato (1–3). */
  duracion: number;
}

/** Lo que cuenta como dinero en la puntuación: prima + 10 semanas de salario. */
export function ofertaTotal(oferta: Oferta): number {
  return oferta.prima + P.semanasSalarioEnOferta * oferta.salario;
}

export interface ContextoGremio {
  gremioId: string;
  prestigio: number;
  reputacion: number;
  /** Puesto en el ranking (1 = primero). */
  puesto: number;
  /** Vínculos que el héroe tiene con miembros de la plantilla de este gremio. */
  vinculosEnPlantilla: TipoVinculo[];
  /** Rivales: la clase coincide con su especialidad. Llama Menguante: puesto titular. */
  bonusEspecialidad: boolean;
  muertesTemporadaPasada: number;
  /** Deuda actual ÷ límite de deuda. */
  ratioDeuda: number;
  /** Bonus extra (marca del Draft, Veto del Duque...). */
  bonusExtra?: number;
}

export interface DesgloseOferta {
  D: number;
  P: number;
  R: number;
  V: number;
  E: number;
  X: number;
  extra: number;
  total: number;
  /** false si el héroe ni siquiera considera al gremio (rasgo Ambicioso). */
  elegible: boolean;
}

export function puntuacionOferta(
  totalOfrecido: number,
  valorMercado: number,
  gremio: ContextoGremio,
  rasgos: readonly Rasgo[],
): DesgloseOferta {
  const D = Math.min(P.topeDinero, (totalOfrecido / valorMercado) * 100);
  const pesoD = rasgos.includes('Codicioso') ? P.pesoDineroCodicioso : P.pesoDinero;

  let V = 0;
  for (const tipo of gremio.vinculosEnPlantilla) {
    let valor = balance.vinculos.fichaje[tipo];
    if (tipo === 'Romance' && rasgos.includes('Romantico')) valor *= 2;
    V += valor;
  }
  V = Math.min(balance.vinculos.topeFichaje, V);
  if (rasgos.includes('Leal')) V *= 2;

  const E = gremio.bonusEspecialidad ? P.bonusEspecialidad : 0;
  const X =
    (gremio.muertesTemporadaPasada >= P.muertesParaRiesgo ? P.riesgoMuertes : 0) +
    (gremio.ratioDeuda > P.umbralDeuda ? P.riesgoDeuda : 0);
  const extra = gremio.bonusExtra ?? 0;

  const total =
    pesoD * D + P.pesoPrestigio * gremio.prestigio + P.pesoReputacion * gremio.reputacion + V + E - X + extra;
  const elegible =
    !rasgos.includes('Ambicioso') || gremio.puesto <= 3 || gremio.prestigio > P.prestigioAmbicioso;

  return { D, P: gremio.prestigio, R: gremio.reputacion, V, E, X, extra, total: redondear(total), elegible };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface Pujador {
  contexto: ContextoGremio;
  /**
   * Devuelve la oferta de esta ronda o null para retirarse.
   * En las rondas 2 y 3 recibe la mejor puntuación rival (no su oferta).
   */
  pujar(ronda: number, mejorRival: number | null): Oferta | null;
}

export interface PuntuacionRonda {
  gremioId: string;
  oferta: Oferta;
  desglose: DesgloseOferta;
}

export interface ResultadoSubasta {
  ganador: string | null;
  oferta: Oferta | null;
  rondas: PuntuacionRonda[][];
}

export function resolverSubasta(
  valorMercado: number,
  rasgos: readonly Rasgo[],
  pujadores: readonly Pujador[],
): ResultadoSubasta {
  const rondas: PuntuacionRonda[][] = [];
  let enJuego = pujadores.filter(
    (p) => puntuacionOferta(0, valorMercado, p.contexto, rasgos).elegible,
  );
  let anteriores = new Map<string, number>();

  for (let ronda = 1; ronda <= 3; ronda++) {
    const puntuaciones: PuntuacionRonda[] = [];
    for (const p of enJuego) {
      const rival = ronda === 1 ? null : mejorRivalDe(p.contexto.gremioId, anteriores);
      const oferta = p.pujar(ronda, rival);
      if (!oferta) continue;
      const desglose = puntuacionOferta(ofertaTotal(oferta), valorMercado, p.contexto, rasgos);
      puntuaciones.push({ gremioId: p.contexto.gremioId, oferta, desglose });
    }
    puntuaciones.sort((a, b) => compararPuntuaciones(a, b, pujadores));
    rondas.push(puntuaciones);

    const [primero, segundo] = puntuaciones;
    if (!primero) return { ganador: null, oferta: null, rondas };
    const decidida =
      !segundo || ronda === 3 || primero.desglose.total - segundo.desglose.total >= P.margenVictoria;
    if (decidida) return { ganador: primero.gremioId, oferta: primero.oferta, rondas };

    const finalistas = new Set([primero.gremioId, segundo.gremioId]);
    enJuego = enJuego.filter((p) => finalistas.has(p.contexto.gremioId));
    anteriores = new Map(puntuaciones.map((x) => [x.gremioId, x.desglose.total]));
  }
  return { ganador: null, oferta: null, rondas };
}

function mejorRivalDe(gremioId: string, puntuaciones: Map<string, number>): number | null {
  let mejor: number | null = null;
  for (const [id, total] of puntuaciones) {
    if (id !== gremioId && (mejor === null || total > mejor)) mejor = total;
  }
  return mejor;
}

/** Mayor puntuación primero; en empate, el gremio con vínculo y después el de más prestigio. */
function compararPuntuaciones(a: PuntuacionRonda, b: PuntuacionRonda, pujadores: readonly Pujador[]): number {
  if (b.desglose.total !== a.desglose.total) return b.desglose.total - a.desglose.total;
  const vinculoA = a.desglose.V > 0 ? 1 : 0;
  const vinculoB = b.desglose.V > 0 ? 1 : 0;
  if (vinculoA !== vinculoB) return vinculoB - vinculoA;
  const prestigio = (id: string): number =>
    pujadores.find((p) => p.contexto.gremioId === id)?.contexto.prestigio ?? 0;
  return prestigio(b.gremioId) - prestigio(a.gremioId);
}
