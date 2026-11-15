import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { resolverAscension, iniciarAscension } from '../src/motor/ascension';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { CATALOGO } from '../src/motor/heroes';
import {
  activa,
  ajustarOro,
  alVolver,
  bloqueoCompra,
  cadaSemana,
  factorCompra,
  huecos,
  lesionForzada,
  motivoNoIr,
  poderEquipoEnMision,
  valorVenta,
  type Contexto,
} from '../src/motor/habilidades';
import { condicionesCompra } from '../src/motor/mercado';
import { duracionMision, equiposPosibles, probabilidadMision, resolverMision } from '../src/motor/misiones';
import { morir, riesgoDeMuerte } from '../src/motor/muerte';
import { motivoNoLanzar } from '../src/motor/partida';
import { cambiar, cambiarAfinidad } from '../src/motor/relaciones';
import type { Heroe, Mision } from '../src/motor/tipos';
import { fichar, heroe, partida } from './fabrica';

const H = balance.habilidades;

function mision(datos: Partial<Mision> = {}): Mision {
  return { id: 'm', rango: 'bajo', tipo: 'Caza', clases: [], titulo: 'Prueba', dificultad: 40, duracion: 1, recompensa: 1000, equipo: 1, ...datos };
}

function ctx(estado: ReturnType<typeof partida>, equipo: Heroe[], m: Mision = mision({ equipo: equipo.length })): Contexto {
  return { estado, gremioId: 'jugador', mision: m, equipo, dia: estado.dia };
}

/** Poder en misión con estrés bajo para aislar la habilidad. */
function neutro(datos: Partial<Heroe> & Pick<Heroe, 'id'>): Heroe {
  return heroe({ estres: 20, ...datos });
}

describe('catálogo del modo historia', () => {
  it('tiene 80 héroes, 20 de cada clase y 40 de cada género, todos con habilidad', () => {
    expect(CATALOGO).toHaveLength(80);
    for (const c of ['Guerrero', 'Mago', 'Explorador', 'Sanador']) expect(CATALOGO.filter((f) => f.clase === c)).toHaveLength(20);
    expect(CATALOGO.filter((f) => f.genero === 'Mujer')).toHaveLength(40);
    expect(new Set(CATALOGO.map((f) => f.habilidad)).size).toBe(80);
  });

  it('los rivales empiezan en su rango máximo y los libres esperan en la bolsa de la Prueba', () => {
    const estado = partida();
    for (const f of CATALOGO.filter((x) => x.gremio !== 'libre' && x.gremio !== 'jugador')) {
      const h = estado.heroes[f.id]!;
      expect(estado.gremios[f.gremio]!.plantilla).toContain(f.id);
      expect(h.poder).toBeGreaterThanOrEqual(balance.letras.umbral[balance.letras.orden.indexOf(f.techo)]!);
    }
    expect(estado.bolsaNovatos).toHaveLength(CATALOGO.filter((f) => f.gremio === 'libre').length);
  });
});

