// Partida: creación, acciones del jugador y resolución diaria (biblia, secciones 2 y 15).
// «Finalizar día» resuelve el mundo; el día 7 se pagan los sueldos y empieza la Prueba de los Novatos,
// y al terminarla se actualiza el ranking (y, cada 4 semanas, se cierra la temporada).

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import { Azar } from './azar';
import { pagarSueldos, type PagoSueldos } from './economia';
import {
  diaDeTemporada,
  diasParaPrueba,
  esDia7,
  esFinDeTemporada,
  gremio,
  heroe as obtenerHeroe,
  jugador,
  nuevoId,
  puesto,
  registrar,
  rivales,
  temporadaDe,
  type EstadoJuego,
  type FilaRanking,
} from './estado';
import { generarHeroe, letraPotencialNovato } from './heroes';
import { duracionMision, generarTablon, resolverMision, type InformeMision } from './misiones';
import { caducarReto, generarReto } from './retos';
import { resolverEntrenamientos, type ResultadoEntrenamiento } from './entrenamiento';
import { decaerPuntos, desarrolloInicial, actualizarDominante, modificadoresMision, puntosMilitares, sumarPuntos } from './desarrollo';
import { pagarMantenimiento, producir, type Produccion } from './establecimientos';
import { avanzarInvestigaciones, type ResultadoInvestigacion } from './investigacion';
import { celebrarTorneo, type CombateTorneo } from './torneo';
import { resolverAscension, type ResultadoAscension } from './ascension';
import { actualizarCategoria, categoria, categoriaPorPrestigio, multiplicadores } from './categorias';
import { prestigio } from './ranking';
import { calcularRanking, premioTemporada } from './ranking';
import { ajustarPlantilla, eligeMisiones, invertir } from './rivales';
import { accionJugador, cerrarSubasta, crearSubasta } from './subasta';
import type { Clase, Gremio, Letra, Mision, PerfilRival } from './tipos';

export interface OpcionesPartida {
  nombreGremio?: string;
  semilla?: number;
}

/** Ejecuta una función con el generador de la partida y guarda su nuevo estado. */
export function conAzar<T>(estado: EstadoJuego, f: (azar: Azar) => T): T {
  const azar = new Azar(estado.azar);
  const resultado = f(azar);
  estado.azar = azar.obtenerEstado();
  return resultado;
}

const MAX_REGISTRO = 300;

export function crearPartida(opciones: OpcionesPartida = {}): EstadoJuego {
  const semilla = opciones.semilla ?? Math.floor(Math.random() * 2 ** 31);
  const J = balance.jugador;
  const estado: EstadoJuego = {
    version: 9,
    semilla,
    azar: semilla,
    dia: 1,
    fase: 'gestion',
    heroes: {},
    gremios: {},
    jugadorId: 'jugador',
    tablon: [],
    enCurso: [],
    prueba: null,
    reto: null,
    entrenamientos: [],
    desarrollo: desarrolloInicial(),
    establecimientos: [],
    investigacion: { enCurso: [], completadas: [] },
    objetos: { elixires: 0 },
    ranking: [],
    registro: [],
    contadorIds: 0,
  };
  const nuevoGremio = (g: Omit<Gremio, 'plantilla' | 'misionesAltas' | 'novatosDestacados'> & Partial<Gremio>): Gremio => {
    const completo: Gremio = { plantilla: [], misionesAltas: 0, novatosDestacados: 0, ...g };
    estado.gremios[completo.id] = completo;
    return completo;
  };

  conAzar(estado, (azar) => {
    const j = nuevoGremio({
      id: 'jugador',
      nombre: opciones.nombreGremio?.trim() || 'Llama Menguante',
      esJugador: true,
      oro: J.oro,
      nivelSede: J.nivelSede,
      nivelOjeadores: J.nivelOjeadores,
    });
    for (let i = 0; i < J.heroes; i++) {
      const h = generarHeroe(azar, nuevoId(estado, 'h'), { poder: J.poder as [number, number], potencial: J.potencial as Letra[] });
      estado.heroes[h.id] = h;
      j.plantilla.push(h.id);
    }
    for (const d of datosGremios.rivales) {
      const g = nuevoGremio({
        id: d.id,
        nombre: d.nombre,
        esJugador: false,
        oro: d.oro,
        nivelSede: d.nivelSede,
        nivelOjeadores: d.nivelOjeadores,
        misionesAltas: d.misionesAltas,
        novatosDestacados: d.novatosDestacados,
        personalidad: d.personalidad,
        estrategia: d.estrategia,
        perfil: d.perfil as PerfilRival,
        clase: d.clase as Clase,
      });
      for (let i = 0; i < d.heroes; i++) {
        const h = generarHeroe(azar, nuevoId(estado, 'h'), {
          poder: d.poder as [number, number],
          potencial: d.potencial as Letra[],
          reputacion: d.reputacion as [number, number],
          // La mitad de su plantilla es de la clase en la que se especializa.
          clase: azar.probabilidad(balance.clases.probClaseRival) ? (d.clase as Clase) : undefined,
        });
        estado.heroes[h.id] = h;
        g.plantilla.push(h.id);
      }
    }
    for (const g of Object.values(estado.gremios)) g.categoria = categoriaPorPrestigio(prestigio(g));
    estado.tablon = generarTablon(azar, () => nuevoId(estado, 'm'), multiplicadores(categoria(j)));
    generarReto(estado, azar);
  });
  estado.ranking = calcularRanking(estado);
  registrar(estado, 'temporada', `Empieza la temporada 1. ${jugador(estado).nombre} es el último del ranking.`);
  return estado;
}

