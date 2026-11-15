// Decisiones del propietario tras la revisión de diseño (2026-11-15).
import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { condicionesAscension } from '../src/motor/ascension';
import { Azar } from '../src/motor/azar';
import { desbloqueado } from '../src/motor/desbloqueos';
import { jugador } from '../src/motor/estado';
import { evaluarEventos } from '../src/motor/eventosSociales';
import { condicionesCompra, ofertaVenta } from '../src/motor/mercado';
import { crearPartida, finalizarDia, terminarPrueba } from '../src/motor/partida';
import { generarReto } from '../src/motor/retos';
import { eligeMisiones } from '../src/motor/rivales';

function avanzarHasta(estado: ReturnType<typeof crearPartida>, dia: number): void {
  while (estado.dia < dia) {
    const r = finalizarDia(estado);
    if (r.prueba) terminarPrueba(estado);
  }
}

describe('desbloqueo progresivo', () => {
  it('la semana 1 solo hay misiones y Prueba; el mercado y las relaciones abren el día 8', () => {
    const estado = crearPartida({ semilla: 3 });
    const deRival = estado.gremios.dragon!.plantilla.find((id) => estado.heroes[id]!.habilidad !== 'juramento')!;
    expect(condicionesCompra(estado, deRival).bloqueo).toMatch(/abre el día 8/);
    expect(ofertaVenta(estado, jugador(estado).plantilla[0]!)).toBeNull();
    estado.heroes[jugador(estado).plantilla[0]!]!.felicidad = 5;
    expect(evaluarEventos(estado)).toEqual([]);
    avanzarHasta(estado, balance.desbloqueo.mercado);
    expect(desbloqueado(estado, 'mercado')).toBe(true);
    expect(desbloqueado(estado, 'relaciones')).toBe(true);
    expect(condicionesCompra(estado, deRival).bloqueo ?? '').not.toMatch(/abre el día/);
    expect(estado.registro.some((e) => e.texto.startsWith('¡Nuevo! Abre el mercado'))).toBe(true);
  });

  it('la Ascensión y los retos llegan en la temporada 2', () => {
    const estado = crearPartida({ semilla: 3 });
    const h = estado.heroes[jugador(estado).plantilla[0]!]!;
    h.poder = h.potencial;
    expect(condicionesAscension(estado, h.id).bloqueo).toMatch(/temporada 2/);
    expect(generarReto(estado, new Azar(1))).toBeNull();
    expect(estado.reto).toBeNull();
    avanzarHasta(estado, balance.desbloqueo.ascension);
    expect(desbloqueado(estado, 'ascension')).toBe(true);
    expect(desbloqueado(estado, 'retos')).toBe(true);
  });
});

describe('ranking por puntos de temporada', () => {
  it('las misiones cumplidas dan puntos y al cerrar la temporada vuelven a 0', () => {
    const estado = crearPartida({ semilla: 5 });
    avanzarHasta(estado, balance.calendario.diasPorTemporada);
    const algunos = Object.values(estado.gremios).some((g) => (g.puntosTemporada ?? 0) > 0);
    expect(algunos).toBe(true);
    avanzarHasta(estado, balance.calendario.diasPorTemporada + 1);
    for (const g of Object.values(estado.gremios)) expect(g.puntosTemporada ?? 0).toBe(0);
  });

  it('un rival no lanza más misiones al día que su tope', () => {
    const estado = crearPartida({ semilla: 5 });
    const tope = Math.ceil(balance.rivales.misionesPorDia[0]!);
    for (let dia = 1; dia <= 6; dia++) {
      estado.dia = dia;
      for (const h of Object.values(estado.heroes)) h.estado = 'libre';
      const n = eligeMisiones(estado, new Azar(dia), 'dragon', () => `m${Math.random()}`).length;
      expect(n).toBeLessThanOrEqual(tope);
    }
  });
});
