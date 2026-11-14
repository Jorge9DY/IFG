import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { prestigio } from '../src/motor/ranking';
import { celebrarTorneo } from '../src/motor/torneo';
import { fichar, heroe, partida } from './fabrica';

describe('torneo de fin de temporada', () => {
  it('cada categoría la gana el campeón de más poder y da oro y prestigio', () => {
    const estado = partida();
    const estrella = fichar(estado, 'jugador', heroe({ id: 'estrella', clase: 'Sanador', poder: 100, potencial: 100 }));
    const oro = jugador(estado).oro;
    const antes = prestigio(jugador(estado));
    const combates = celebrarTorneo(estado, new Azar(1));
    expect(combates.map((c) => c.categoria)).toEqual(balance.torneo.categorias);
    const sanador = combates.find((c) => c.categoria === 'Sanador')!;
    expect(sanador.ganador).toBe('jugador');
    expect(sanador.campeones.find((c) => c.gremioId === 'jugador')!.heroeId).toBe(estrella.id);
    expect(combates.find((c) => c.categoria === 'Absoluta')!.ganador).toBe('jugador');
    expect(jugador(estado).oro).toBeGreaterThanOrEqual(oro + 2 * balance.torneo.oroPorCategoria);
    expect(prestigio(jugador(estado))).toBeGreaterThan(antes);
  });

  it('un gremio sin héroes de una clase no compite en esa categoría', () => {
    const estado = partida();
    for (const id of jugador(estado).plantilla) estado.heroes[id]!.clase = 'Guerrero';
    const mago = celebrarTorneo(estado, new Azar(2)).find((c) => c.categoria === 'Mago')!;
    expect(mago.campeones.some((c) => c.gremioId === 'jugador')).toBe(false);
  });
});
