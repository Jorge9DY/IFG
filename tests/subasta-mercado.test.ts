import { describe, expect, it } from 'vitest';
import { jugador } from '../src/motor/estado';
import { infoInstalacion, mejorar, plazas } from '../src/motor/instalaciones';
import { comprar, condicionesCompra, condicionesRecluta, ofertaVenta, reclutar, vender } from '../src/motor/mercado';
import { calcularRanking, fuerza, prestigio } from '../src/motor/ranking';
import { accionJugador, cerrarSubasta, type Subasta } from '../src/motor/subasta';
import { fichar, heroe, partida } from './fabrica';

function subasta(limites: Record<string, number>): Subasta {
  return {
    heroeId: 'novato',
    precio: 300,
    incremento: 100,
    lider: null,
    activos: ['jugador', ...Object.keys(limites)],
    limites,
    ronda: 1,
    terminada: false,
    historial: [],
  };
}

describe('subasta por turnos', () => {
  it('cada rival sube mientras no pase de su límite oculto y gana la puja más alta', () => {
    const estado = partida();
    estado.heroes.novato = heroe({ id: 'novato' });
    jugador(estado).oro = 10_000;
    const s = subasta({ dragon: 650, corona: 450 });
    accionJugador(estado, s, 'pujar'); // jugador 300 → dragón 400 → corona se retira (500 > 450)
    expect(s.lider).toBe('dragon');
    expect(s.precio).toBe(400);
    expect(s.activos).toEqual(['jugador', 'dragon']);
    accionJugador(estado, s, 'pujar'); // jugador 500 → dragón 600
    expect(s.lider).toBe('dragon');
    accionJugador(estado, s, 'pujar'); // jugador 700 → dragón se retira (800 > 650)
    expect(s.terminada).toBe(true);
    expect(s.lider).toBe('jugador');
    expect(cerrarSubasta(estado, s)).toBe('jugador');
    expect(jugador(estado).oro).toBe(10_000 - 700);
    expect(jugador(estado).plantilla).toContain('novato');
  });

  it('si el jugador se retira, los rivales terminan solos', () => {
    const estado = partida();
    estado.heroes.novato = heroe({ id: 'novato' });
    const s = subasta({ dragon: 900, corona: 450 });
    accionJugador(estado, s, 'retirarse');
    expect(s.terminada).toBe(true);
    expect(s.lider).toBe('dragon');
  });

  it('no se puede pujar sin oro ni sin plazas', () => {
    const estado = partida();
    estado.heroes.novato = heroe({ id: 'novato' });
    jugador(estado).oro = 100;
    expect(() => accionJugador(estado, subasta({ dragon: 900 }), 'pujar')).toThrow(/oro/);
    jugador(estado).oro = 10_000;
    for (let i = jugador(estado).plantilla.length; i < plazas(jugador(estado)); i++) fichar(estado, 'jugador', heroe({ id: `x${i}` }));
    expect(() => accionJugador(estado, subasta({ dragon: 900 }), 'pujar')).toThrow(/plazas/);
  });
});

describe('mercado y reclutamiento', () => {
  it('compra un héroe de un rival que vende', () => {
    const estado = partida();
    const id = estado.gremios.dragon!.plantilla[0]!;
    jugador(estado).oro = 1_000_000;
    const c = condicionesCompra(estado, id);
    expect(c.bloqueo).toBeNull();
    comprar(estado, id);
    expect(jugador(estado).plantilla).toContain(id);
    expect(estado.gremios.dragon!.plantilla).not.toContain(id);
  });

  it('la Última Esperanza no vende a sus veteranos', () => {
    const estado = partida();
    jugador(estado).oro = 1_000_000;
    expect(condicionesCompra(estado, estado.gremios.esperanza!.plantilla[0]!).bloqueo).toMatch(/no vende/);
  });

  it('vende un héroe propio al rival más interesado', () => {
    const estado = partida();
    const id = jugador(estado).plantilla[0]!;
    const oferta = ofertaVenta(estado, id);
    expect(oferta).not.toBeNull();
    const oro = jugador(estado).oro;
    vender(estado, id);
    expect(jugador(estado).oro).toBe(oro + oferta!.precio);
    expect(estado.gremios[oferta!.compradorId]!.plantilla).toContain(id);
  });

  it('recluta a un candidato de la semana', () => {
    const estado = partida();
    const id = estado.reclutas[0]!;
    jugador(estado).oro = 100_000;
    expect(condicionesRecluta(estado, id).bloqueo).toBeNull();
    reclutar(estado, id);
    expect(jugador(estado).plantilla).toContain(id);
    expect(estado.reclutas).not.toContain(id);
  });
});

describe('instalaciones y ranking', () => {
  it('mejorar la sede da plazas y prestigio', () => {
    const estado = partida();
    const j = jugador(estado);
    j.oro = 100_000;
    const plazasAntes = plazas(j);
    const prestigioAntes = prestigio(j);
    mejorar(estado, j.id, 'sede');
    expect(plazas(j)).toBeGreaterThan(plazasAntes);
    expect(prestigio(j)).toBeGreaterThan(prestigioAntes);
    mejorar(estado, j.id, 'ojeadores');
    expect(j.nivelOjeadores).toBe(1);
  });

  it('no se mejora sin oro', () => {
    const estado = partida();
    jugador(estado).oro = 0;
    expect(infoInstalacion(estado, 'jugador', 'sede').bloqueo).toMatch(/oro/);
  });

  it('la fuerza suma solo los 5 mejores: el banquillo no resta', () => {
    const estado = partida();
    const j = jugador(estado);
    j.plantilla = [];
    for (const [i, poder] of [50, 40, 30, 20, 10].entries()) fichar(estado, 'jugador', heroe({ id: `t${i}`, poder }));
    expect(fuerza(estado, j.id)).toBe(150);
    fichar(estado, 'jugador', heroe({ id: 'banquillo', poder: 5 }));
    expect(fuerza(estado, j.id)).toBe(150);
    fichar(estado, 'jugador', heroe({ id: 'estrella', poder: 60 }));
    expect(fuerza(estado, j.id)).toBe(200);
  });

  it('puntos = fuerza + prestigio y el ranking ordena de mayor a menor', () => {
    const estado = partida();
    const r = calcularRanking(estado);
    for (const f of r) expect(f.puntos).toBe(f.fuerza + f.prestigio);
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.puntos).toBeGreaterThanOrEqual(r[i]!.puntos);
  });
});
