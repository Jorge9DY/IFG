import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { Azar } from '../src/motor/azar';
import { condicionesAscension, iniciarAscension, resolverAscension } from '../src/motor/ascension';
import { actualizarCategoria, categoria, categoriaPorPrestigio, multiplicadores, siguienteCategoria } from '../src/motor/categorias';
import { jugador } from '../src/motor/estado';
import { letraDe } from '../src/motor/heroes';
import { generarTablon } from '../src/motor/misiones';
import { finalizarDia } from '../src/motor/partida';
import { fichar, heroe, partida } from './fabrica';

const C = balance.categorias;

describe('categoría del gremio y tablón que crece', () => {
  it('la categoría depende del prestigio', () => {
    expect(categoriaPorPrestigio(0)).toBe('D');
    expect(categoriaPorPrestigio(C.prestigio[1]!)).toBe('C');
    expect(categoriaPorPrestigio(10_000)).toBe('S');
  });

  it('el gremio del jugador empieza en D y ve la siguiente meta', () => {
    const estado = partida();
    expect(categoria(jugador(estado))).toBe('D');
    expect(siguienteCategoria(jugador(estado))).toEqual({ letra: 'C', prestigio: C.prestigio[1] });
  });

  it('sube al ganar prestigio, lo anuncia, y nunca baja', () => {
    const estado = partida();
    const j = jugador(estado);
    j.misionesAltas = 100;
    expect(actualizarCategoria(estado, j)).not.toBeNull();
    const alcanzada = categoria(j);
    j.misionesAltas = 0;
    expect(actualizarCategoria(estado, j)).toBeNull();
    expect(categoria(j)).toBe(alcanzada);
  });

  it('una categoría alta ofrece misiones más difíciles y mejor pagadas', () => {
    let n = 0;
    const base = generarTablon(new Azar(3), () => `m${++n}`);
    const alta = generarTablon(new Azar(3), () => `m${++n}`, multiplicadores('A'));
    for (let i = 0; i < 3; i++) {
      expect(alta[i]!.dificultad).toBeGreaterThan(base[i]!.dificultad);
      expect(alta[i]!.recompensa).toBeGreaterThan(base[i]!.recompensa);
      expect(alta[i]!.equipo).toBe(base[i]!.equipo);
    }
  });

  it('el tablón del día siguiente usa la categoría nueva', () => {
    const estado = partida();
    jugador(estado).misionesAltas = 100;
    const r = finalizarDia(estado);
    expect(r.categoriaNueva).not.toBeNull();
    const bajo = estado.tablon.find((m) => m.rango === 'bajo')!;
    expect(bajo.recompensa).toBeGreaterThan(balance.misiones.bajo.recompensa);
  });
});

describe('Ascensión', () => {
  function preparar() {
    const estado = partida();
    jugador(estado).oro = 100_000;
    const h = fichar(estado, 'jugador', heroe({ id: 'veterano', poder: 45, potencial: 45 }));
    return { estado, h };
  }

  it('solo la intenta quien ha llegado a su límite, y no se puede pasar de S', () => {
    const { estado, h } = preparar();
    expect(condicionesAscension(estado, h.id).bloqueo).toBeNull();
    expect(condicionesAscension(estado, h.id).rangoNuevo).toBe('B');
    h.potencial = 60;
    expect(condicionesAscension(estado, h.id).bloqueo).toMatch(/límite/);
    h.poder = 90;
    h.potencial = 90;
    expect(condicionesAscension(estado, h.id).bloqueo).toMatch(/máximo/);
  });

  it('se paga y el héroe sale solo durante unos días', () => {
    const { estado, h } = preparar();
    const c = condicionesAscension(estado, h.id);
    iniciarAscension(estado, h.id);
    expect(jugador(estado).oro).toBe(100_000 - c.coste);
    expect(h.estado).toBe('en mision');
    const viaje = estado.enCurso.find((x) => x.ascension)!;
    expect(viaje.equipo).toEqual([h.id]);
    expect(viaje.diaVuelta - estado.dia + 1).toBe(balance.ascension.duracion);
  });

  it('si la supera, asciende de rango y su techo sube; si fracasa, muere', () => {
    let exitos = 0;
    let muertes = 0;
    for (let s = 1; s <= 60; s++) {
      const { estado, h } = preparar();
      iniciarAscension(estado, h.id);
      const viaje = estado.enCurso.find((x) => x.ascension)!;
      const r = resolverAscension(estado, new Azar(s), viaje)!;
      if (r.exito) {
        exitos++;
        expect(r.rangoAntes).toBe('C');
        expect(r.rangoDespues).toBe('B');
        expect(letraDe(estado.heroes[h.id]!.potencial)).toBe('B');
        expect(estado.heroes[h.id]!.estado).toBe('libre');
      } else {
        muertes++;
        expect(estado.heroes[h.id]).toBeUndefined();
        expect(jugador(estado).plantilla).not.toContain(h.id);
      }
    }
    expect(exitos).toBeGreaterThan(15);
    expect(muertes).toBeGreaterThan(15);
  });

  it('el resultado llega en el resumen del día en que vuelve', () => {
    const { estado, h } = preparar();
    iniciarAscension(estado, h.id);
    let ascensiones: unknown[] = [];
    for (let i = 0; i < balance.ascension.duracion; i++) ascensiones = finalizarDia(estado).ascensiones;
    expect(ascensiones).toHaveLength(1);
  });
});
