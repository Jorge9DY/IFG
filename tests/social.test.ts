// Criterios de aceptación del sistema social (documento «Sistema social de héroes», secciones 18 y 20).
import { describe, expect, it } from 'vitest';
import S from '../src/datos/social.json';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { evaluarEventos, resolverEvento } from '../src/motor/eventosSociales';
import { poderEquipoEnMision } from '../src/motor/habilidades';
import { resolverMision } from '../src/motor/misiones';
import { migrar } from '../src/motor/migracion';
import { morir } from '../src/motor/muerte';
import { lanzarMision } from '../src/motor/partida';
import {
  afinidad,
  atraccion,
  cambiar,
  estres,
  factorEstres,
  felicidad,
  memoriasDe,
  modificadorSocial,
  parejaDe,
  relacion,
  relacionesDe,
  romance,
  sonPareja,
  trasMision,
  vinculo,
} from '../src/motor/relaciones';
import type { Heroe, Mision } from '../src/motor/tipos';
import { fichar, heroe, partida } from './fabrica';

const A = S.acontecimientos;
const U = S.umbrales;

function mision(datos: Partial<Mision> = {}): Mision {
  return { id: 'm', rango: 'medio', tipo: 'Escolta', clases: [], titulo: 'Prueba', dificultad: 40, duracion: 2, recompensa: 1500, equipo: 2, ...datos };
}

/** Azar trucado para los eventos de misión: siempre ocurre. */
const siempre = { probabilidad: (): boolean => true, elegir: <T,>(l: readonly T[]): T => l[0]! };
const nunca = { probabilidad: (): boolean => false, elegir: <T,>(l: readonly T[]): T => l[0]! };
const sinHabilidad = (): null => null;

function conDos(datosA: Partial<Heroe> = {}, datosB: Partial<Heroe> = {}) {
  const estado = partida();
  const a = fichar(estado, 'jugador', heroe({ id: 'a', nombre: 'Lyra', ...datosA }));
  const b = fichar(estado, 'jugador', heroe({ id: 'b', nombre: 'Kael', ...datosB }));
  return { estado, a, b };
}

/** Pasa el día de eventos: busca los nuevos y devuelve el que buscamos. */
function asunto(estado: ReturnType<typeof partida>, eventoId: string) {
  evaluarEventos(estado);
  return estado.social.pendientes.find((p) => p.eventoId === eventoId);
}

