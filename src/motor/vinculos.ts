// Vínculos, afinidad y moral (sección 12).

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { claveAfinidad, gremio, heroesDe, registrar, type EstadoJuego } from './estado';
import type { Heroe } from './tipos';

const MO = balance.moral;

export function cambiarMoral(heroe: Heroe, delta: number): void {
  heroe.stats.moral = Math.max(0, Math.min(100, heroe.stats.moral + delta));
}

/** Vínculos del héroe con miembros de la plantilla de un gremio. */
export function vinculosEnPlantilla(estado: EstadoJuego, heroe: Heroe, gremioId: string): Heroe['vinculos'] {
  const plantilla = new Set(gremio(estado, gremioId).plantilla);
  return heroe.vinculos.filter((v) => plantilla.has(v.con));
}

/**
 * Consecuencias para la plantilla cuando un héroe muere o es vendido.
 * Devuelve los ids de los héroes que deciden abandonar el gremio.
 */
export function aplicarPerdida(
  estado: EstadoJuego,
  azar: Azar,
  perdido: Heroe,
  gremioId: string,
  motivo: 'muerte' | 'venta',
): string[] {
  const abandonan: string[] = [];
  for (const companero of heroesDe(estado, gremioId)) {
    if (companero.id === perdido.id) continue;
    const vinculo = companero.vinculos.find((v) => v.con === perdido.id);
    if (motivo === 'venta') cambiarMoral(companero, MO.porVenta);
    if (!vinculo) continue;
    switch (vinculo.tipo) {
      case 'Romance':
      case 'Familia': {
        cambiarMoral(companero, motivo === 'muerte' ? MO.vinculadoMuerto : MO.vinculadoVendido);
        if (motivo === 'muerte' && companero.estado === 'disponible') {
          companero.estado = 'luto';
          companero.semanasFuera = MO.semanasLuto;
        }
        const prob = vinculo.tipo === 'Romance' ? MO.probAbandonoRomance : MO.probAbandonoFamilia;
        if (azar.probabilidad(prob) && companero.id !== 'h_000_elara') abandonan.push(companero.id);
        break;
      }
      case 'Amistad':
        cambiarMoral(companero, MO.amistadMuerta);
        break;
      case 'Rivalidad':
        cambiarMoral(companero, MO.rivalMuerto);
        break;
    }
  }
  for (const id of abandonan) {
    const h = estado.heroes[id];
    if (h) registrar(estado, 'abandono', `${h.nombre} abandona el gremio tras perder a ${perdido.nombre}.`);
  }
  return abandonan;
}

/** +3 de afinidad entre cada par de un equipo con éxito; con 60 o más nace una Amistad. */
export function sumarAfinidadEquipo(estado: EstadoJuego, equipo: readonly Heroe[]): void {
  for (let i = 0; i < equipo.length; i++) {
    for (let j = i + 1; j < equipo.length; j++) {
      const a = equipo[i]!;
      const b = equipo[j]!;
      const clave = claveAfinidad(a.id, b.id);
      const valor = (estado.afinidades[clave] ?? 0) + 3;
      estado.afinidades[clave] = valor;
      if (valor >= 60 && !a.vinculos.some((v) => v.con === b.id)) {
        a.vinculos.push({ con: b.id, tipo: 'Amistad', oculto: false });
        b.vinculos.push({ con: a.id, tipo: 'Amistad', oculto: false });
      }
    }
  }
}

/** La Moral tiende a 60 poco a poco; el Salón de banquetes suma 5 por semana. */
export function derivaMoral(heroe: Heroe, banquetes: boolean): void {
  const objetivo = MO.objetivo;
  const m = heroe.stats.moral;
  if (m < objetivo) cambiarMoral(heroe, Math.min(MO.derivaSemanal, objetivo - m));
  else if (m > objetivo) cambiarMoral(heroe, -Math.min(MO.derivaSemanal, m - objetivo));
  if (banquetes) cambiarMoral(heroe, 5);
}