describe('muerte', () => {
  it('solo hay riesgo de muerte en misiones altas con poco éxito', () => {
    expect(riesgoDeMuerte(mision({ rango: 'alto' }), 30)).toBe(true);
    expect(riesgoDeMuerte(mision({ rango: 'alto' }), 60)).toBe(false);
    expect(riesgoDeMuerte(mision({ rango: 'medio' }), 10)).toBe(false);
  });

  it('al morir pasa al muro de los caídos, sale del gremio y Nox hereda parte de su poder', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 'v', poder: 40 }));
    const nox = fichar(estado, 'jugador', heroe({ id: 'nox', poder: 50, habilidad: 'herencia' }));
    const r = morir(estado, 'v', 'mision');
    expect(r.murio).toBe(true);
    expect(estado.heroes.v).toBeUndefined();
    expect(jugador(estado).plantilla).not.toContain('v');
    expect(estado.caidos.at(-1)).toMatchObject({ id: 'v', causa: 'mision', gremioId: 'jugador' });
    expect(nox.poder).toBe(50 + Math.round(40 * balance.muerte.herenciaNox));
  });

  it('Beato evita una muerte por temporada', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 'beato', habilidad: 'ultimaOracion' }));
    fichar(estado, 'jugador', heroe({ id: 'a' }));
    fichar(estado, 'jugador', heroe({ id: 'b' }));
    expect(morir(estado, 'a', 'mision')).toMatchObject({ murio: false, salvadoPor: 'beato' });
    expect(estado.heroes.a!.estado).toBe('lesionado');
    expect(morir(estado, 'b', 'mision').murio).toBe(true);
  });

  it('una misión alta imposible que fracasa puede matar; con éxito, nunca', () => {
    let muertes = 0;
    for (let s = 1; s <= 30; s++) {
      const estado = partida(s);
      const a = fichar(estado, 'jugador', heroe({ id: 'a', poder: 5 }));
      const informe = resolverMision(new Azar(s), mision({ rango: 'alto', dificultad: 500, equipo: 1 }), [a], 'jugador', { estado, gremioId: 'jugador' });
      if (informe.exito) expect(informe.muertes).toHaveLength(0);
      muertes += informe.muertes.length;
    }
    expect(muertes).toBeGreaterThan(0);
    expect(muertes).toBeLessThan(15);
  });

  it('InsectLover, al ascender, deja paso a GodInsect (rango S)', () => {
    for (let s = 1; s <= 20; s++) {
      const estado = partida(s);
      jugador(estado).oro = 100_000;
      const insecto = estado.heroes.H04!;
      insecto.poder = insecto.potencial;
      iniciarAscension(estado, 'H04');
      const r = resolverAscension(estado, new Azar(s), estado.enCurso.find((c) => c.ascension)!)!;
      expect(estado.heroes.H04).toBeUndefined();
      if (r.exito) {
        expect(r.nombre).toBe('GodInsect');
        expect(r.rangoDespues).toBe('S');
        return;
      }
    }
    throw new Error('Ninguna Ascensión salió bien');
  });

  it('Chimoku muere al agotar su vida', () => {
    const estado = partida();
    const chimoku = estado.heroes.H10!;
    chimoku.memoria = { vida: 1 };
    const sombras = { estado, gremioId: 'sombras', mision: mision(), equipo: [chimoku], dia: estado.dia };
    alVolver(sombras, new Azar(1), true, []);
    expect(estado.heroes.H10).toBeUndefined();
    expect(estado.caidos.at(-1)?.causa).toBe('vida');
  });

  it('el Segador sacrifica cada semana a quien peor le cae y lo convierte en Zombie', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 'seg', habilidad: 'sacrificio' }));
    fichar(estado, 'jugador', heroe({ id: 'odiado', poder: 40, habilidad: 'contagio' }));
    cambiarAfinidad(estado, 'seg', 'odiado', -90);
    cadaSemana(estado, new Azar(1));
    expect(estado.heroes.odiado).toBeUndefined();
    const zombie = jugador(estado).plantilla.map((id) => estado.heroes[id]!).find((h) => h.zombie)!;
    expect(zombie.nombre).toBe('Zombie odiado');
    expect(zombie.poder).toBe(20);
    expect(zombie.habilidad).toBe('contagio');
  });
});