describe('sistema social: criterios de aceptación', () => {
  it('1. completar misiones juntos sube la afinidad', () => {
    const { estado, a, b } = conDos({ poder: 80 }, { poder: 80 });
    const informe = resolverMision(new Azar(3), mision(), [a, b], 'jugador', { estado, gremioId: 'jugador' });
    expect(informe.exito).toBe(true);
    expect(afinidad(estado, 'a', 'b')).toBe(A.misionJuntos.afinidad);
    expect(relacion(estado, 'a', 'b').historial).toContain('primeraMision');
  });

  it('2. un acontecimiento negativo baja la afinidad (dos que se llevan mal discuten)', () => {
    const { estado, a, b } = conDos();
    cambiar(estado, 'a', 'b', { afinidad: -30 });
    trasMision(estado, siempre, [a, b], false, [], sinHabilidad);
    expect(afinidad(estado, 'a', 'b')).toBeLessThan(-30 + A.misionJuntos.afinidad);
    expect(memoriasDe(estado, 'a', 'b')[0]?.tipo).toBe('discusion');
  });

  it('3. la personalidad cambia la reacción: ver subir a otro molesta al celoso y alegra al amable', () => {
    const estado = partida();
    const g = fichar(estado, 'jugador', heroe({ id: 'g' }));
    const c = fichar(estado, 'jugador', heroe({ id: 'c', rasgos: ['celoso'] }));
    const k = fichar(estado, 'jugador', heroe({ id: 'k', rasgos: ['amable'] }));
    const partes = [
      { heroeId: 'g', diasLesion: 0, subio: true },
      { heroeId: 'c', diasLesion: 0, subio: false },
      { heroeId: 'k', diasLesion: 0, subio: false },
    ];
    trasMision(estado, nunca, [g, c, k], true, partes, sinHabilidad);
    expect(afinidad(estado, 'c', 'g')).toBeLessThan(afinidad(estado, 'k', 'g'));
  });

  it('4. dos héroes pueden ser amigos y rivales a la vez', () => {
    const estado = partida();
    const g = fichar(estado, 'jugador', heroe({ id: 'g' }));
    const c = fichar(estado, 'jugador', heroe({ id: 'c', rasgos: ['competitivo'] }));
    cambiar(estado, 'g', 'c', { afinidad: 60 });
    trasMision(estado, nunca, [g, c], true, [{ heroeId: 'g', diasLesion: 0, subio: true }, { heroeId: 'c', diasLesion: 0, subio: false }], sinHabilidad);
    expect(vinculo(estado, 'g', 'c')).toBe('amigos');
    expect(relacion(estado, 'g', 'c').rivales).toBe(true);
    expect(modificadorSocial(estado, [g, c]).detalles.map((d) => d.texto).join(' ')).toMatch(/amigos.*rivales/);
  });

  it('5. la atracción es distinta en cada dirección', () => {
    const { estado } = conDos();
    cambiar(estado, 'a', 'b', { atraccionAB: 50 });
    expect(atraccion(estado, 'a', 'b')).toBe(50);
    expect(atraccion(estado, 'b', 'a')).toBe(0);
    expect(romance(estado, 'a', 'b')).toBe('interés');
    expect(romance(estado, 'b', 'a')).toBe('ninguno');
    expect(Object.keys(estado.relaciones).filter((k) => k.includes('a') && k.includes('b'))).toEqual(['a|b']);
  });

  it('6. la pareja solo empieza con su evento y la aceptación', () => {
    const { estado } = conDos();
    cambiar(estado, 'a', 'b', { afinidad: 50, atraccionAB: 80, atraccionBA: 75 });
    expect(sonPareja(estado, 'a', 'b')).toBe(false);
    const p = asunto(estado, 'declaracion')!;
    expect(p).toBeDefined();
    resolverEvento(estado, p.uid, 'bendecir');
    expect(sonPareja(estado, 'a', 'b')).toBe(true);
    expect(parejaDe(estado, 'a')).toBe('b');
  });

  it('7. una ruptura deja a la pareja como expareja y conserva su historia', () => {
    const { estado } = conDos();
    cambiar(estado, 'a', 'b', { afinidad: 50, atraccionAB: 80, atraccionBA: 80 });
    resolverEvento(estado, asunto(estado, 'declaracion')!.uid, 'bendecir');
    cambiar(estado, 'a', 'b', { afinidad: -60 });
    const p = asunto(estado, 'ruptura')!;
    resolverEvento(estado, p.uid, 'dejar');
    const r = relacion(estado, 'a', 'b');
    expect(r.pareja).toBe('expareja');
    expect(r.historial).toEqual(expect.arrayContaining(['pareja', 'ruptura']));
  });

  it('8. una relación cambia el rendimiento en misión', () => {
    const { estado, a, b } = conDos({ poder: 50 }, { poder: 50 });
    const ctx = { estado, gremioId: 'jugador', mision: mision(), equipo: [a, b], dia: estado.dia };
    const neutral = poderEquipoEnMision(ctx);
    cambiar(estado, 'a', 'b', { afinidad: 55 });
    expect(poderEquipoEnMision(ctx)).toBe(Math.round(neutral * (1 + S.mision.amigos / 100)));
    cambiar(estado, 'a', 'b', { afinidad: -150 });
    expect(poderEquipoEnMision(ctx)).toBe(Math.round(neutral * (1 + S.mision.enemigos / 100)));
  });

  it('9. el estrés alto penaliza el rendimiento', () => {
    expect(factorEstres(heroe({ id: 'x', estres: 20 }))).toBe(1);
    expect(factorEstres(heroe({ id: 'x', estres: 80 }))).toBeLessThan(1);
  });

  it('10. una muerte golpea a quien tenía una relación importante con el caído', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 'v' }));
    const pareja = fichar(estado, 'jugador', heroe({ id: 'p', felicidad: 70, estres: 20 }));
    const amigo = fichar(estado, 'jugador', heroe({ id: 'f', felicidad: 70, estres: 20 }));
    const nadie = fichar(estado, 'jugador', heroe({ id: 'n', felicidad: 70, estres: 20 }));
    cambiar(estado, 'v', 'p', { afinidad: 60 });
    estado.relaciones['p|v']!.pareja = 'pareja';
    cambiar(estado, 'v', 'f', { afinidad: 55 });
    morir(estado, 'v', 'mision');
    expect(felicidad(pareja)).toBe(70 + S.muerte.pareja.felicidad);
    expect(estres(pareja)).toBe(20 + S.muerte.pareja.estres);
    expect(felicidad(amigo)).toBe(70 + S.muerte.amigo.felicidad);
    expect(felicidad(nadie)).toBe(70 + S.muerte.sinRelacion.felicidad);
    // Y el gremio tiene que decidir cómo despedirlo.
    expect(estado.social.pendientes.some((p) => p.eventoId === 'duelo')).toBe(true);
  });

  it('11. un héroe hundido pide irse; un enemigo pide no compartir equipo', () => {
    const { estado } = conDos({ felicidad: 5 });
    const p = asunto(estado, 'abandono')!;
    expect(p.a).toBe('a');
    resolverEvento(estado, p.uid, 'dejar');
    expect(jugador(estado).plantilla).not.toContain('a');

    const otra = conDos();
    cambiar(otra.estado, 'a', 'b', { afinidad: -70 });
    const q = asunto(otra.estado, 'peticionEquipo')!;
    resolverEvento(otra.estado, q.uid, 'aceptar');
    expect(otra.estado.social.vetos).toHaveLength(1);
  });

  it('11b. romper una petición aceptada no bloquea el equipo, pero el que la pidió lo lleva mal', () => {
    const { estado } = conDos({ poder: 30 }, { poder: 30 });
    estado.social.vetos.push({ solicitante: 'a', otro: 'b', dia: 1 });
    const medio = estado.tablon.find((m) => m.rango === 'medio')!;
    const antes = felicidad(estado.heroes.a!);
    lanzarMision(estado, medio.id, ['a', 'b']);
    expect(felicidad(estado.heroes.a!)).toBe(antes + S.mental.promesaRota.felicidad);
  });

  it('12. los eventos no se repiten sin fin y no se aplican dos veces', () => {
    const { estado } = conDos({ felicidad: 15 });
    const p = asunto(estado, 'descontento')!;
    resolverEvento(estado, p.uid, 'hablar');
    expect(() => resolverEvento(estado, p.uid, 'hablar')).toThrow();
    estado.heroes.a!.felicidad = 15;
    expect(asunto(estado, 'descontento')).toBeUndefined();
    estado.dia += 30;
    expect(asunto(estado, 'descontento')).toBeDefined();
  });

  it('13. guardar y cargar conserva el estado social; las partidas antiguas se convierten', () => {
    const { estado } = conDos();
    cambiar(estado, 'a', 'b', { afinidad: 30, atraccionAB: 45 });
    const cargado = migrar(JSON.parse(JSON.stringify(estado)))!;
    expect(cargado.relaciones).toEqual(estado.relaciones);
    expect(cargado.social).toEqual(estado.social);
    // Una partida ya cargada vuelve idéntica tras guardar y cargar otra vez.
    expect(migrar(JSON.parse(JSON.stringify(cargado)))).toEqual(cargado);
    const viejo = JSON.parse(JSON.stringify(estado));
    viejo.version = 9;
    viejo.relaciones = { 'a|b': 40 };
    delete viejo.social;
    viejo.heroes.a.animo = 33;
    viejo.heroes.a.amor = 'b';
    viejo.heroes.b.amor = 'a';
    delete viejo.heroes.a.felicidad;
    const m = migrar(viejo)!;
    expect(m.version).toBe(10);
    expect(m.relaciones['a|b']).toMatchObject({ afinidad: 40, pareja: 'pareja' });
    expect(m.heroes.a!.felicidad).toBe(33);
    expect(m.social.pendientes).toEqual([]);
  });

  it('14. siempre se puede ver por qué: cada hecho importante queda en la historia de la pareja', () => {
    const { estado, a, b } = conDos();
    trasMision(estado, siempre, [a, b], false, [{ heroeId: 'a', diasLesion: 2, subio: false }, { heroeId: 'b', diasLesion: 0, subio: false }], sinHabilidad);
    // b no protege a a: todavía no son amigos. Ahora sí.
    cambiar(estado, 'a', 'b', { afinidad: 60 });
    a.estado = 'lesionado';
    const r = trasMision(estado, siempre, [a, b], false, [{ heroeId: 'a', diasLesion: 2, subio: false }, { heroeId: 'b', diasLesion: 0, subio: false }], sinHabilidad);
    expect(r.salvados).toEqual(['a']);
    expect(memoriasDe(estado, 'a', 'b').map((m) => m.tipo)).toContain('salvado');
    expect(relacionesDe(estado, 'jugador', 'a')[0]?.historial).toContain('salvado');
  });
});

