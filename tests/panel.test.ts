// Puente entre el panel de tramas y el juego (herramientas/panel.ts).
import { describe, expect, it } from 'vitest';
import heroesJson from '../src/datos/heroes.json';
import historia from '../src/datos/historia.json';
import { aPanel, desdePanel } from '../herramientas/panel';

type Obj = Record<string, unknown>;
const h = heroesJson as unknown as { heroes: Obj[] };
const hi = historia as unknown as Obj;

describe('panel de tramas', () => {
  it('ida y vuelta: exportar al panel e importar deja los archivos igual', () => {
    const r = desdePanel(aPanel(h, hi), h as unknown as Obj, hi);
    expect(r.problemas).toEqual([]);
    expect(JSON.stringify(r.heroes)).toBe(JSON.stringify(heroesJson));
    expect(JSON.stringify(r.historia)).toBe(JSON.stringify(historia));
  });

  it('las ideas no entran en el juego y las marcas del panel vuelven a ser efectos', () => {
    const panel = aPanel(h, hi);
    panel.nodos.push({ id: 'nuevo', trama: 'trio', tipo: 'momento', estado: 'idea', titulo: 'x', texto: 'y', opciones: [] });
    panel.nodos.push({ id: 'otro', trama: 'trio', tipo: 'momento', estado: 'borrador', orden: 1, si: { dia: 2 }, titulo: 'x', texto: 'y', opciones: [{ texto: 'Sí', marca: 'm1', efectos: [{ heroe: 'H81', lealtad: 5 }, { objetivo: 'gremio' }] }] });
    const r = desdePanel(panel, h as unknown as Obj, hi);
    const momentos = r.historia.momentos as Obj[];
    expect(momentos.some((m) => m.id === 'nuevo')).toBe(false);
    expect(momentos[0]).toMatchObject({ id: 'otro', opciones: [{ texto: 'Sí', efectos: [{ heroe: 'H81', lealtad: 5 }, { marca: 'm1' }] }] });
  });

  it('un héroe nuevo llega con la habilidad por diseñar y los errores se avisan sin escribir', () => {
    const panel = aPanel(h, hi);
    panel.heroes.push({ id: 'H84', nombre: 'Nueva', clase: 'Mago', genero: 'Mujer', gremio: 'libre', techo: 'C', techoFinal: 'B', rangoInicial: 'F', poder: '7' });
    panel.heroes.push({ id: 'H85', nombre: '', clase: 'Bardo', genero: 'Mujer', gremio: 'libre', techo: 'Z', techoFinal: 'B', rangoInicial: 'F', poder: 200 });
    const r = desdePanel(panel, h as unknown as Obj, hi);
    const nueva = (r.heroes.heroes as Obj[]).find((x) => x.id === 'H84')!;
    expect(nueva).toMatchObject({ habilidad: '', nombreHabilidad: 'Por diseñar', poder: 7 });
    expect(r.problemas.join(' ')).toMatch(/H85: sin nombre.*clase «Bardo».*techo «Z».*poder 200/);
  });
});