// ---------------------------------------------------------------------------
// Acciones del jugador durante el día
// ---------------------------------------------------------------------------

/** Por qué no se puede lanzar esta misión con este equipo, o null si se puede. */
export function motivoNoLanzar(estado: EstadoJuego, misionId: string, equipo: readonly string[]): string | null {
  if (estado.fase !== 'gestion') return 'Ahora no se pueden lanzar misiones';
  const mision = estado.tablon.find((m) => m.id === misionId);
  if (!mision) return 'La misión no está en el tablón';
  if (equipo.length !== mision.equipo) return `Esta misión necesita ${mision.equipo} ${mision.equipo === 1 ? 'héroe' : 'héroes'}`;
  if (new Set(equipo).size !== equipo.length) return 'Héroe repetido en el equipo';
  const j = jugador(estado);
  for (const id of equipo) {
    if (!j.plantilla.includes(id)) return 'Ese héroe no es de tu gremio';
    const h = obtenerHeroe(estado, id);
    if (h.estado !== 'libre') return `${h.nombre} no está disponible`;
  }
  return null;
}

/**
 * Lanza una misión del tablón. Cada misión se puede lanzar tantas veces como equipos libres tengas
 * (decisión del propietario): ¿tres misiones bajas o una alta? Los enviados no están disponibles
 * hasta que vuelven.
 */
export function lanzarMision(estado: EstadoJuego, misionId: string, equipo: readonly string[]): void {
  const motivo = motivoNoLanzar(estado, misionId, equipo);
  if (motivo) throw new Error(motivo);
  const carta = estado.tablon.find((m) => m.id === misionId)!;
  const mision = { ...carta, id: nuevoId(estado, 'm') };
  for (const id of equipo) obtenerHeroe(estado, id).estado = 'en mision';
  estado.enCurso.push({ mision, gremioId: estado.jugadorId, equipo: [...equipo], diaVuelta: diaDeVuelta(estado, carta, equipo), cartaId: carta.id });
}

/** Día (al finalizarlo) en que volvería esta misión con este equipo. */
export function diaDeVuelta(estado: EstadoJuego, mision: Mision, equipo: readonly string[]): number {
  return estado.dia + duracionMision(mision, equipo.map((id) => obtenerHeroe(estado, id))) - 1;
}

/**
 * true si una misión que vuelve ese día traerá su oro después de la próxima Prueba de los Novatos
 * (el día 7 primero vuelven las misiones, luego se pagan sueldos y después llega la Prueba).
 */
export function vuelveTrasPrueba(estado: EstadoJuego, diaVuelta: number): boolean {
  return diaVuelta > estado.dia + diasParaPrueba(estado.dia);
}