describe('sistema social: prueba de prototipo (sección 20)', () => {
  it('neutral → amistad → romance → pareja → ruptura → nueva pareja → celos → petición → muerte', () => {
    const estado = partida(11);
    const lyra = fichar(estado, 'jugador', heroe({ id: 'lyra', nombre: 'Lyra', poder: 60, rasgos: ['celoso', 'leal'] }));
    const kael = fichar(estado, 'jugador', heroe({ id: 'kael', nombre: 'Kael', poder: 60, rasgos: ['sociable'] }));
    const mira = fichar(estado, 'jugador', heroe({ id: 'mira', nombre: 'Mira', poder: 60 }));
    // 1–2. Empiezan neutrales y se hacen amigos misión a misión.
    expect(vinculo(estado, 'lyra', 'kael')).toBe('neutral');
    for (let i = 0; i < 20 && afinidad(estado, 'lyra', 'kael') < U.amigos; i++) trasMision(estado, nunca, [lyra, kael], true, [], sinHabilidad);
    expect(vinculo(estado, 'lyra', 'kael')).toBe('amigos');
    // 3–4. Crece la atracción mutua, llega el evento y son pareja: rinden más juntos.
    cambiar(estado, 'lyra', 'kael', { atraccionAB: 80, atraccionBA: 80 });
    resolverEvento(estado, asunto(estado, 'declaracion')!.uid, 'bendecir');
    expect(modificadorSocial(estado, [lyra, kael]).total).toBe(S.mision.pareja);
    // 5–6. Una mala racha los rompe; quedan como expareja.
    cambiar(estado, 'lyra', 'kael', { afinidad: -80 });
    resolverEvento(estado, asunto(estado, 'ruptura')!.uid, 'dejar');
    expect(relacion(estado, 'lyra', 'kael').pareja).toBe('expareja');
    // 7. Kael empieza con Mira.
    cambiar(estado, 'kael', 'mira', { afinidad: 50, atraccionAB: 80, atraccionBA: 80 });
    estado.dia += 30;
    resolverEvento(estado, asunto(estado, 'declaracion')!.uid, 'bendecir');
    expect(parejaDe(estado, 'kael')).toBe('mira');
    // 8–9. Lyra, celosa, reacciona y pide no compartir equipo; el jugador decide.
    const antes = afinidad(estado, 'lyra', 'kael');
    const celos = asunto(estado, 'celos')!;
    expect(celos.a).toBe('lyra');
    resolverEvento(estado, celos.uid, 'aceptar');
    expect(afinidad(estado, 'lyra', 'kael')).toBe(Math.max(-100, antes + A.celos.afinidad * 2));
    expect(estado.social.vetos[0]).toMatchObject({ solicitante: 'lyra', otro: 'kael' });
    // 10. Si Kael muere, Mira (su pareja) lo sufre más que nadie.
    const fMira = felicidad(mira);
    const fLyra = felicidad(lyra);
    morir(estado, 'kael', 'mision');
    expect(fMira - felicidad(mira)).toBeGreaterThan(fLyra - felicidad(lyra));
  });
});
