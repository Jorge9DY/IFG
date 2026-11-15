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
import { CATALOGO, generarHeroe, heroeDeCatalogo, indiceLetra, letraPotencialNovato, pisoDe } from './heroes';
import { duracionMision, generarTablon, probabilidadMision, resolverMision, salirDeMision, type InformeMision } from './misiones';
import { alFicharNovato, apuntarConocidas, cadaDia, cadaSemana, huecosEquipo, motivoNoIr } from './habilidades';
import { riesgoDeMuerte } from './muerte';
import { actualizarDesbloqueos } from './desbloqueos';
import { decidirMomento, evaluarHistoria } from './historia';
import { descansoDelDia, romperVetos } from './relaciones';
import { caducarEventos, evaluarEventos } from './eventosSociales';
import { marcharse } from './economia';
import { caducarReto, generarReto } from './retos';
import { celebrarTorneo, type CombateTorneo } from './torneo';
import { resolverEntrenamientos, type ResultadoEntrenamiento } from './entrenamiento';
import { resolverAscension, type ResultadoAscension } from './ascension';
import { actualizarCategoria, categoria, categoriaPorPrestigio, multiplicadores } from './categorias';
import { prestigio } from './ranking';
import { calcularRanking, premioTemporada, sumarPuntos } from './ranking';
import { ajustarPlantilla, eligeMisiones, entrenarRivales, invertir } from './rivales';
import { accionJugador, cerrarSubasta, crearSubasta } from './subasta';
import type { Clase, Gremio, Heroe, Letra, Mision, PerfilRival } from './tipos';

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
    version: 10,
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
    ranking: [],
    registro: [],
    contadorIds: 0,
    relaciones: {},
    social: { pendientes: [], cooldowns: {}, unicos: [], memorias: [], vetos: [], contador: 0 },
    bolsaNovatos: CATALOGO.filter((f) => f.gremio === 'libre').map((f) => f.id),
    caidos: [],
    desbloqueos: [],
    habilidadesConocidas: [],
    historia: { marcas: [], vistos: [], pendiente: null },
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
    // Modo historia: el jugador empieza con los héroes «Prota» del catálogo, tal como vienen en la hoja.
    // Los que ocupan más de un hueco (AllBlack), al final de la lista.
    const protas = CATALOGO.filter((x) => x.gremio === 'jugador').sort((a, b) => Number(a.habilidad === 'multiplicacion') - Number(b.habilidad === 'multiplicacion'));
    for (const f of protas) {
      const h = heroeDeCatalogo(azar, f, 'hoja');
      estado.heroes[h.id] = h;
      j.plantilla.push(h.id);
    }
    for (const d of datosGremios.rivales) {
      const g = nuevoGremio({
        id: d.id,
        nombre: d.nombre,
        esJugador: false,
        oro: d.oro,
        nivelSede: Math.max(d.nivelSede, balance.rivales.nivelSedeMinimo),
        nivelOjeadores: d.nivelOjeadores,
        misionesAltas: d.misionesAltas,
        novatosDestacados: d.novatosDestacados,
        personalidad: d.personalidad,
        estrategia: d.estrategia,
        perfil: d.perfil as PerfilRival,
        clase: d.clase as Clase,
      });
      // Sus héroes son los del catálogo y ya están en su rango máximo (decisión del propietario).
      for (const f of CATALOGO.filter((x) => x.gremio === d.id)) {
        const h = heroeDeCatalogo(azar, f, 'rival');
        estado.heroes[h.id] = h;
        g.plantilla.push(h.id);
      }
    }
    for (const g of Object.values(estado.gremios)) g.categoria = categoriaPorPrestigio(prestigio(g));
    cadaDia(estado, azar);
    estado.tablon = generarTablon(azar, () => nuevoId(estado, 'm'), multiplicadores(categoria(j)));
    generarReto(estado, azar);
  });
  estado.ranking = calcularRanking(estado);
  apuntarConocidas(estado);
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
  if (new Set(equipo).size !== equipo.length) return 'Héroe repetido en el equipo';
  const j = jugador(estado);
  for (const id of equipo) {
    if (!j.plantilla.includes(id)) return 'Ese héroe no es de tu gremio';
    const h = obtenerHeroe(estado, id);
    if (h.estado !== 'libre') return `${h.nombre} no está disponible`;
    const motivo = motivoNoIr(estado, h, equipo);
    if (motivo) return motivo;
  }
  const huecos = huecosEquipo(equipo.map((id) => obtenerHeroe(estado, id)));
  if (huecos !== mision.equipo) return `Esta misión necesita ${mision.equipo} ${mision.equipo === 1 ? 'hueco' : 'huecos'} (este equipo ocupa ${huecos})`;
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
  const heroes = equipo.map((id) => obtenerHeroe(estado, id));
  const entorno = { estado, gremioId: estado.jugadorId };
  const probabilidad = probabilidadMision(carta, heroes, entorno);
  const diaVuelta = diaDeVuelta(estado, carta, equipo);
  conAzar(estado, (azar) => salirDeMision(azar, mision, heroes, entorno));
  // Las peticiones aceptadas de no compartir misión no bloquean, pero romperlas tiene consecuencias.
  romperVetos(estado, equipo);
  for (const h of heroes) h.estado = 'en mision';
  estado.enCurso.push({ mision, gremioId: estado.jugadorId, equipo: [...equipo], diaVuelta, cartaId: carta.id, probabilidad, diaSalida: estado.dia });
}