/** Veces que se ha lanzado hoy una misión del tablón. */
export function lanzadasHoy(estado: EstadoJuego, carta: Mision): number {
  return estado.enCurso.filter((c) => c.cartaId === carta.id).length;
}

// ---------------------------------------------------------------------------
// Finalizar día
// ---------------------------------------------------------------------------

export interface ResumenDia {
  dia: number;
  /** Misiones del jugador que han vuelto hoy. */
  informes: InformeMision[];
  /** Sueldos pagados (solo el día 7). */
  sueldos: PagoSueldos | null;
  /** Noticias breves del mundo. */
  noticias: string[];
  /** true si empieza la Prueba de los Novatos. */
  prueba: boolean;
  /** Héroes que terminan hoy su entrenamiento. */
  entrenamientos: ResultadoEntrenamiento[];
  /** Ascensiones del jugador que han terminado hoy. */
  ascensiones: ResultadoAscension[];
  /** Nueva categoría del gremio del jugador, si ha subido. */
  categoriaNueva: Letra | null;
  /** Oro producido hoy por cada establecimiento. */
  produccion: Produccion[];
  /** Investigaciones completadas hoy. */
  investigaciones: ResultadoInvestigacion[];
  /** Mantenimiento de los establecimientos (solo el día 7). */
  mantenimiento: number | null;
}

export function finalizarDia(estado: EstadoJuego): ResumenDia {
  if (estado.fase !== 'gestion') throw new Error('Ahora no se puede finalizar el día');
  const dia = estado.dia;
  const desde = estado.registro.length;
  return conAzar(estado, (azar) => {
    // Los rivales también lanzan sus misiones del día.
    for (const rival of rivales(estado)) {
      for (const { mision, equipo } of eligeMisiones(estado, azar, rival.id, () => nuevoId(estado, 'm'))) {
        for (const h of equipo) h.estado = 'en mision';
        estado.enCurso.push({ mision, gremioId: rival.id, equipo: equipo.map((h) => h.id), diaVuelta: dia + duracionMision(mision, equipo) - 1 });
      }
    }

    // Los lesionados se recuperan un día.
    for (const h of Object.values(estado.heroes)) {
      if (h.estado === 'lesionado' && --h.diasLesion <= 0) {
        h.estado = 'libre';
        h.diasLesion = 0;
      }
    }

    // Regreso de misiones: recompensas, lesiones y experiencia (y Ascensiones).
    const ascensiones: ResultadoAscension[] = [];
    const informes = resolverRegresos(estado, azar, ascensiones);
    const entrenamientos = resolverEntrenamientos(estado);
    // Rama económica e investigación: los establecimientos producen y los proyectos avanzan.
    const produccion = producir(estado);
    const investigaciones = avanzarInvestigaciones(estado);
    const categoriaNueva = actualizarCategorias(estado);
    caducarReto(estado);

    // Día 7: sueldos y, después, Prueba de los Novatos.
    let sueldos: PagoSueldos | null = null;
    let mantenimiento: number | null = null;
    if (esDia7(dia)) {
      sueldos = pagarSueldos(estado, estado.jugadorId);
      if (estado.establecimientos.length) mantenimiento = pagarMantenimiento(estado);
      for (const rival of rivales(estado)) {
        pagarSueldos(estado, rival.id);
        invertir(estado, azar, rival.id);
      }
      empezarPrueba(estado, azar);
    } else {
      avanzarDia(estado, azar);
    }
    const noticias = estado.registro.slice(desde).filter((e) => e.tipo === 'rival' || e.tipo === 'reto').map((e) => e.texto);
    return { dia, informes: informes.filter((i) => i.gremioId === estado.jugadorId), sueldos, noticias, prueba: estado.fase === 'prueba', ascensiones, entrenamientos, categoriaNueva, produccion, investigaciones, mantenimiento };
  });
}

/** Sube la categoría de cada gremio si su prestigio lo permite. Devuelve la nueva del jugador, si sube. */
function actualizarCategorias(estado: EstadoJuego): Letra | null {
  let nueva: Letra | null = null;
  for (const g of Object.values(estado.gremios)) {
    const c = actualizarCategoria(estado, g);
    if (g.esJugador) nueva = c;
  }
  return nueva;
}