describe('habilidades en misión', () => {
  it('AllBlack ocupa tres huecos y rinde por tres', () => {
    const estado = partida();
    const all = estado.heroes.H02!;
    expect(huecos(all)).toBe(3);
    const alto = estado.tablon.find((m) => m.rango === 'alto')!;
    expect(motivoNoLanzar(estado, alto.id, ['H02'])).toBeNull();
    const bajo = estado.tablon.find((m) => m.rango === 'bajo')!;
    expect(motivoNoLanzar(estado, bajo.id, ['H02'])).toMatch(/1 hueco/);
    expect(equiposPosibles([all, neutro({ id: 'x' })], 3)).toEqual([[all]]);
  });

  it('Tokopi anula las habilidades del equipo y Echo copia la del más fuerte', () => {
    const goblin = neutro({ id: 'g', habilidad: 'goblinDraft', poder: 20 });
    const echo = neutro({ id: 'e', habilidad: 'eco', poder: 10 });
    expect(activa(echo, [goblin, echo])).toBe('goblinDraft');
    expect(activa(goblin, [goblin, neutro({ id: 't', habilidad: 'silencio' })])).toBeNull();
  });

  it('HalfGoblin arrasa en las misiones bajas; Sable rinde el doble en solitario', () => {
    const estado = partida();
    const g = neutro({ id: 'g', habilidad: 'goblinDraft', poder: 20 });
    expect(poderEquipoEnMision(ctx(estado, [g]))).toBe(Math.round(20 * H.goblinDraft.factor));
    expect(poderEquipoEnMision(ctx(estado, [g], mision({ rango: 'medio' })))).toBe(20);
    const sable = neutro({ id: 's', habilidad: 'sinTestigos', poder: 30 });
    expect(poderEquipoEnMision(ctx(estado, [sable]))).toBe(60);
  });

  it('Chispa sube a sus compañeros; Nevada no se deja afectar', () => {
    const estado = partida();
    const chispa = neutro({ id: 'c', habilidad: 'contagio', poder: 10 });
    const a = neutro({ id: 'a', poder: 50 });
    const nevada = neutro({ id: 'n', habilidad: 'imperturbable', poder: 50 });
    const m = mision({ equipo: 2 });
    expect(poderEquipoEnMision(ctx(estado, [chispa, a], m))).toBe(Math.round(10 + 50 * H.contagio.factor));
    expect(poderEquipoEnMision(ctx(estado, [chispa, nevada], m))).toBe(60);
  });

  it('Blup no se lesiona nunca; quien va con Vampire, siempre y de gravedad', () => {
    const blup = heroe({ id: 'b', habilidad: 'gelatina' });
    const vamp = heroe({ id: 'v', habilidad: 'roboDePoder' });
    const otro = heroe({ id: 'o' });
    expect(lesionForzada([blup, vamp], blup)).toBe('nunca');
    expect(lesionForzada([vamp, otro], vamp)).toBe('nunca');
    expect(lesionForzada([vamp, otro], otro)).toBe('grave');
    expect(lesionForzada([heroe({ id: 'al', habilidad: 'godsHateMe' }), otro], otro)).toBe('segura');
  });

  it('Brújula acorta las misiones un día', () => {
    expect(duracionMision(mision({ duracion: 2 }), [heroe({ id: 'b', habilidad: 'atajo', clase: 'Guerrero' })])).toBe(1);
    expect(duracionMision(mision({ duracion: 1 }), [heroe({ id: 'b', habilidad: 'atajo', clase: 'Guerrero' })])).toBe(1);
  });

  it('Récord sube con la racha y la pierde al fallar', () => {
    const estado = partida();
    const r = fichar(estado, 'jugador', neutro({ id: 'r', habilidad: 'racha', poder: 20 }));
    for (let i = 0; i < 3; i++) alVolver(ctx(estado, [r]), new Azar(i), true, []);
    expect(r.memoria?.racha).toBe(3);
    expect(poderEquipoEnMision(ctx(estado, [r]))).toBe(Math.round(20 * (1 + 3 * H.racha.porMision)));
    alVolver(ctx(estado, [r]), new Azar(9), false, []);
    expect(r.memoria?.racha).toBe(0);
  });

  it('Pipo crece con cada derrota', () => {
    const estado = partida();
    const pipo = fichar(estado, 'jugador', heroe({ id: 'p', habilidad: 'aprendeDerrotas', poder: 5, potencial: 5 }));
    alVolver(ctx(estado, [pipo]), new Azar(1), false, []);
    expect(pipo.poder).toBe(5 + H.aprendeDerrotas.poder);
  });

  it('Pirita guarda parte del oro y Rastro cobra más en las altas', () => {
    const estado = partida();
    const pirita = heroe({ id: 'p', habilidad: 'tesoro' });
    const r = ajustarOro(ctx(estado, [pirita]), new Azar(1), 1000, true);
    expect(r.oro).toBe(1000 - 1000 * H.tesoro.fraccion);
    expect(pirita.memoria?.tesoro).toBe(1000 * H.tesoro.fraccion);
    const rastro = heroe({ id: 'r', habilidad: 'presaGrande' });
    expect(ajustarOro(ctx(estado, [rastro], mision({ rango: 'alto' })), new Azar(1), 1000, true).oro).toBe(1000 * H.presaGrande.factor);
  });

  it('Trébol sube el éxito de su misión y deja karma en la siguiente', () => {
    const estado = partida();
    const t = fichar(estado, 'jugador', neutro({ id: 't', habilidad: 'karma', poder: 30 }));
    const a = fichar(estado, 'jugador', neutro({ id: 'a', poder: 30 }));
    const m = mision({ dificultad: 60 });
    const entorno = { estado, gremioId: 'jugador' };
    expect(probabilidadMision(m, [t], entorno)).toBe(probabilidadMision(m, [a], entorno) + H.karma.bonus);
  });

  it('Mascota no sale de misión y Yandere solo sale con su amor', () => {
    const estado = partida();
    const mascota = fichar(estado, 'jugador', heroe({ id: 'm', habilidad: 'mimo' }));
    expect(motivoNoIr(estado, mascota, ['m'])).toMatch(/mascota/);
    const y = fichar(estado, 'jugador', heroe({ id: 'y', habilidad: 'obsesion' }));
    fichar(estado, 'jugador', heroe({ id: 'amado' }));
    cambiar(estado, 'y', 'amado', { atraccionAB: 80 });
    expect(motivoNoIr(estado, y, ['y'])).toMatch(/solo sale/);
    expect(motivoNoIr(estado, y, ['y', 'amado'])).toBeNull();
  });
});

describe('habilidades de mercado', () => {
  it('Aldo no se puede comprar', () => {
    const estado = partida();
    expect(bloqueoCompra(estado.heroes.H51!)).toMatch(/jamás/);
    expect(condicionesCompra(estado, 'H51').bloqueo).toMatch(/jamás/);
  });

  it('Letra encarece comprar a sus compañeros y Mimi se revaloriza con cada misión', () => {
    const estado = partida();
    const deCorona = estado.gremios.corona!.plantilla.find((id) => id !== 'H42')!;
    expect(factorCompra(estado, estado.heroes[deCorona]!, 'jugador')).toBe(H.letraPequena.compras);
    const mimi = heroe({ id: 'mimi', habilidad: 'fama', poder: 20 });
    const antes = valorVenta(mimi);
    mimi.memoria = { misiones: 4 };
    expect(valorVenta(mimi)).toBeGreaterThan(antes);
  });
});
