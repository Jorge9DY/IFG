import { describe, expect, it } from 'vitest';
import { heroe, heroesDe, jugador, rivales } from '../src/motor/estado';
import { valorMercado } from '../src/motor/heroes';
import { crearPartida, enviarMision, pujarPorHeroe, terminarSemana } from '../src/motor/partida';
import { simularTemporada } from '../herramientas/simulador/simular';

describe('Creación de la partida', () => {
  const estado = crearPartida({ nombre: 'Prueba', semilla: 7 });

  it('el jugador empieza solo con Elara, 3.000 de oro y 40.000 de deuda', () => {
    const j = jugador(estado);
    expect(j.plantilla).toEqual(['h_000_elara']);
    expect(j.oro).toBe(3000);
    expect(j.deuda).toBe(40000);
  });

  it('hay 4 rivales con plantilla, un Draft abierto y un tablón de 6 a 10 misiones', () => {
    expect(rivales(estado)).toHaveLength(4);
    for (const r of rivales(estado)) expect(r.plantilla.length).toBeGreaterThanOrEqual(10);
    expect(estado.mercado.filter((e) => e.draft)).toHaveLength(14);
    expect(estado.tablon.length).toBeGreaterThanOrEqual(6);
    expect(estado.tablon.length).toBeLessThanOrEqual(10);
  });

  it('el 5.º puesto solo ve misiones hasta rango B', () => {
    expect(estado.tablon.every((m) => ['F', 'D', 'C', 'B'].includes(m.rango))).toBe(true);
  });

  it('la misma semilla genera la misma partida', () => {
    expect(crearPartida({ nombre: 'Prueba', semilla: 7 })).toEqual(estado);
  });
});

describe('Acciones del jugador', () => {
  it('no se puede ofrecer más oro del disponible', () => {
    const estado = crearPartida({ nombre: 'P', semilla: 3 });
    const id = estado.mercado[0]!.heroeId;
    expect(() => pujarPorHeroe(estado, id, [{ prima: 999999, salario: 10, duracion: 1 }])).toThrow();
  });

  it('fichar un agente libre lo añade a la plantilla y cobra la prima', () => {
    const estado = crearPartida({ nombre: 'P', semilla: 3 });
    const libre = estado.mercado.find((e) => !e.draft)!;
    const valor = valorMercado(heroe(estado, libre.heroeId));
    const r = pujarPorHeroe(estado, libre.heroeId, [{ prima: Math.min(2500, valor * 3), salario: 40, duracion: 2 }]);
    if (r.fichado) {
      expect(jugador(estado).plantilla).toContain(libre.heroeId);
      expect(jugador(estado).oro).toBeLessThan(3000);
      expect(estado.mercado.some((e) => e.heroeId === libre.heroeId)).toBe(false);
    } else {
      expect(r.subasta.ganador).not.toBe('llama');
    }
  });

  it('enviar una misión exige de 3 a 5 héroes disponibles de tu gremio', () => {
    const estado = crearPartida({ nombre: 'P', semilla: 3 });
    const mision = estado.tablon[0]!;
    expect(() => enviarMision(estado, mision.id, [{ heroeId: 'h_000_elara', posicion: 'retaguardia' }])).toThrow();
  });
});

describe('Temporada completa', () => {
  it('sin hacer nada, el oro se acaba hacia la semana 4 y la quiebra llega 3 cierres después', () => {
    const estado = crearPartida({ nombre: 'Pasivo', semilla: 11 });
    while (!estado.fin) terminarSemana(estado);
    expect(estado.fin).toBe('quiebra');
    expect(estado.partida.semana).toBeGreaterThanOrEqual(6);
    expect(estado.partida.semana).toBeLessThanOrEqual(8);
  });

  it('el jugador automático juega las 20 semanas y el resultado es reproducible', () => {
    const a = simularTemporada(42);
    const b = simularTemporada(42);
    expect(a).toEqual(b);
    expect(a.misiones).toBeGreaterThan(0);
  });

  it('el estado se puede guardar y recuperar como JSON en mitad de la temporada', () => {
    const estado = crearPartida({ nombre: 'Guardado', semilla: 5 });
    terminarSemana(estado);
    const copia = JSON.parse(JSON.stringify(estado));
    terminarSemana(estado);
    terminarSemana(copia);
    expect(copia).toEqual(estado);
  });

  it('en Modo Clemente no muere ningún héroe del jugador', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      expect(simularTemporada(semilla, undefined, true).muertes).toBe(0);
    }
  });

  it('los héroes muertos salen de la plantilla', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const estado = crearPartida({ nombre: 'X', semilla });
      while (!estado.fin) terminarSemana(estado);
      for (const h of heroesDe(estado, estado.jugadorId)) expect(h.estado).not.toBe('muerto');
    }
  });
});