function resolverRegresos(estado: EstadoJuego, azar: Azar, ascensiones: ResultadoAscension[]): InformeMision[] {
  const vuelven = estado.enCurso.filter((c) => c.diaVuelta <= estado.dia);
  estado.enCurso = estado.enCurso.filter((c) => c.diaVuelta > estado.dia);
  const informes: InformeMision[] = [];
  for (const c of vuelven) {
    if (c.ascension) {
      const r = resolverAscension(estado, azar, c);
      if (r && c.gremioId === estado.jugadorId) ascensiones.push(r);
      continue;
    }
    const g = estado.gremios[c.gremioId];
    // Un héroe en misión no se puede vender ni comprar: el equipo vuelve completo.
    const equipo = c.equipo.map((id) => obtenerHeroe(estado, id));
    const informe = resolverMision(azar, c.mision, equipo, c.gremioId, modificadoresMision(estado, c.gremioId));
    informes.push(informe);
    if (!g) continue;
    g.oro += informe.oro;
    // Rama militar: el oro ganado con misiones con éxito es desarrollo militar.
    if (g.esJugador && informe.exito) sumarPuntos(estado, 'militar', puntosMilitares(informe.oro));
    if (informe.exito && c.mision.rango === 'alto') {
      g.misionesAltas += 1;
      if (!g.esJugador) registrar(estado, 'rival', `${g.nombre} completa una misión de rango alto.`);
    }
    if (g.esJugador) {
      registrar(estado, 'mision', `«${c.mision.titulo}»: ${informe.exito ? 'éxito' : 'fracaso'}, +${informe.oro} de oro.`);
    }
  }
  return informes;
}

function avanzarDia(estado: EstadoJuego, azar: Azar): void {
  estado.dia += 1;
  estado.fase = 'gestion';
  estado.tablon = generarTablon(azar, () => nuevoId(estado, 'm'), multiplicadores(categoria(jugador(estado))));
  // Cada semana, un maestro rival puede lanzar un reto.
  if ((estado.dia - 1) % balance.calendario.diasPorSemana === 0) generarReto(estado, azar);
  if (estado.registro.length > MAX_REGISTRO) estado.registro = estado.registro.slice(-MAX_REGISTRO);
}

// ---------------------------------------------------------------------------
// Prueba de los Novatos
// ---------------------------------------------------------------------------

/** Cómo es la Prueba de los Novatos para la categoría del gremio del jugador: cuántos llegan y cómo son. */
export function pruebaDeCategoria(estado: EstadoJuego): { cantidad: number; poder: [number, number]; potencial: Record<string, number> } {
  const t = balance.novatos.porCategoria as Record<string, { cantidad: number; poder: number[]; potencial: Record<string, number> }>;
  const d = t[categoria(jugador(estado))] ?? t.D!;
  return { cantidad: d.cantidad, poder: [d.poder[0] ?? 10, d.poder[1] ?? 35], potencial: d.potencial };
}

function empezarPrueba(estado: EstadoJuego, azar: Azar): void {
  const N = pruebaDeCategoria(estado);
  const pendientes: string[] = [];
  for (let i = 0; i < N.cantidad; i++) {
    const h = generarHeroe(azar, nuevoId(estado, 'h'), { poder: N.poder, potencial: [letraPotencialNovato(azar, N.potencial)] });
    estado.heroes[h.id] = h;
    pendientes.push(h.id);
  }
  estado.fase = 'prueba';
  estado.prueba = { pendientes, subasta: null, resultados: [] };
  registrar(estado, 'novatos', `Prueba de los Novatos: ${N.cantidad} jóvenes despiertan sus poderes.`);
}

function pruebaEnCurso(estado: EstadoJuego) {
  if (estado.fase !== 'prueba' || !estado.prueba) throw new Error('No hay ninguna Prueba de los Novatos en curso');
  return estado.prueba;
}

/** Saca al siguiente candidato y abre su subasta. Devuelve false si no quedan. */
export function siguienteCandidato(estado: EstadoJuego): boolean {
  const prueba = pruebaEnCurso(estado);
  if (prueba.subasta && !prueba.subasta.terminada) throw new Error('La subasta actual no ha terminado');
  const id = prueba.pendientes.shift();
  if (!id) {
    prueba.subasta = null;
    return false;
  }
  prueba.subasta = conAzar(estado, (azar) => crearSubasta(estado, azar, id));
  return true;
}

