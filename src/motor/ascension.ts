// Ascensión (decisión del propietario, biblia sección 9): un héroe que ha llegado a su límite puede
// intentar una misión muy difícil, solo. Si la supera, asciende de rango y su techo sube una letra.
// Si fracasa, muere. Es la única forma de morir del juego.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { heroe as obtenerHeroe, jugador, nuevoId, registrar, type EstadoJuego, type MisionEnCurso } from './estado';
import { alLimite, indiceLetra, letraDe, valor } from './heroes';
import { alGastar, bonusAscension, trasAscension } from './habilidades';
import { morir } from './muerte';
import { LETRAS, type Clase, type Letra } from './tipos';

const A = balance.ascension;
const U = balance.letras.umbral;

export interface CondicionesAscension {
  coste: number;
  /** Probabilidad de sobrevivir y ascender, en porcentaje. */
  probabilidad: number;
  /** Rango al que ascendería. */
  rangoNuevo: Letra | null;
  bloqueo: string | null;
}

export function condicionesAscension(estado: EstadoJuego, heroeId: string): CondicionesAscension {
  const h = obtenerHeroe(estado, heroeId);
  const actual = letraDe(h.poder);
  const rangoNuevo = (LETRAS[indiceLetra(actual) + 1] as Letra | undefined) ?? null;
  const coste = Math.max(A.costeMinimo, Math.round((valor(h) * A.factorCoste) / 50) * 50);
  const probabilidad = Math.min(95, ((A.probExito as Record<string, number>)[actual] ?? 0) + bonusAscension(estado, estado.jugadorId, heroeId));
  const base = { coste, probabilidad, rangoNuevo };
  if (!jugador(estado).plantilla.includes(heroeId)) return { ...base, bloqueo: 'No es de tu gremio' };
  if (!rangoNuevo) return { ...base, bloqueo: 'Ya tiene el rango máximo' };
  if (!alLimite(h)) return { ...base, bloqueo: 'Solo puede intentarlo quien ha llegado a su límite' };
  if (h.estado !== 'libre') return { ...base, bloqueo: 'No está libre' };
  if (jugador(estado).oro < coste) return { ...base, bloqueo: 'No tienes oro suficiente' };
  return { ...base, bloqueo: null };
}

/** Paga y envía al héroe, solo, a su misión de Ascensión. Vuelve (o no) en unos días. */
export function iniciarAscension(estado: EstadoJuego, heroeId: string): void {
  if (estado.fase !== 'gestion') throw new Error('Ahora no se puede iniciar una Ascensión');
  const c = condicionesAscension(estado, heroeId);
  if (c.bloqueo) throw new Error(c.bloqueo);
  const h = obtenerHeroe(estado, heroeId);
  jugador(estado).oro -= c.coste;
  h.estado = 'en mision';
  estado.enCurso.push({
    mision: { id: nuevoId(estado, 'm'), rango: 'alto', tipo: 'Ascensión', clases: [], titulo: `Ascensión de ${h.nombre}`, dificultad: 0, duracion: A.duracion, recompensa: 0, equipo: 1 },
    gremioId: estado.jugadorId,
    equipo: [heroeId],
    diaVuelta: estado.dia + A.duracion - 1,
    ascension: true,
  });
  registrar(estado, 'mision', `${h.nombre} parte hacia su Ascensión (${c.probabilidad}% de volver).`);
  alGastar(estado, estado.jugadorId);
}

/** Cuántos rangos sube el techo por encima del nuevo rango: casi siempre 1, a veces 2, rara vez 3. */
function tirarDespertar(azar: Azar): number {
  const tabla = A.techoExtra as Record<string, number>;
  let tirada = azar.siguiente() * 100;
  for (const [extra, p] of Object.entries(tabla)) {
    if (tirada < p) return Number(extra);
    tirada -= p;
  }
  return 1;
}

export interface ResultadoAscension {
  heroeId: string;
  nombre: string;
  clase: Clase;
  exito: boolean;
  rangoAntes: Letra;
  rangoDespues: Letra;
  poderAntes: number;
  poderDespues: number;
  /** Letra del nuevo techo (si lo consigue). */
  techoNuevo: Letra | null;
  /** Rangos que el techo queda por encima del nuevo rango: 1 normal, 2 extraordinario, 3 legendario. */
  despertar: number;
  /** Fracasó pero Beato lo salvó. */
  salvado?: boolean;
}

