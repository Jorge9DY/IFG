import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { condicionesEntrenamiento, costeEntrenamiento, entrenar, plazasEntrenamiento } from '../src/motor/entrenamiento';
import { jugador } from '../src/motor/estado';
import { mejorar } from '../src/motor/instalaciones';
import { ofertaVenta } from '../src/motor/mercado';
import { finalizarDia } from '../src/motor/partida';
import { prestigio } from '../src/motor/ranking';
import { fichar, heroe, partida } from './fabrica';

const E = balance.entrenamiento;
const I = balance.instalaciones.entrenamiento;

function conZona(niveles = 1) {
  const estado = partida();
  jugador(estado).oro = 1_000_000;
  for (let i = 0; i < niveles; i++) mejorar(estado, 'jugador', 'entrenamiento');
  const h = fichar(estado, 'jugador', heroe({ id: 'flojo', poder: 15, potencial: 60 }));
  return { estado, h };
}

describe('zona de entrenamiento', () => {
  it('hay que construirla antes de entrenar, y da prestigio', () => {
    const estado = partida();
    const h = fichar(estado, 'jugador', heroe({ id: 'flojo', poder: 15, potencial: 60 }));
    expect(plazasEntrenamiento(estado)).toBe(0);
    expect(condicionesEntrenamiento(estado, h.id).bloqueo).toMatch(/Construye/);
    jugador(estado).oro = 100_000;
    const antes = prestigio(jugador(estado));
    mejorar(estado, 'jugador', 'entrenamiento');
    expect(plazasEntrenamiento(estado)).toBe(I.plazas[1]);
    expect(prestigio(jugador(estado))).toBeGreaterThan(antes);
  });

  it('entrenar cuesta oro, ocupa al héroe unos días y no se puede vender mientras', () => {
    const { estado, h } = conZona();
    const coste = costeEntrenamiento(estado, h.id);
    const oro = jugador(estado).oro;
    expect(coste).toBe(Math.round((E.dias * (E.porDia + E.porPoderPorDia * 15)) / 10) * 10);
    entrenar(estado, h.id);
    expect(jugador(estado).oro).toBe(oro - coste);
    expect(h.estado).toBe('entrenando');
    expect(ofertaVenta(estado, h.id)).toBeNull();
  });

  it('al terminar vuelve con experiencia, sin lesiones', () => {
    const { estado, h } = conZona();
    entrenar(estado, h.id);
    let entrenos: ReturnType<typeof finalizarDia>['entrenamientos'] = [];
    for (let i = 0; i < E.dias; i++) {
      expect(h.estado).toBe('entrenando');
      entrenos = finalizarDia(estado).entrenamientos;
    }
    expect(entrenos).toHaveLength(1);
    expect(entrenos[0]!.progreso.experienciaGanada).toBe(E.dias * (I.experienciaPorDia[1] ?? 0));
    expect(h.estado).toBe('libre');
    expect(h.poder).toBeGreaterThan(15);
  });

  it('las plazas limitan cuántos entrenan a la vez, y quien está al límite no puede', () => {
    const { estado, h } = conZona(1);
    const otro = fichar(estado, 'jugador', heroe({ id: 'otro', poder: 20, potencial: 60 }));
    entrenar(estado, h.id);
    expect(condicionesEntrenamiento(estado, otro.id).bloqueo).toMatch(/plazas/);
    const tope = fichar(estado, 'jugador', heroe({ id: 'tope', poder: 40, potencial: 40 }));
    expect(condicionesEntrenamiento(estado, tope.id).bloqueo).toMatch(/límite/);
  });
});