/** El jugador sube la puja o se retira en la subasta actual. */
export function pujarNovato(estado: EstadoJuego, accion: 'pujar' | 'retirarse'): void {
  const prueba = pruebaEnCurso(estado);
  const s = prueba.subasta;
  if (!s) throw new Error('No hay ninguna subasta abierta');
  accionJugador(estado, s, accion);
  if (s.terminada) prueba.resultados.push({ heroeId: s.heroeId, ganador: cerrarSubasta(estado, s), precio: s.precio });
}

export interface ResumenSemana {
  ranking: FilaRanking[];
  puestoAnterior: number;
  /** Cierre de temporada (cada 4 semanas). */
  temporada: { numero: number; puesto: number; premio: number } | null;
  victoria: boolean;
  /** Torneo de fin de temporada (solo al cerrar la temporada). */
  torneo: CombateTorneo[] | null;
  /** Nueva categoría del gremio del jugador, si ha subido (por ejemplo, al fichar un novato destacado). */
  categoriaNueva: Letra | null;
}

/**
 * Termina la Prueba (las subastas que queden se resuelven sin el jugador), actualiza el ranking,
 * cierra la temporada si toca y pasa al día siguiente.
 */
export function terminarPrueba(estado: EstadoJuego): ResumenSemana {
  const prueba = pruebaEnCurso(estado);
  return conAzar(estado, (azar) => {
    const restantes = [...(prueba.subasta && !prueba.subasta.terminada ? [prueba.subasta.heroeId] : []), ...prueba.pendientes];
    for (const id of restantes) {
      const s = crearSubasta(estado, azar, id);
      accionJugador(estado, s, 'retirarse');
      prueba.resultados.push({ heroeId: id, ganador: cerrarSubasta(estado, s), precio: s.precio });
    }
    for (const rival of rivales(estado)) ajustarPlantilla(estado, rival.id);
    // Los novatos que nadie fichó vuelven a casa.
    for (const r of prueba.resultados) if (!r.ganador) delete estado.heroes[r.heroeId];
    estado.prueba = null;

    // Cada semana el desarrollo antiguo pierde peso: la especialización sigue a lo que haces ahora.
    decaerPuntos(estado);
    actualizarDominante(estado);
    // Al cerrar la temporada, antes del ranking final, se celebra el torneo.
    const torneo = esFinDeTemporada(estado.dia) ? celebrarTorneo(estado, azar) : null;
    const categoriaNueva = actualizarCategorias(estado);
    const puestoAnterior = puesto(estado, estado.jugadorId);
    estado.ranking = calcularRanking(estado);
    const j = jugador(estado);
    const actual = puesto(estado, j.id);
    registrar(estado, 'ranking', `Ranking de la semana: ${j.nombre} ${actual}.º (antes ${puestoAnterior}.º).`);

    let temporada: ResumenSemana['temporada'] = null;
    let victoria = false;
    if (esFinDeTemporada(estado.dia)) {
      const numero = temporadaDe(estado.dia);
      for (const fila of estado.ranking) gremio(estado, fila.gremioId).oro += premioTemporada(fila.puesto);
      temporada = { numero, puesto: actual, premio: premioTemporada(actual) };
      registrar(estado, 'temporada', `Fin de la temporada ${numero}: ${j.nombre} termina ${actual}.º y cobra ${temporada.premio} de oro.`);
      // Condición de victoria provisional (biblia [Abierto]): cerrar una temporada en el n.º 1.
      victoria = actual === 1;
    }
    if (victoria) {
      estado.fase = 'victoria';
      registrar(estado, 'temporada', `${j.nombre} es el gremio número uno.`);
    } else {
      avanzarDia(estado, azar);
    }
    return { ranking: estado.ranking, puestoAnterior, temporada, victoria, torneo, categoriaNueva };
  });
}

/** Texto corto del calendario: «Temporada 1 · Día 3 de 28». */
export function textoCalendario(estado: EstadoJuego): string {
  return `Temporada ${temporadaDe(estado.dia)} · Día ${diaDeTemporada(estado.dia)} de ${balance.calendario.diasPorTemporada}`;
}