/**
 * Resuelve una Ascensión que vuelve hoy. Éxito: el poder sube hasta el nuevo rango y el potencial pasa
 * a lo más alto de esa letra. Fracaso: el héroe muere y deja el gremio.
 */
export function resolverAscension(estado: EstadoJuego, azar: Azar, c: MisionEnCurso): ResultadoAscension | null {
  const id = c.equipo[0];
  const h = id ? estado.heroes[id] : undefined;
  if (!h) return null;
  const g = estado.gremios[c.gremioId];
  const rangoAntes = letraDe(h.poder);
  const poderAntes = h.poder;
  const prob = Math.min(95, ((A.probExito as Record<string, number>)[rangoAntes] ?? 0) + bonusAscension(estado, c.gremioId, h.id));
  if (azar.d100() <= prob) {
    trasAscension(estado, c.gremioId, h.id);
    // InsectLover: el insecto que le crecía dentro sale y ocupa su lugar.
    if (h.habilidad === 'insectos') {
      const poderAntesGod = h.poder;
      const nombre = h.nombre;
      const clase = h.clase;
      morir(estado, h.id, 'metamorfosis');
      const god = {
        ...h,
        id: nuevoId(estado, 'h'),
        nombre: 'GodInsect',
        clase: 'Mago' as Clase,
        poder: balance.habilidades.insectos.poderGodInsect,
        potencial: 100,
        techoConocido: true,
        experiencia: 0,
        estado: 'libre' as const,
        habilidad: undefined,
        catalogo: undefined,
        amor: null,
        memoria: {},
        reputacion: Math.min(100, h.reputacion + 30),
      };
      estado.heroes[god.id] = god;
      if (g) g.plantilla.push(god.id);
      registrar(estado, 'muerte', `${nombre} se abre en dos y de dentro sale GodInsect. Rango S.`);
      return { heroeId: god.id, nombre: 'GodInsect', clase, exito: true, rangoAntes, rangoDespues: letraDe(god.poder), poderAntes: poderAntesGod, poderDespues: god.poder, techoNuevo: 'S', despertar: 0 };
    }
    const i = indiceLetra(rangoAntes) + 1;
    const despertar = tirarDespertar(azar);
    // El techo queda 1, 2 o 3 rangos por encima del nuevo rango (S como máximo) y se conoce.
    const techo = Math.min(LETRAS.length - 1, i + despertar);
    h.poder = Math.max(h.poder, U[i] ?? h.poder);
    h.potencial = Math.max(h.poder, (U[techo + 1] ?? 101) - 1);
    h.techoConocido = true;
    h.experiencia = 0;
    h.estado = 'libre';
    h.reputacion = Math.min(100, h.reputacion + 10);
    const rangoDespues = letraDe(h.poder);
    const tipo = despertar >= 3 ? ' (despertar legendario)' : despertar === 2 ? ' (despertar extraordinario)' : '';
    registrar(estado, 'mision', `¡${h.nombre} supera su Ascensión y asciende a rango ${rangoDespues}! Su nuevo techo es ${letraDe(h.potencial)}${tipo}.`);
    return { heroeId: h.id, nombre: h.nombre, clase: h.clase, exito: true, rangoAntes, rangoDespues, poderAntes, poderDespues: h.poder, techoNuevo: letraDe(h.potencial), despertar: indiceLetra(letraDe(h.potencial)) - indiceLetra(rangoDespues) };
  }
  const r = morir(estado, h.id, 'ascension');
  if (!r.murio) {
    return { heroeId: h.id, nombre: h.nombre, clase: h.clase, exito: false, rangoAntes, rangoDespues: rangoAntes, poderAntes, poderDespues: poderAntes, techoNuevo: null, despertar: 0, salvado: true };
  }
  return { heroeId: h.id, nombre: h.nombre, clase: h.clase, exito: false, rangoAntes, rangoDespues: rangoAntes, poderAntes, poderDespues: poderAntes, techoNuevo: null, despertar: 0 };
}
