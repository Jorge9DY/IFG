import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { jugador } from '../src/motor/estado';
import { nivelOjeo, OJEO_MAXIMO, potencialEstimado, rangoPotencial, techoSeguro, valor, valorPublico } from '../src/motor/heroes';
import { pruebaDeCategoria, finalizarDia, terminarPrueba } from '../src/motor/partida';
import { potencialVisto } from '../src/motor/rivales';
import { precioSalida } from '../src/motor/subasta';
import { fichar, heroe, partida } from './fabrica';

describe('ojeo: lo que cada gremio sabe del techo', () => {
  it('el precio público no delata el potencial real: mismo poder y mismas letras posibles, mismo valor', () => {
    const joya = heroe({ id: 'joya', poder: 20, potencial: 70, sesgoOjeo: 0.99 }); // techo real A
    const normal = heroe({ id: 'normal', poder: 20, potencial: 50, sesgoOjeo: 0.5 }); // techo real B
    expect(rangoPotencial(joya, 0)).toEqual(rangoPotencial(normal, 0));
    expect(valorPublico(joya)).toBe(valorPublico(normal));
    expect(valor(joya)).toBeGreaterThan(valor(normal));
  });

  it('el precio de salida de la subasta usa el valor público', () => {
    const estado = partida();
    estado.heroes.joya = heroe({ id: 'joya', poder: 20, potencial: 70, sesgoOjeo: 0.99 });
    estado.heroes.normal = heroe({ id: 'normal', poder: 20, potencial: 50, sesgoOjeo: 0.5 });
    expect(precioSalida(estado, 'joya')).toBe(precioSalida(estado, 'normal'));
  });

  it('con más ojeadores quedan menos letras posibles; al máximo, el techo es exacto', () => {
    const h = heroe({ id: 'h', poder: 20, potencial: 70, sesgoOjeo: 0.7 });
    const anchos = [0, 1, 2, 3].map((n) => { const [a, b] = rangoPotencial(h, n); return 'FDCBAS'.indexOf(b) - 'FDCBAS'.indexOf(a); });
    for (let i = 1; i < anchos.length; i++) expect(anchos[i]!).toBeLessThanOrEqual(anchos[i - 1]!);
    expect(techoSeguro(h, OJEO_MAXIMO)).toBe(true);
    expect(potencialEstimado(h, OJEO_MAXIMO)).toBeGreaterThanOrEqual(65);
  });

  it('a los héroes propios se les ve con un nivel más de ojeo', () => {
    const estado = partida();
    const j = jugador(estado);
    const propio = j.plantilla[0]!;
    expect(nivelOjeo(j, propio)).toBe(j.nivelOjeadores + 1);
    expect(nivelOjeo(j, 'ajeno')).toBe(j.nivelOjeadores);
  });

  it('un rival con peores ojeadores infravalora una joya oculta', () => {
    const estado = partida();
    const sombras = estado.gremios.sombras!;
    const joya = heroe({ id: 'joya', poder: 20, potencial: 85, sesgoOjeo: 0.99 }); // techo real S, ventana pública baja
    sombras.nivelOjeadores = 0;
    const ciego = potencialVisto(sombras, joya);
    sombras.nivelOjeadores = OJEO_MAXIMO;
    const experto = potencialVisto(sombras, joya);
    expect(experto).toBeGreaterThan(ciego);
    expect(experto).toBe(potencialEstimado(joya, OJEO_MAXIMO));
  });
});

describe('Prueba de los Novatos que crece con la categoría', () => {
  it('a más categoría, más novatos y más fuertes', () => {
    const estado = partida();
    const d = pruebaDeCategoria(estado);
    jugador(estado).categoria = 'B';
    const b = pruebaDeCategoria(estado);
    expect(b.cantidad).toBeGreaterThan(d.cantidad);
    expect(b.poder[0]).toBeGreaterThan(d.poder[0]);
    expect((b.potencial.S ?? 0) + (b.potencial.A ?? 0)).toBeGreaterThan((d.potencial.S ?? 0) + (d.potencial.A ?? 0));
  });

  it('el día 7 llegan tantos novatos como marca la categoría', () => {
    const estado = partida();
    jugador(estado).categoria = 'C';
    while (estado.dia < 7) { if (finalizarDia(estado).prueba) terminarPrueba(estado); }
    finalizarDia(estado);
    expect(estado.prueba?.pendientes).toHaveLength(balance.novatos.porCategoria.C.cantidad);
    void fichar;
  });
});
