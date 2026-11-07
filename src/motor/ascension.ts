// Ascensión (decisión del propietario, biblia sección 9): un héroe que ha llegado a su límite puede
// intentar una misión muy difícil, solo. Si la supera, asciende de rango y su techo sube una letra.
// Si fracasa, muere. Es la única forma de morir del juego.

import balance from '../datos/balance.json';
import type { Azar } from './azar';
import { heroe as obtenerHeroe, jugador, nuevoId, registrar, type EstadoJuego, type MisionEnCurso } from './estado';
import { alLimite, indiceLetra, letraDe, valor } from './heroes';
import { LETRAS, type Letra } from './tipos';

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
  const probabilidad = (A.probExito as Record<string, number>)[actual] ?? 0;
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
  exito: boolean;
  rangoAntes: Letra;
  rangoDespues: Letra;
  poderAntes: number;
  poderDespues: number;
  /** Letra del nuevo techo (si lo consigue). */
  techoNuevo: Letra | null;
  /** Rangos que el techo queda por encima del nuevo rango: 1 normal, 2 extraordinario, 3 legendario. */
  despertar: number;
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
  const prob = (A.probExito as Record<string, number>)[rangoAntes] ?? 0;
  if (azar.d100() <= prob) {
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
    return { heroeId: h.id, nombre: h.nombre, exito: true, rangoAntes, rangoDespues, poderAntes, poderDespues: h.poder, techoNuevo: letraDe(h.potencial), despertar: indiceLetra(letraDe(h.potencial)) - indiceLetra(rangoDespues) };
  }
  if (g) g.plantilla = g.plantilla.filter((x) => x !== h.id);
  delete estado.heroes[h.id];
  registrar(estado, 'mision', `${h.nombre} no vuelve de su Ascensión. El gremio guarda luto.`);
  return { heroeId: h.id, nombre: h.nombre, exito: false, rangoAntes, rangoDespues: rangoAntes, poderAntes, poderDespues: poderAntes, techoNuevo: null, despertar: 0 };
}