/** Probabilidad de éxito de un equipo del jugador en una misión, con todo (habilidades, ánimo, química). */
export function probabilidadJugador(estado: EstadoJuego, mision: Mision, equipo: readonly Heroe[]): number {
  return probabilidadMision(mision, equipo, { estado, gremioId: estado.jugadorId });
}

/** true si mandar a este equipo a esta misión pone vidas en juego. */
export function hayRiesgoDeMuerte(estado: EstadoJuego, mision: Mision, equipo: readonly Heroe[]): boolean {
  return equipo.length > 0 && riesgoDeMuerte(mision, probabilidadJugador(estado, mision, equipo));
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
  /** Héroes del jugador que han muerto hoy. */
  muertes: string[];
  /** Lo que ha pasado entre tus héroes (relaciones y habilidades). */
  vida: string[];
  /** Asuntos sociales nuevos que esperan tu decisión. */
  asuntos: number;
  /** Sistemas que se abren hoy (desbloqueo progresivo). */
  desbloqueos: string[];
}

export function finalizarDia(estado: EstadoJuego): ResumenDia {
  if (estado.fase !== 'gestion') throw new Error('Ahora no se puede finalizar el día');
  // Un momento de la historia sin decidir (la interfaz siempre lo pregunta): primera opción.
  if (estado.historia.pendiente) decidirMomento(estado, 0);
  const dia = estado.dia;
  const desde = estado.registro.length;
  return conAzar(estado, (azar) => {
    // Los rivales también lanzan sus misiones del día.
    for (const rival of rivales(estado)) {
      for (const { mision, equipo, probabilidad } of eligeMisiones(estado, azar, rival.id, () => nuevoId(estado, 'm'))) {
        salirDeMision(azar, mision, equipo, { estado, gremioId: rival.id });
        for (const h of equipo) h.estado = 'en mision';
        estado.enCurso.push({ mision, gremioId: rival.id, equipo: equipo.map((h) => h.id), diaVuelta: dia + duracionMision(mision, equipo) - 1, probabilidad, diaSalida: dia });
      }
    }

    // Los lesionados se recuperan un día (y los que descansan, también cuentan sus días).
    for (const h of Object.values(estado.heroes)) {
      if ((h.estado === 'lesionado' || h.estado === 'descansando') && --h.diasLesion <= 0) {
        h.estado = 'libre';
        h.diasLesion = 0;
      }
    }

    // Regreso de misiones: recompensas, lesiones y experiencia (y Ascensiones).
    const ascensiones: ResultadoAscension[] = [];
    const informes = resolverRegresos(estado, azar, ascensiones);
    const entrenamientos = resolverEntrenamientos(estado);
    const categoriaNueva = actualizarCategorias(estado);
    caducarReto(estado);

    // Sistema social: descanso del día, asuntos sin respuesta y asuntos nuevos.
    descansoDelDia(estado);
    caducarEventos(estado);
    const asuntos = evaluarEventos(estado).length;
    evaluarHistoria(estado);

    // Día 7: sueldos, la semana de relaciones y habilidades y, después, Prueba de los Novatos.
    let sueldos: PagoSueldos | null = null;
    if (esDia7(dia)) {
      sueldos = pagarSueldos(estado, estado.jugadorId);
      for (const rival of rivales(estado)) {
        pagarSueldos(estado, rival.id);
        invertir(estado, azar, rival.id);
        entrenarRivales(estado, rival.id);
      }
      semanaDeVida(estado, azar);
      empezarPrueba(estado, azar);
    } else {
      avanzarDia(estado, azar);
    }
    const nuevos = estado.registro.slice(desde);
    const noticias = nuevos.filter((e) => e.tipo === 'rival' || e.tipo === 'reto').map((e) => e.texto);
    const vida = nuevos.filter((e) => e.tipo === 'relacion' || e.tipo === 'habilidad' || e.tipo === 'muerte' || e.tipo === 'social').map((e) => e.texto);
    const muertes = estado.caidos.filter((c) => c.dia === dia && c.gremioId === estado.jugadorId).map((c) => c.nombre);
    return { dia, informes: informes.filter((i) => i.gremioId === estado.jugadorId), sueldos, noticias, prueba: estado.fase === 'prueba', ascensiones, entrenamientos, categoriaNueva, muertes, vida, asuntos, desbloqueos: nuevos.filter((e) => e.texto.startsWith('¡Nuevo!')).map((e) => e.texto) };
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
    const informe = resolverMision(azar, c.mision, equipo, c.gremioId, { estado, gremioId: c.gremioId, dia: c.diaSalida }, c.probabilidad);
    informes.push(informe);
    if (!g) continue;
    g.oro += informe.oro;
    if (informe.exito) sumarPuntos(g, c.mision.rango);
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

/**
 * El día 7: habilidades semanales. Las relaciones no cambian solas con el tiempo (sistema social): solo por
 * acontecimientos, y quien quiere irse lo pide con un evento.
 */
function semanaDeVida(estado: EstadoJuego, azar: Azar): void {
  const s = cadaSemana(estado, azar);
  for (const { heroeId, motivo } of s.seVan) {
    const h = estado.heroes[heroeId];
    const g = Object.values(estado.gremios).find((x) => x.plantilla.includes(heroeId));
    if (h && g) marcharse(estado, h, g, motivo.replace(/\.$/, ''));
  }
}

function avanzarDia(estado: EstadoJuego, azar: Azar): void {
  apuntarConocidas(estado);
  estado.dia += 1;
  estado.fase = 'gestion';
  actualizarDesbloqueos(estado);
  cadaDia(estado, azar);
  estado.tablon = generarTablon(azar, () => nuevoId(estado, 'm'), multiplicadores(categoria(jugador(estado))));
  // Cada semana, un maestro rival puede lanzar un reto.
  if ((estado.dia - 1) % balance.calendario.diasPorSemana === 0) generarReto(estado, azar);
  if (estado.registro.length > MAX_REGISTRO) estado.registro = estado.registro.slice(-MAX_REGISTRO);
}

// ---------------------------------------------------------------------------
// Prueba de los Novatos
// ---------------------------------------------------------------------------

/** Cómo es la Prueba de los Novatos para la categoría del gremio del jugador: cuántos llegan y cómo son. */
export function pruebaDeCategoria(estado: EstadoJuego): { cantidad: number; poder: [number, number]; potencial: Record<string, number>; pesoTecho: number } {
  const t = balance.novatos.porCategoria as Record<string, { cantidad: number; poder: number[]; potencial: Record<string, number>; pesoTecho?: number }>;
  const d = t[categoria(jugador(estado))] ?? t.D!;
  return { cantidad: d.cantidad, poder: [d.poder[0] ?? 1, d.poder[1] ?? 9], potencial: d.potencial, pesoTecho: d.pesoTecho ?? 0 };
}

/**
 * Los candidatos salen de la bolsa de héroes libres del catálogo, todos en rango F (decisión del propietario).
 * Con más categoría llegan más y es más fácil que salgan los de techo alto. Si la bolsa se vacía, llegan genéricos.
 */
function empezarPrueba(estado: EstadoJuego, azar: Azar): void {
  const N = pruebaDeCategoria(estado);
  const pesoTecho = N.pesoTecho;
  const pendientes: string[] = [];
  for (let i = 0; i < N.cantidad; i++) {
    const bolsa = estado.bolsaNovatos.map((id) => CATALOGO.find((f) => f.id === id)).filter((f) => f !== undefined);
    let h: Heroe;
    if (bolsa.length > 0) {
      const pesos = bolsa.map((f) => 1 + (pesoTecho * indiceLetra(f.techo as Letra)) / 9);
      let tirada = azar.siguiente() * pesos.reduce((a, b) => a + b, 0);
      let elegida = bolsa[0]!;
      for (let k = 0; k < bolsa.length; k++) {
        tirada -= pesos[k]!;
        if (tirada < 0) {
          elegida = bolsa[k]!;
          break;
        }
      }
      estado.bolsaNovatos = estado.bolsaNovatos.filter((id) => id !== elegida.id);
      h = heroeDeCatalogo(azar, elegida, 'novato');
    } else {
      h = generarHeroe(azar, nuevoId(estado, 'h'), { poder: N.poder, potencial: [letraPotencialNovato(azar, N.potencial)] });
    }
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
  /** Puntos del jugador en el ranking oficial anterior (para enseñar el progreso aunque no cambie de puesto). */
  puntosAnteriores: number;
  /** Sistemas que se abren al empezar la semana nueva. */
  desbloqueos: string[];
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
  const desde = estado.registro.length;
  return conAzar(estado, (azar) => {
    const restantes = [...(prueba.subasta && !prueba.subasta.terminada ? [prueba.subasta.heroeId] : []), ...prueba.pendientes];
    for (const id of restantes) {
      const s = crearSubasta(estado, azar, id);
      accionJugador(estado, s, 'retirarse');
      prueba.resultados.push({ heroeId: id, ganador: cerrarSubasta(estado, s), precio: s.precio });
    }
    for (const rival of rivales(estado)) ajustarPlantilla(estado, rival.id);
    // Los novatos que nadie fichó vuelven a casa (los del catálogo, a la bolsa: pueden volver otra semana).
    for (const r of prueba.resultados) {
      if (r.ganador) {
        const h = estado.heroes[r.heroeId];
        if (h) alFicharNovato(estado, azar, h, r.ganador);
        continue;
      }
      const h = estado.heroes[r.heroeId];
      if (h?.catalogo && !estado.bolsaNovatos.includes(h.catalogo)) estado.bolsaNovatos.push(h.catalogo);
      delete estado.heroes[r.heroeId];
    }
    estado.prueba = null;

    // Al cerrar la temporada, antes del ranking final, se celebra el torneo.
    const torneo = esFinDeTemporada(estado.dia) ? celebrarTorneo(estado, azar) : null;
    const categoriaNueva = actualizarCategorias(estado);
    const puestoAnterior = puesto(estado, estado.jugadorId);
    const puntosAnteriores = estado.ranking.find((f) => f.gremioId === estado.jugadorId)?.puntos ?? 0;
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
      // Decisión del propietario: cada temporada es una carrera nueva. Los puntos vuelven a 0.
      for (const g of Object.values(estado.gremios)) g.puntosTemporada = 0;
      registrar(estado, 'temporada', `Fin de la temporada ${numero}: ${j.nombre} termina ${actual}.º y cobra ${temporada.premio} de oro.`);
      // Modo historia (provisional, pregunta 18): la historia termina al cerrar la última temporada.
      victoria = numero >= balance.historia.temporadas;
    }
    if (victoria) {
      estado.fase = 'victoria';
      registrar(estado, 'temporada', textoFinal(actual));
    } else {
      avanzarDia(estado, azar);
    }
    const desbloqueos = estado.registro.slice(desde).filter((e) => e.texto.startsWith('¡Nuevo!')).map((e) => e.texto);
    return { ranking: estado.ranking, puestoAnterior, puntosAnteriores, desbloqueos, temporada, victoria, torneo, categoriaNueva };
  });
}

/** Final del modo historia según el puesto (provisional: los finales por héroe están por diseñar). */
export function textoFinal(puesto: number): string {
  if (puesto === 1) return 'Final «Leyenda»: tu gremio termina la historia como el número uno.';
  if (puesto <= 3) return 'Final «Respeto»: no sois los primeros, pero nadie se ríe ya de vosotros.';
  return 'Final «Olvido»: la historia de tu gremio se pierde entre las demás.';
}

/** Texto corto del calendario: «Temporada 1 · Día 3 de 28». */
export function textoCalendario(estado: EstadoJuego): string {
  return `Temporada ${temporadaDe(estado.dia)} · Día ${diaDeTemporada(estado.dia)} de ${balance.calendario.diasPorTemporada}`;
}
