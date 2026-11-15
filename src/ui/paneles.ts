// Interfaz principal (biblia, sección 3): solo cinco elementos en pantalla. Oro arriba a la izquierda,
// Finalizar día arriba a la derecha, Gestionar gremio a la izquierda, Lanzar misiones a la derecha y
// Mercado de héroes abajo en el centro. Todo lo demás vive dentro de sus menús. Solo lee el estado y llama al motor.

import { condicionesCuracion, curar, sueldosDe } from '../motor/economia';
import { condicionesAscension, iniciarAscension } from '../motor/ascension';
import { condicionesEntrenamiento, entrenar, plazasEntrenamiento } from '../motor/entrenamiento';
import type { Progreso } from '../motor/heroes';
import { categoria, siguienteCategoria } from '../motor/categorias';
import { prestigio } from '../motor/ranking';
import { diaDeTemporada, diasParaPrueba, esDia7, heroe as obtenerHeroe, heroesDe, jugador, misionDe, puesto, rivales, type EstadoJuego } from '../motor/estado';
import { alLimite, indiceLetra, letraDe, nivelOjeo, potencialEstimado, rango, rangoPotencial, sueldo } from '../motor/heroes';
import { LETRAS } from '../motor/tipos';
import { NOMBRE_INSTALACION, infoInstalacion, mejorar, plazas, type Instalacion } from '../motor/instalaciones';
import { comprar, condicionesCompra, ofertaVenta, vender } from '../motor/mercado';
import { clasesCubiertas, duracionMision, socialEquipo } from '../motor/misiones';
import { conoceHabilidad, efectosEnMision, ficha, huecos, huecosEquipo, poderBestia } from '../motor/habilidades';
import { OJEO_MAXIMO } from '../motor/heroes';
import {
  afinidad,
  estres,
  felicidad,
  memoriasDe,
  nivelDe,
  rasgos,
  relacion,
  relacionesDe,
  romance,
  sonPareja,
  textoEstres,
  textoFelicidad,
  vetosDelEquipo,
  type Romance,
  type Vinculo,
} from '../motor/relaciones';
import { pendientes, resolverEvento } from '../motor/eventosSociales';
import { desbloqueado, diaDesbloqueo, esNuevo } from '../motor/desbloqueos';
import social from '../datos/social.json';
import { sueldoEn } from '../motor/economia';
import { fraseReto, heroesParaReto, motivoNoAceptar, aceptarReto, rechazarReto } from '../motor/retos';
import {
  conAzar,
  crearPartida,
  diaDeVuelta,
  lanzadasHoy,
  hayRiesgoDeMuerte,
  probabilidadJugador,
  textoFinal,
  vuelveTrasPrueba,
  finalizarDia,
  lanzarMision,
  motivoNoLanzar,
  pujarNovato,
  siguienteCandidato,
  terminarPrueba,
  textoCalendario,
  type ResumenDia,
  type ResumenSemana,
} from '../motor/partida';
import { calcularRanking } from '../motor/ranking';
import { interesados, motivoNoPujar, siguientePrecio } from '../motor/subasta';
import type { Heroe, Mision, RangoMision } from '../motor/tipos';
import balance from '../datos/balance.json';
import textosAscension from '../narrativa/ascension.json';
import type { ResultadoAscension } from '../motor/ascension';
import { equipoRecomendado, heroesLibres, nivelDificultad, probabilidadRecomendada, objetivoDelMomento } from './ayudas';
import { borrar, cargar, guardar } from './guardado';
import { esc, num, pct } from './html';
import type { CombateTorneo } from '../motor/torneo';
import { retrato } from './retrato';

export type Panel = 'nueva' | 'misiones' | 'mercado' | 'gremio' | 'prueba' | 'dia' | 'semana' | 'victoria';
type PestanaGremio = 'heroes' | 'relaciones' | 'instalaciones' | 'ranking';

const TITULOS: Record<Panel, string> = {
  nueva: 'Gremio de héroes',
  misiones: 'Lanzar misiones',
  mercado: 'Mercado de héroes',
  gremio: 'Gestionar gremio',
  prueba: 'Prueba de los Novatos',
  dia: 'Resumen del día',
  semana: 'Ranking de la semana',
  victoria: 'Fin de la historia',
};

const ICONO_CLASE: Record<string, string> = { Guerrero: '⚔', Mago: '✦', Explorador: '➶', Sanador: '✚' };
const EFECTO_CLASE: Record<string, string> = {
  Guerrero: 'Guerrero: se lesiona menos.',
  Mago: 'Mago: más poder en misiones de rango alto, pero se lesiona más.',
  Explorador: 'Explorador: el equipo vuelve un día antes de las misiones de rango alto.',
  Sanador: 'Sanador: sus compañeros se lesionan menos.',
};

/** Cómo se anuncia un despertar según cuántos rangos sube su techo por encima del nuevo rango. */
const DESPERTAR: Record<number, { titulo: string; clase: string }> = {
  2: { titulo: 'Despertar extraordinario', clase: 'extraordinario' },
  3: { titulo: 'Despertar legendario', clase: 'legendario' },
};

/** Brillo del sobre de un novato según el mejor techo que ven tus ojeadores. */
const P = balance.puntosTemporada;
const TEXTO_PUNTOS = `Los puntos de temporada se ganan con misiones cumplidas (alta ${P.mision.alto}, media ${P.mision.medio}, baja ${P.mision.bajo}), retos (${P.reto}), novatos destacados (${P.novatoDestacado}), Ascensiones (${P.ascension}) y el torneo (${P.torneo} por categoría). Vuelven a 0 cada temporada.`;

const BRILLO: Record<string, string> = { S: 'oro', 'A+': 'violeta', A: 'violeta', 'B+': 'azul', B: 'azul' };

const RANGO: Record<RangoMision, { nombre: string; riesgo: string }> = {
  bajo: { nombre: 'Rango bajo', riesgo: 'Riesgo bajo' },
  medio: { nombre: 'Rango medio', riesgo: 'Riesgo medio' },
  alto: { nombre: 'Rango alto', riesgo: 'Riesgo alto' },
};

const TEXTO_INSTALACION: Record<Instalacion, string> = {
  sede: 'Más plazas para héroes y más prestigio en el ranking.',
  ojeadores: 'Estrecha el rango de potencial que ves de los héroes y novatos. También da prestigio.',
  entrenamiento: 'Entrena a tus héroes unos días a cambio de oro, sin riesgo de lesión. Cada nivel da una plaza más y más experiencia. También da prestigio.',
};

/** Paneles que no se cierran con ✕ ni con Escape. */
const FIJOS: readonly Panel[] = ['nueva', 'prueba', 'semana', 'victoria'];

export interface ElementosInterfaz {
  cabecera: HTMLElement;
  objetivo: HTMLElement;
  menu: HTMLElement;
  accion: HTMLElement;
  equipo: HTMLElement;
  panel: HTMLElement;
}

export class Interfaz {
  estado: EstadoJuego | null = cargar();
  private abierto: Panel | null = null;
  private mensaje = '';
  private misionId: string | null = null;
  /** Héroe cuya Ascensión espera confirmación en el inventario. */
  private confirmarAscension: string | null = null;
  /** Novatos ya revelados en la Prueba (como sobres de un gacha) y los que se acaban de abrir. */
  private revelados = new Set<string>();
  private recienRevelados = new Set<string>();
  private claveRevelado = '';
  private equipo: string[] = [];
  private pestanaMercado: 'comprar' | 'vender' = 'comprar';
  private gremioRival = 'dragon';
  private pestanaGremio: PestanaGremio = 'heroes';
  /** Pareja elegida en la tabla de relaciones («a|b»). */
  private parejaVista: string | null = null;
  private resumenDia: ResumenDia | null = null;
  private resumenSemana: ResumenSemana | null = null;

  /** Barra de la Ascensión en la pantalla principal y gran reveal del resultado (se crean aquí). */
  private readonly hudAscension: HTMLElement;
  private readonly revelacion: HTMLElement;

  constructor(private readonly el: ElementosInterfaz) {
    const pantalla = el.panel.parentElement ?? document.body;
    this.hudAscension = document.createElement('section');
    this.hudAscension.className = 'hud ascension-hud';
    this.hudAscension.setAttribute('aria-live', 'polite');
    this.hudAscension.hidden = true;
    this.revelacion = document.createElement('div');
    this.revelacion.className = 'revelacion';
    this.revelacion.setAttribute('role', 'dialog');
    this.revelacion.setAttribute('aria-modal', 'true');
    this.revelacion.hidden = true;
    pantalla.append(this.hudAscension, this.revelacion);
    this.revelacion.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-accion=cerrar-reveal]')) this.revelacion.hidden = true;
    });
    for (const zona of [el.panel, el.menu, el.accion, el.objetivo, el.equipo, el.cabecera]) {
      zona.addEventListener('click', (e) => this.alHacerClic(e));
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.revelacion.hidden) {
        this.revelacion.hidden = true;
        return;
      }
      if (e.key === 'Escape' && this.abierto && !FIJOS.includes(this.abierto)) this.cerrar();
    });
    if (!this.estado) this.abrir('nueva');
    else if (this.estado.fase === 'victoria') this.abrir('victoria');
    else if (this.estado.fase === 'prueba') this.abrir('prueba');
    this.repintar();
  }

  get bloqueada(): boolean {
    return this.abierto !== null;
  }

  /** Héroes del gremio para la sede 3D (solo lectura). */
  heroesEnSede(): { id: string; clase: string; estado: string }[] {
    if (!this.estado) return [];
    return heroesDe(this.estado, this.estado.jugadorId).map((h) => ({ id: h.id, clase: h.clase, estado: h.estado }));
  }

  abrir(panel: Panel): void {
    this.abierto = panel;
    this.mensaje = '';
    this.repintar();
  }

  cerrar(): void {
    this.abierto = null;
    this.mensaje = '';
    this.repintar();
  }

  /** Lugar de la sede 3D → acción. */
  abrirDesdeSede(punto: string): void {
    const estado = this.estado;
    if (!estado || estado.fase === 'victoria') return;
    if (estado.fase === 'prueba') return this.abrir('prueba');
    if (punto === 'puerta') return this.finalizarElDia();
    if (punto === 'tablon') return this.abrirMisiones();
    if (punto === 'mostrador') return this.abrir('mercado');
    const pestana: Record<string, PestanaGremio> = { recepcion: 'instalaciones', dormitorios: 'heroes', pizarra: 'ranking' };
    if (pestana[punto]) {
      this.pestanaGremio = pestana[punto]!;
      this.abrir('gremio');
    }
  }

  // ---------------------------------------------------------------------------
  // Pantalla principal: los cinco elementos
  // ---------------------------------------------------------------------------

  private repintar(): void {
    const estado = this.estado;
    const enJuego = !!estado && estado.fase !== 'victoria';
    this.el.menu.hidden = !enJuego;
    this.el.accion.hidden = !enJuego;
    this.el.equipo.hidden = !enJuego;
    this.el.objetivo.hidden = !enJuego;

    if (estado) {
      const j = jugador(estado);
      this.el.cabecera.innerHTML = `
        <div class="oro ${j.oro < 0 ? 'negativo' : ''}"><span>Oro</span><b>${num(j.oro)}</b></div>
        <div class="calendario">${esc(textoCalendario(estado))} · ${esc(j.nombre)} · categoría ${categoria(j)} · ${puesto(estado, j.id)}.º del ranking</div>`;
    } else {
      this.el.cabecera.innerHTML = '<div class="oro"><span>Gremio</span><b>de héroes</b></div>';
    }

    this.pintarAscensiones(estado);
    if (enJuego && estado) {
      if (estado.fase === 'prueba') {
        this.el.objetivo.innerHTML = `<button class="boton-dia novatos" data-abrir="prueba">Prueba de los Novatos<small>Los gremios pujan por los novatos</small></button>`;
      } else {
        const faltan = diasParaPrueba(estado.dia);
        const pista = esDia7(estado.dia)
          ? `Hoy se pagan los sueldos (${num(sueldosDe(estado, estado.jugadorId))}) y después llega la Prueba de los Novatos`
          : `Prueba de los Novatos en ${faltan} ${faltan === 1 ? 'día' : 'días'}`;
        const meta = objetivoDelMomento(estado);
        const objetivo = meta.abrir
          ? `<button class="meta-objetivo" data-abrir="${meta.abrir}"${meta.abrir === 'gremio' && estado.social.pendientes.length ? ' data-pestana="relaciones"' : ''}>▸ ${esc(meta.texto)}</button>`
          : `<p class="meta-objetivo">▸ ${esc(meta.texto)}</p>`;
        this.el.objetivo.innerHTML = `<button class="boton-dia" data-accion="finalizar">Finalizar día<small>${pista}</small></button>${objetivo}`;
      }
      const libres = heroesLibres(estado).length;
      const bloqueo = estado.fase !== 'gestion' ? 'disabled' : '';
      const todos = heroesDe(estado, estado.jugadorId);
      const cuenta = (e: Heroe['estado']): number => todos.filter((h) => h.estado === e).length;
      const resumen = [`${libres} ${libres === 1 ? 'libre' : 'libres'}`, cuenta('en mision') ? `${cuenta('en mision')} de misión` : '', cuenta('lesionado') ? `${cuenta('lesionado')} ${cuenta('lesionado') === 1 ? 'lesionado' : 'lesionados'}` : '', cuenta('entrenando') ? `${cuenta('entrenando')} entrenando` : '']
        .filter(Boolean)
        .join(' · ');
      const sinCobrar = todos.some((h) => h.semanasSinCobrar > 0) ? '<em class="alerta-texto">Hay héroes sin cobrar</em>' : '';
      const asuntos = estado.social.pendientes.length;
      const avisoAsuntos = asuntos ? `<em class="alerta-texto">${asuntos} ${asuntos === 1 ? 'asunto pendiente' : 'asuntos pendientes'}</em>` : '';
      this.el.menu.innerHTML = `<button class="boton-grande gastar" data-abrir="gremio" data-pestana="${asuntos ? 'relaciones' : 'heroes'}" ${bloqueo}><span class="signo">−</span>Gestionar gremio<small>Héroes: ${resumen}</small><small>${desbloqueado(estado, 'relaciones') ? 'Relaciones · ' : ''}Mejorar instalaciones</small>${sinCobrar}${avisoAsuntos}</button>`;
      this.el.equipo.innerHTML = `<button class="boton-grande ganar" data-abrir="misiones" ${bloqueo}><span class="signo">+</span>Lanzar misiones<small>${estado.tablon.length} en el tablón · ${libres} ${libres === 1 ? 'héroe libre' : 'héroes libres'}</small></button>`;
      const retoPendiente = estado.reto && !estado.reto.resultado ? '<em class="alerta-texto">¡Un maestro rival te reta!</em>' : '';
      const mercadoAbierto = desbloqueado(estado, 'mercado');
      const nuevoMercado = esNuevo(estado, 'mercado') ? '<em class="nuevo">¡Nuevo!</em>' : '';
      this.el.accion.innerHTML = mercadoAbierto
        ? `<button class="boton-grande mercado" data-abrir="mercado" ${bloqueo}>Mercado de héroes<small>Compra a otros gremios o vende a los tuyos</small>${nuevoMercado}${retoPendiente}</button>`
        : `<button class="boton-grande mercado cerrado" disabled>Mercado de héroes<small>🔒 Abre el día ${diaDesbloqueo('mercado')}</small></button>`;
    }

    if (!this.abierto) {
      this.el.panel.hidden = true;
      this.el.panel.innerHTML = '';
      return;
    }
    this.el.panel.hidden = false;
    this.el.panel.dataset.panel = this.abierto;
    const cerrable = !FIJOS.includes(this.abierto);
    this.el.panel.innerHTML = `
      <div class="panel-cabecera">
        <h2>${TITULOS[this.abierto]}</h2>
        ${cerrable ? '<button data-accion="cerrar" aria-label="Cerrar">✕</button>' : ''}
      </div>
      ${this.mensaje ? `<p class="mensaje">${esc(this.mensaje)}</p>` : ''}
      <div class="panel-cuerpo">${this.contenido()}</div>`;
  }

  private contenido(): string {
    const estado = this.estado;
    if (this.abierto === 'nueva' || !estado) return this.panelNueva();
    switch (this.abierto) {
      case 'misiones':
        return this.panelMisiones(estado);
      case 'mercado':
        return this.panelMercado(estado);
      case 'gremio':
        return this.panelGremio(estado);
      case 'prueba':
        return this.panelPrueba(estado);
      case 'dia':
        return this.panelDia(estado);
      case 'semana':
        return this.panelSemana(estado);
      case 'victoria':
        return this.panelVictoria(estado);
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Piezas
  // ---------------------------------------------------------------------------

  /** Retrato del héroe con su rango actual en una esquina. */
  /** Clase CSS de un rango («C+» → «rCp»). */
  private cr(letra: string | null): string {
    return `r${(letra ?? '').replace('+', 'p')}`;
  }

  private avatar(h: Heroe): string {
    return `<span class="avatar">${retrato(h)}${this.hexRango(h)}</span>`;
  }

  /** Hexágono con el rango actual del héroe (según su poder). */
  private hexRango(h: Heroe): string {
    const r = rango(h);
    return `<span class="rango ${this.cr(r)}" title="Rango actual: ${r} (según su poder)">${r}</span>`;
  }

  /**
   * Techo: el rango máximo al que puede aspirar, tal como lo ven tus ojeadores. Muestra las letras
   * posibles y una interrogación mientras haya duda; con mejores ojeadores quedan menos letras.
   */
  private techo(estado: EstadoJuego, h: Heroe): string {
    const nivel = nivelOjeo(jugador(estado), h.id);
    const [a, b] = rangoPotencial(h, nivel);
    if (alLimite(h)) return `<span class="techo"><span class="etq">Techo</span><span class="letra-techo ${this.cr(a)}">${a}</span><span class="tenue">alcanzado</span></span>`;
    const letras: string[] = [];
    for (let i = indiceLetra(a); i <= indiceLetra(b); i++) letras.push(LETRAS[i] ?? 'F');
    const duda = letras.length > 1;
    const ayuda = duda
      ? `Tus ojeadores (nivel ${jugador(estado).nivelOjeadores}${jugador(estado).plantilla.includes(h.id) ? ', +1 por ser de tu gremio' : ''}) dudan entre ${letras.join(', ')}. Mejóralos para saberlo.`
      : 'Tus ojeadores saben su techo exacto.';
    return `<span class="techo ${duda ? 'con-duda' : ''}" title="${esc(ayuda)}"><span class="etq">Techo</span>${letras.map((l) => `<span class="letra-techo ${this.cr(l)}">${l}</span>`).join('')}${duda ? '<span class="incognita">?</span>' : ''}</span>`;
  }

  /** Aviso de joya oculta (o de héroe sobrevalorado) cuando tus ojeadores ven más (o menos) que el precio público. */
  private olfato(estado: EstadoJuego, h: Heroe): string {
    if (alLimite(h)) return '';
    const mio = letraDe(potencialEstimado(h, nivelOjeo(jugador(estado), h.id)));
    const publico = letraDe(potencialEstimado(h, 0));
    if (indiceLetra(mio) > indiceLetra(publico)) return '<span class="olfato joya" title="Tus ojeadores ven un techo más alto del que aparenta. Los gremios con peores ojeadores pueden dejarlo escapar.">◆ Joya oculta</span>';
    if (indiceLetra(mio) < indiceLetra(publico)) return '<span class="olfato humo" title="Tus ojeadores creen que su techo es más bajo de lo que aparenta.">Sobrevalorado</span>';
    return '';
  }

  private claseChip(clase: string, extra = ''): string {
    return `<span class="clase-chip c-${clase} ${extra}" title="${esc(EFECTO_CLASE[clase] ?? '')}">${ICONO_CLASE[clase] ?? ''} ${clase}</span>`;
  }

  private rangoChip(letra: string): string {
    return `<span class="rango-chip ${this.cr(letra)}" title="Rango según su poder: F, E, D, C, C+, B, B+, A, A+, S">Rango ${letra}</span>`;
  }

  /** Barra de experiencia hacia la siguiente subida de poder (o «Al límite» si ya no crece). */
  private barraXp(h: Heroe): string {
    // Al límite no hay barra: el techo ya dice «alcanzado».
    if (alLimite(h)) return '';
    const total = balance.heroes.experienciaPorBarra;
    return `<span class="xp" title="Experiencia: al llenar la barra, +${balance.heroes.poderPorBarra} de poder"><span class="barra-xp"><i style="--hasta:${Math.round((100 * h.experiencia) / total)}%"></i></span><small>${h.experiencia}/${total} exp</small></span>`;
  }

  /** Habilidad única del héroe, plegada: el nombre a la vista y el texto al abrirla. */
  private habilidad(estado: EstadoJuego, h: Heroe): string {
    const f = ficha(h.catalogo);
    if (!f) return '';
    // Decisión del propietario: la descripción solo se ve si lo has fichado o con los ojeadores al máximo.
    if (!conoceHabilidad(estado, h.id)) {
      return `<details class="habilidad oculta"><summary>✦ ${esc(f.nombreHabilidad)}${h.zombie ? ' · Zombie' : ''} · ?</summary><p class="tenue">Aún no sabes qué hace. Lo descubrirás al ficharlo, o con tus ojeadores al nivel máximo (${OJEO_MAXIMO}).</p></details>`;
    }
    const extra = h.habilidad === 'invocacion' ? ` Bestia: poder ${poderBestia(h)}.` : h.habilidad === 'porLasUltimas' ? ` Vida: ${Number(h.memoria?.vida ?? 10)}.` : h.habilidad === 'racha' ? ` Racha: ${Number(h.memoria?.racha ?? 0)}.` : '';
    return `<details class="habilidad"><summary>✦ ${esc(f.nombreHabilidad)}${h.zombie ? ' · Zombie' : ''}</summary><p>${esc(f.texto)}${extra}</p>${f.ascension && f.ascension !== 'Por definir.' ? `<p class="tenue">Ascensión: ${esc(f.ascension)}</p>` : ''}</details>`;
  }

  /** Qué harán las habilidades del equipo en esta misión (su impacto, a la vista antes de lanzarla). */
  private efectosHabilidades(estado: EstadoJuego, mision: Mision, equipo: Heroe[]): string {
    if (equipo.length === 0) return '';
    const efectos = efectosEnMision({ estado, gremioId: estado.jugadorId, mision, equipo, dia: estado.dia });
    if (efectos.length === 0) return '';
    const nombre = (id: string): string => esc(estado.heroes[id]?.nombre ?? '');
    return `<div class="efectos-habilidad"><b>Habilidades en esta misión</b><ul>${efectos
      .map((e) => `<li class="${e.tono}">✦ ${nombre(e.heroeId)} · ${esc(e.habilidad)}: ${esc(e.texto)}</li>`)
      .join('')}</ul></div>`;
  }

  /** Rasgos de personalidad como etiquetas. */
  private rasgosChips(h: Heroe): string {
    const N = social.nombreRasgo as Record<string, string>;
    return rasgos(h).map((r) => `<span class="rasgo">${esc(N[r] ?? r)}</span>`).join('');
  }

  /** Felicidad y estrés: dos barras finas con palabra. */
  private mental(h: Heroe): string {
    const f = felicidad(h);
    const e = estres(h);
    return `<span class="mental" title="Felicidad ${f}/100 · Estrés ${e}/100. Con más de ${social.mision.estresAlto} de estrés rinde un ${-social.mision.penalizacionEstres}% menos.">
      <span class="medida"><small>Felicidad</small><span class="barra-mental feliz"><i style="--hasta:${f}%"></i></span><b>${textoFelicidad(h)}</b></span>
      <span class="medida"><small>Estrés</small><span class="barra-mental estres ${e > social.mision.estresAlto ? 'alto' : ''}"><i style="--hasta:${e}%"></i></span><b>${textoEstres(h)}</b></span></span>`;
  }

  /** Lo que siente: rasgos, felicidad, estrés, sus relaciones más fuertes y si tiene un asunto pendiente. */
  private sentimientos(estado: EstadoJuego, h: Heroe, gremioId: string): string {
    const chips = relacionesDe(estado, gremioId, h.id)
      .filter((r) => r.vinculo !== 'neutral' || r.rivales || r.romanceDe !== 'ninguno')
      .slice(0, 4)
      .map((r) => {
        const icono = this.icono(r.vinculo, r.romanceDe, r.rivales);
        return `<span class="vinculo v-${r.vinculo.replace(' ', '-')}" title="${esc(this.textoVinculo(r.vinculo, r.romanceDe, r.rivales))} · ${esc(r.heroe.nombre)}">${icono} ${esc(r.heroe.nombre)}</span>`;
      })
      .join('');
    const asunto = estado.social.pendientes.some((p) => p.a === h.id || p.b === h.id) ? '<span class="asunto-chip">Asunto pendiente</span>' : '';
    // Solo se despliegan las barras si algo va mal; si no, una palabra basta (menos carga a la vista).
    const mal = felicidad(h) < 50 || estres(h) > social.mision.estresAlto;
    const estadoMental = mal
      ? this.mental(h)
      : `<span class="mental-corto" title="Felicidad ${felicidad(h)}/100 · Estrés ${estres(h)}/100">${textoFelicidad(h)} · ${textoEstres(h).toLowerCase()}</span>`;
    return `<div class="sentimientos">${mal ? '' : estadoMental}${this.rasgosChips(h)}${asunto}${chips}</div>${mal ? estadoMental : ''}`;
  }

  /** Icono de una relación: pareja, amor, rivalidad o nivel de afinidad. */
  private icono(v: Vinculo, r: Romance, rivales: boolean): string {
    if (v === 'pareja') return '♥';
    if (r === 'enamorado') return '♡';
    if (r === 'interés') return '❦';
    const base: Record<Vinculo, string> = { pareja: '♥', 'grandes amigos': '★', amigos: '☺', neutral: '·', 'mala relación': '☹', enemigos: '✖' };
    return rivales && v === 'neutral' ? '⚔' : `${base[v]}${rivales ? '⚔' : ''}`;
  }

  private textoVinculo(v: Vinculo, r: Romance, rivales: boolean): string {
    const partes: string[] = [v];
    if (r === 'enamorado') partes.push('enamorado');
    else if (r === 'interés') partes.push('interesado');
    else if (r === 'expareja') partes.push('expareja');
    if (rivales) partes.push('rivales');
    return partes.join(' · ');
  }

  private carta(estado: EstadoJuego, h: Heroe, pie: string, extraClase = ''): string {
    const estadoTexto =
      h.estado === 'libre'
        ? ''
        : `<span class="estado-chip e-${h.estado.replace(' ', '-')}">${esc(h.estado === 'lesionado' ? `lesionado · ${h.diasLesion} d.` : h.estado)}</span>`;
    const mio = jugador(estado).plantilla.includes(h.id);
    const sueldoTexto = mio ? sueldoEn(estado, estado.jugadorId, h) : sueldo(h);
    return `<article class="carta ${extraClase}">
      <header>
        ${this.avatar(h)}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">${this.claseChip(h.clase)} Reputación ${h.reputacion} · Lealtad ${h.lealtad}</span></div>
        ${estadoTexto}
      </header>
      <div class="identidad"><span class="dato"><span class="etq">Poder</span><b>${num(h.poder)}</b></span>${this.techo(estado, h)}</div>
      ${this.olfato(estado, h)}
      ${this.habilidad(estado, h)}
      ${mio ? this.sentimientos(estado, h, estado.jugadorId) : ''}
      <p class="sueldo tenue">Sueldo ${num(sueldoTexto)} de oro por semana${huecos(h) > 1 ? ` · ocupa ${huecos(h)} huecos en misión` : ''}</p>
      ${mio ? this.barraXp(h) : ''}
      <footer>${pie}</footer>
    </article>`;
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  private panelNueva(): string {
    return `
      <p>Diriges el <strong>peor gremio de héroes</strong> del reino: último del ranking, con poco oro y cuatro aventureros sin fama. La historia dura ${balance.historia.temporadas} temporadas.</p>
      <p><strong>Tu reto:</strong> gana oro con misiones, invierte en héroes y en tu sede, y lleva al gremio al número uno. Cada día pulsa <em>Finalizar día</em>; cada 7 días se pagan los sueldos y se celebra la Prueba de los Novatos.</p>
      <label class="campo">Nombre del gremio <input id="nombre" maxlength="28" value="Llama Menguante" /></label>
      <button data-accion="empezar" class="principal">Empezar</button>`;
  }

  private panelMisiones(estado: EstadoJuego): string {
    const mision = estado.tablon.find((m) => m.id === this.misionId);
    if (!mision) return this.tablon(estado);
    return this.formacion(estado, mision);
  }

  private tablon(estado: EstadoJuego): string {
    const j = jugador(estado);
    const sig = siguienteCategoria(j);
    const p = prestigio(j);
    const meta = sig
      ? `<div class="meta-categoria"><span>Tablón de <strong>categoría ${categoria(j)}</strong></span><span class="barra-xp"><i style="--hasta:${Math.min(100, Math.round((100 * p) / sig.prestigio))}%"></i></span><small>Prestigio ${p}/${sig.prestigio} para la categoría ${sig.letra}</small></div>`
      : `<div class="meta-categoria"><span>Tablón de <strong>categoría ${categoria(j)}</strong>, la más alta</span></div>`;
    const tarjetas = estado.tablon
      .map((m) => {
        const prob = probabilidadRecomendada(estado, m);
        const r = RANGO[m.rango];
        const veces = lanzadasHoy(estado, m);
        const tarde = vuelveTrasPrueba(estado, estado.dia + m.duracion - 1);
        return `<button class="tarjeta-mision t-${m.rango}" data-accion="elegir-mision" data-id="${m.id}" ${prob === null ? 'disabled' : ''}>
          ${veces ? `<span class="lanzadas">×${veces} hoy</span>` : ''}
          <span class="nivel">${r.nombre}</span>
          <span class="titulo-mision">${esc(m.titulo)}</span>
          <span class="tipo-mision">${esc(m.tipo)} · ideal: ${m.clases.map((c) => `${ICONO_CLASE[c] ?? ''} ${c}`).join(' + ')}</span>
          <span class="oro-mision">+${num(m.recompensa)}<small>oro</small></span>
          <span class="tenue">${m.duracion} ${m.duracion === 1 ? 'día' : 'días'} · ${m.equipo} ${m.equipo === 1 ? 'héroe' : 'héroes'} · ${r.riesgo}</span>
          <span class="dificultad d-${nivelDificultad(prob)}">${prob === null ? 'Sin héroes libres' : `${pct(prob)} de éxito`}</span>
          ${tarde ? '<span class="aviso-prueba">El oro llega después de la Prueba</span>' : ''}
        </button>`;
      })
      .join('');
    const fuera = estado.enCurso
      .filter((c) => c.gremioId === estado.jugadorId)
      .map((c) => {
        const vuelve = c.diaVuelta - estado.dia;
        const nombres = c.equipo.map((id) => obtenerHeroe(estado, id).nombre.split(' ')[0]).join(', ');
        return `<li>«${esc(c.mision.titulo)}» · ${esc(nombres)} · ${vuelve === 0 ? 'vuelve hoy al finalizar el día' : `vuelve en ${vuelve + 1} días`}</li>`;
      })
      .join('');
    const libres = heroesLibres(estado).length;
    return `${meta}<p>Puedes repetir cada misión tantas veces como equipos libres tengas (${libres} ${libres === 1 ? 'héroe libre' : 'héroes libres'}). ¿Varias bajas o una alta? Los enviados no vuelven hasta que termina la misión.</p><div class="tres">${tarjetas}</div>
      ${fuera ? `<h3>De misión</h3><ul class="lista">${fuera}</ul>` : ''}`;
  }

  private formacion(estado: EstadoJuego, mision: Mision): string {
    const libres = heroesLibres(estado).sort((a, b) => b.poder - a.poder);
    this.equipo = this.equipo.filter((id) => libres.some((h) => h.id === id));
    const equipo = this.equipo.map((id) => obtenerHeroe(estado, id));
    const prob = equipo.length ? probabilidadJugador(estado, mision, equipo) : null;
    const soc = socialEquipo(estado, equipo);
    const quimica = equipo.length > 1 ? soc.total : 0;
    const estresados = equipo.filter((h) => estres(h) > social.mision.estresAlto && h.habilidad !== 'imperturbable');
    const vetos = vetosDelEquipo(estado, this.equipo);
    const conAsunto = equipo.filter((h) => estado.social.pendientes.some((p) => p.a === h.id || p.b === h.id));
    const riesgo = hayRiesgoDeMuerte(estado, mision, equipo);
    const ocupa = huecosEquipo(equipo);
    const { cubiertas, faltan } = clasesCubiertas(mision, equipo);
    const duracion = equipo.length ? duracionMision(mision, equipo) : mision.duracion;
    const clases = `<div class="clases-mision"><span class="tenue">${esc(mision.tipo)}: ideal</span>${cubiertas.map((c) => this.claseChip(c, 'cubierta')).join('')}${faltan.map((c) => this.claseChip(c, 'falta')).join('')}<span class="tenue">+${balance.clases.bonusPorClase}% de éxito por cada una${mision.clases.length > 1 ? `, +${balance.clases.bonusCombinacion}% más con todas` : ''}</span></div>`;
    const fichas = libres
      .map((h) => {
        const va = this.equipo.includes(h.id);
        return `<button class="ficha-heroe ${va ? 'va' : ''}" data-accion="alternar" data-id="${h.id}" aria-pressed="${va}">
          ${this.avatar(h)}
          <span class="quien"><strong>${esc(h.nombre.split(' ')[0] ?? '')}</strong><span class="tenue">${ICONO_CLASE[h.clase] ?? ''} ${h.clase} · poder ${num(h.poder)}${huecos(h) > 1 ? ` · ${huecos(h)} huecos` : ''}${estres(h) > social.mision.estresAlto ? ' · <b class="alerta-texto">estresado</b>' : ''}</span></span>
          <span class="marca">${va ? '✓' : '+'}</span>
        </button>`;
      })
      .join('');
    const ocupados = heroesDe(estado, estado.jugadorId)
      .filter((h) => h.estado !== 'libre')
      .map((h) => `${esc(h.nombre.split(' ')[0] ?? '')} (${h.estado === 'lesionado' ? `lesionado, ${h.diasLesion} d.` : h.estado === 'entrenando' ? 'entrenando' : 'de misión'})`)
      .join(', ');
    const r = RANGO[mision.rango];
    const motivo = motivoNoLanzar(estado, mision.id, this.equipo);
    return `<div class="cabecera-mision">
        <div><span class="nivel t-${mision.rango}">${r.nombre}</span> <strong>${esc(mision.titulo)}</strong>
          <div class="tenue">+${num(mision.recompensa)} oro · ${duracion} ${duracion === 1 ? 'día' : 'días'}${duracion < mision.duracion ? ' (el Explorador ahorra uno)' : ''} · ${mision.equipo} ${mision.equipo === 1 ? 'hueco' : 'huecos'} (ocupados ${ocupa}). Ya te proponemos un equipo.</div>
          ${this.avisoVuelta(estado, mision, duracion)}</div>
        <div class="medidor d-${nivelDificultad(prob)}"><b>${prob === null ? '—' : pct(prob)}</b><span>de éxito</span></div>
      </div>
      ${clases}
      ${this.efectosHabilidades(estado, mision, equipo)}
      ${
        soc.detalles.length || estresados.length
          ? `<div class="quimica ${quimica >= 0 ? 'buena' : 'mala'}"><b>Relaciones en el equipo: ${quimica > 0 ? '+' : ''}${quimica}% de poder</b>${soc.detalles.length && Math.abs(soc.detalles.reduce((t, d) => t + d.valor, 0)) > social.mision.tope ? ` (tope ±${social.mision.tope}%)` : ''}<ul>${soc.detalles
              .map((d) => `<li>${esc(d.texto)} (${d.valor > 0 ? '+' : ''}${d.valor}%)</li>`)
              .join('')}${estresados.map((h) => `<li class="mala">${esc(h.nombre)}: muy estresado (${social.mision.penalizacionEstres}% su poder)</li>`).join('')}</ul></div>`
          : ''
      }
      ${vetos.map((v) => `<p class="riesgo-muerte">⚠ Prometiste a ${esc(obtenerHeroe(estado, v.solicitante).nombre)} que no iría con ${esc(obtenerHeroe(estado, v.otro).nombre)}. Puedes mandarlos igual, pero lo llevará mal.</p>`).join('')}
      ${equipo.length > 1 && soc.detalles.length === 0 && desbloqueado(estado, 'relaciones') ? '<p class="tenue">Si van juntos a menudo, se acercarán… y rendirán más juntos.</p>' : ''}
      ${conAsunto.length ? `<p class="tenue">⚑ ${esc(conAsunto.map((h) => h.nombre).join(', '))} ${conAsunto.length === 1 ? 'tiene' : 'tienen'} un asunto pendiente en el gremio. <button data-accion="ir-relaciones">Verlo</button></p>` : ''}
      ${riesgo ? `<p class="riesgo-muerte">☠ Riesgo de muerte: con menos del ${balance.muerte.umbralProbabilidad}% de éxito, si la misión fracasa alguien puede no volver.</p>` : ''}
      <div class="fichas">${fichas || '<p class="tenue">No tienes héroes libres.</p>'}</div>
      ${ocupados ? `<p class="tenue">No disponibles: ${ocupados}. <button data-accion="ir-heroes">Ver héroes</button></p>` : ''}
      <p class="tenue">Si fracasa, cobras menos y alguien puede lesionarse.</p>
      <div class="botones"><button data-accion="otra-mision">Volver al tablón</button><button data-accion="lanzar" class="principal" ${motivo ? `disabled title="${esc(motivo)}"` : ''}>Lanzar misión</button></div>`;
  }

  /** Reto del maestro rival: arriba del mercado, porque a veces hay que comprar al héroe para responder. */
  private bloqueReto(estado: EstadoJuego): string {
    const r = estado.reto;
    if (!r) return '';
    const g = estado.gremios[r.gremioId];
    const nombreClase = r.clase.toLowerCase();
    if (r.resultado) {
      const x = r.resultado;
      const texto = {
        victoria: `¡Ganas! ${esc(x.nombreJugador)} (${x.poderJugador}) vence a ${esc(x.nombreRival)} (${x.poderRival}): +${num(r.apuesta)} de oro y prestigio.`,
        derrota: `Pierdes. ${esc(x.nombreRival)} (${x.poderRival}) vence a ${esc(x.nombreJugador)} (${x.poderJugador}): −${num(r.apuesta)} de oro.`,
        empate: `Empate: ${esc(x.nombreJugador)} y ${esc(x.nombreRival)} tienen ${x.poderRival} de poder. Nadie paga.`,
      }[x.desenlace];
      return `<section class="reto r-${x.desenlace}"><h3>Reto de ${esc(g?.nombre ?? '')}</h3><p>${texto}</p></section>`;
    }
    const mios = heroesParaReto(estado);
    const botones = mios
      .map((h) => {
        const motivo = motivoNoAceptar(estado, h.id);
        return `<button class="principal" data-accion="reto-aceptar" data-id="${h.id}" ${motivo ? `disabled title="${esc(motivo)}"` : ''}>Enviar a ${esc(h.nombre.split(' ')[0] ?? '')} (poder ${h.poder})</button>`;
      })
      .join('');
    const faltan = r.diaLimite - estado.dia;
    return `<section class="reto">
      <h3>Reto de ${esc(g?.nombre ?? '')}</h3>
      <p class="frase">«${esc(fraseReto(r.gremioId))}»</p>
      <p>¿Tienes un <strong>${nombreClase} de rango ${r.rango}</strong> más fuerte que el suyo? Eliges a tu héroe sin ver el suyo; él saca a uno de su mismo rango. Apuesta: <strong>${num(r.apuesta)}</strong> de oro. Si ganas, te la llevas y ganas prestigio.</p>
      <p class="tenue">Plazo: ${faltan === 0 ? 'hoy' : `${faltan + 1} días`}. Rechazarlo no cuesta nada.</p>
      <div class="botones">${botones || `<span class="tenue">No tienes ningún ${nombreClase} de rango ${r.rango}. Puedes comprar uno aquí abajo.</span>`}<button data-accion="reto-rechazar">Rechazar</button></div>
    </section>`;
  }

  /** Cuándo vuelve el equipo y si su oro llegará antes o después de la próxima Prueba de los Novatos. */
  private avisoVuelta(estado: EstadoJuego, mision: Mision, duracion: number): string {
    const vuelta = this.equipo.length === mision.equipo ? diaDeVuelta(estado, mision, this.equipo) : estado.dia + duracion - 1;
    const cuando = vuelta === estado.dia ? 'hoy al finalizar el día' : `al finalizar el día ${diaDeTemporada(vuelta)}`;
    if (vuelveTrasPrueba(estado, vuelta)) return `<div class="aviso-prueba">Vuelve ${cuando}: su oro llegará <strong>después</strong> de la Prueba de los Novatos.</div>`;
    return `<div class="tenue">Vuelve ${cuando}${diasParaPrueba(estado.dia) <= 2 ? ', antes de la Prueba de los Novatos' : ''}.</div>`;
  }

  private panelMercado(estado: EstadoJuego): string {
    const pestañas = `<div class="pestanas">
      <button data-accion="pestana-mercado" data-id="comprar" class="${this.pestanaMercado === 'comprar' ? 'activo' : ''}">Comprar</button>
      <button data-accion="pestana-mercado" data-id="vender" class="${this.pestanaMercado === 'vender' ? 'activo' : ''}">Vender</button>
    </div>`;
    const reto = this.bloqueReto(estado);
    if (this.pestanaMercado === 'vender') {
      const cartas = heroesDe(estado, estado.jugadorId)
        .map((h) => {
          const oferta = ofertaVenta(estado, h.id);
          const comprador = oferta ? estado.gremios[oferta.compradorId]?.nombre : null;
          const pie = oferta
            ? `<span class="precio">${esc(comprador ?? '')}</span><button class="principal" data-accion="vender" data-id="${h.id}">Vender por ${num(oferta.precio)}</button>`
            : `<span class="tenue">${h.estado === 'en mision' ? 'Está de misión' : 'Ahora nadie lo compraría'}</span>`;
          return this.carta(estado, h, pie);
        })
        .join('');
      return `${reto}${pestañas}<p class="tenue">Vende un héroe para conseguir oro al instante. Piénsalo: quien se va no vuelve.</p><div class="cartas">${cartas || '<p class="tenue">No tienes héroes.</p>'}</div>`;
    }
    const selector = rivales(estado)
      .map((g) => `<button data-accion="ver-gremio" data-id="${g.id}" class="${this.gremioRival === g.id ? 'activo' : ''}">${esc(g.nombre)}</button>`)
      .join('');
    const rival = estado.gremios[this.gremioRival];
    const cartas = heroesDe(estado, this.gremioRival)
      .map((h) => ({ h, c: condicionesCompra(estado, h.id) }))
      .sort((a, b) => a.c.precio - b.c.precio)
      .map(({ h, c }) =>
        this.carta(
          estado,
          h,
          `<button class="principal" data-accion="comprar" data-id="${h.id}" ${c.bloqueo ? `disabled title="${esc(c.bloqueo)}"` : ''}>Comprar por ${num(c.precio)}</button>${c.bloqueo ? `<span class="tenue">${esc(c.bloqueo)}</span>` : ''}`,
          c.bloqueo ? 'caro' : '',
        ),
      )
      .join('');
    return `${reto}${pestañas}<div class="pestanas pequenas">${selector}</div>
      ${rival ? `<p class="tenue">${esc(rival.nombre)} · ${esc(rival.personalidad ?? '')}: ${esc(rival.estrategia ?? '')}</p>` : ''}
      <div class="cartas">${cartas}</div>`;
  }

  private panelGremio(estado: EstadoJuego): string {
    const asuntos = estado.social.pendientes.length;
    const nombres: Record<PestanaGremio, string> = { heroes: 'Héroes', relaciones: asuntos ? `Relaciones (${asuntos})` : esNuevo(estado, 'relaciones') ? 'Relaciones ¡Nuevo!' : 'Relaciones', instalaciones: 'Instalaciones', ranking: 'Ranking' };
    // Desbloqueo progresivo: la pestaña de relaciones aparece la semana 2.
    if (this.pestanaGremio === 'relaciones' && !desbloqueado(estado, 'relaciones')) this.pestanaGremio = 'heroes';
    const pestañas = `<div class="pestanas">${(Object.keys(nombres) as PestanaGremio[])
      .filter((p) => p !== 'relaciones' || desbloqueado(estado, 'relaciones'))
      .map((p) => `<button data-accion="pestana-gremio" data-id="${p}" class="${this.pestanaGremio === p ? 'activo' : ''}">${nombres[p]}</button>`)
      .join('')}</div>`;
    const j = jugador(estado);
    switch (this.pestanaGremio) {
      case 'instalaciones': {
        const filas = (['sede', 'entrenamiento', 'ojeadores'] as Instalacion[])
          .map((tipo) => {
            const info = infoInstalacion(estado, j.id, tipo);
            const I = balance.instalaciones;
            const extra =
              tipo === 'sede'
                ? `${plazas(j)} plazas`
                : tipo === 'ojeadores'
                  ? `Potencial visto con ${I.ojeadores.anchura[info.nivel] ?? 1} letra(s) de margen`
                  : info.nivel === 0
                    ? 'Sin construir'
                    : `${I.entrenamiento.plazas[info.nivel] ?? 0} plaza(s) · ${I.entrenamiento.experienciaPorDia[info.nivel] ?? 0} exp por día`;
            return `<section class="sede-nivel">
              <div class="nivel-actual"><span class="tenue">${NOMBRE_INSTALACION[tipo]}</span><b>Nivel ${info.nivel}</b><span class="tenue">${esc(extra)}</span></div>
              <div class="mejora"><p>${TEXTO_INSTALACION[tipo]}</p>
                ${info.coste !== null ? `<button class="principal" data-accion="mejorar" data-id="${tipo}" ${info.bloqueo ? 'disabled' : ''}>Mejorar por ${num(info.coste)}</button>${info.bloqueo ? ` <span class="tenue">${esc(info.bloqueo)}</span>` : ''}` : '<span class="tenue">Al máximo.</span>'}
              </div>
            </section>`;
          })
          .join('');
        return `${pestañas}${filas}`;
      }
      case 'relaciones':
        return `${pestañas}${this.panelRelaciones(estado)}`;
      case 'ranking':
        return `${pestañas}${this.tablaRanking(estado)}
          <p class="tenue">${esc(TEXTO_PUNTOS)} El ranking oficial se actualiza el día 7; al final de cada temporada (28 días) se reparte un premio según la posición. La fuerza (poder de tus 5 mejores héroes) desempata y decide el torneo; el prestigio sube la categoría de tu tablón.</p>`;
      default:
        return `${pestañas}${this.inventario(estado)}${this.muroCaidos(estado)}`;
    }
  }

  /** Asuntos sociales que esperan tu decisión. */
  private asuntos(estado: EstadoJuego): string {
    const lista = pendientes(estado);
    if (lista.length === 0) return '';
    return `<h3>Asuntos pendientes · ${lista.length}</h3>${lista
      .map(
        (v) => `<section class="asunto ${v.urgente ? 'urgente' : ''}"><b>${esc(v.titulo)}</b><p>${esc(v.texto)}</p>
          <div class="botones">${v.opciones
            .map((o) => `<button data-accion="decidir" data-id="${v.uid}:${o.id}" ${o.bloqueo ? `disabled title="${esc(o.bloqueo)}"` : ''} class="${o.porDefecto ? '' : 'principal'}">${esc(o.texto)}</button>`)
            .join('')}</div>
          <small class="tenue">${v.caduca === 0 ? 'Si no decides hoy' : `Si no decides en ${v.caduca} ${v.caduca === 1 ? 'día' : 'días'}`}, pasará lo de «${esc(v.opciones.find((o) => o.porDefecto)?.texto ?? '')}».</small></section>`,
      )
      .join('')}`;
  }

  /**
   * Relaciones del gremio: los asuntos pendientes, una tabla de quién se lleva con quién y, al tocar una
   * casilla, el detalle de esa pareja con su historia (por qué están así).
   */
  private panelRelaciones(estado: EstadoJuego): string {
    const heroes = heroesDe(estado, estado.jugadorId).sort((a, b) => b.poder - a.poder);
    if (heroes.length < 2) return `${this.asuntos(estado)}<p class="tenue">Con menos de dos héroes no hay relaciones que ver.</p>`;
    const corto = (h: Heroe): string => esc(h.nombre.split(' ')[0] ?? h.nombre);
    const cabecera = `<tr><th></th>${heroes.map((h) => `<th><span class="vertical">${corto(h)}</span></th>`).join('')}</tr>`;
    const filas = heroes
      .map((a) => {
        const celdas = heroes
          .map((b) => {
            if (a.id === b.id) return '<td class="vacia"></td>';
            const k = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
            const r = relacion(estado, a.id, b.id);
            const v = sonPareja(estado, a.id, b.id) ? 'pareja' : nivelDe(r.afinidad);
            const rom = romance(estado, a.id, b.id);
            const elegida = this.parejaVista === k ? 'elegida' : '';
            return `<td><button class="celda v-${v.replace(' ', '-')} ${elegida}" data-accion="ver-pareja" data-id="${k}" title="${esc(`${a.nombre} → ${b.nombre}: ${this.textoVinculo(v, rom, r.rivales)} (afinidad ${r.afinidad})`)}">${this.icono(v, rom, r.rivales)}</button></td>`;
          })
          .join('');
        return `<tr><th>${corto(a)}</th>${celdas}</tr>`;
      })
      .join('');
    const leyenda = '<p class="tenue leyenda">♥ pareja · ♡ enamorado · ❦ interesado · ★ grandes amigos · ☺ amigos · ☹ se llevan mal · ✖ enemigos · ⚔ rivales. Cada fila dice lo que siente ese héroe. Toca una casilla para ver la historia.</p>';
    return `${this.asuntos(estado)}<h3>Quién se lleva con quién</h3><div class="matriz-rel"><table>${cabecera}${filas}</table></div>${leyenda}${this.detallePareja(estado)}
      <p class="tenue">Las relaciones cambian con lo que viven juntos: misiones, rescates, discusiones, ascensos, rupturas y muertes. Los amigos y las parejas rinden más juntos; los enemigos, menos.</p>`;
  }

  private detallePareja(estado: EstadoJuego): string {
    if (!this.parejaVista) return '';
    const [ia, ib] = this.parejaVista.split('|') as [string, string];
    const a = estado.heroes[ia];
    const b = estado.heroes[ib];
    if (!a || !b) return '';
    const r = relacion(estado, a.id, b.id);
    const v = sonPareja(estado, a.id, b.id) ? 'pareja' : nivelDe(r.afinidad);
    const sentir = (x: Heroe, y: Heroe): string => {
      const rom = romance(estado, x.id, y.id);
      return rom === 'ninguno' ? 'sin sentimientos románticos' : rom === 'interés' ? 'se ha fijado en ' + esc(y.nombre) : rom === 'enamorado' ? 'está enamorado de ' + esc(y.nombre) : rom === 'pareja' ? 'son pareja' : 'son expareja';
    };
    const historia = memoriasDe(estado, a.id, b.id)
      .slice(0, 8)
      .map((m) => `<li><span class="tenue">${esc(textoCalendario({ ...estado, dia: m.dia }).split(' · ')[1] ?? '')}, T${Math.floor((m.dia - 1) / balance.calendario.diasPorTemporada) + 1}:</span> ${esc(m.texto)}</li>`)
      .join('');
    const veto = vetosDelEquipo(estado, [a.id, b.id]).length ? '<p class="alerta-texto">Prometiste que no irían juntos de misión.</p>' : '';
    return `<section class="detalle-pareja">
      <header>${this.avatar(a)}<b>${esc(a.nombre)}</b><span class="vinculo v-${v.replace(' ', '-')}">${this.icono(v, 'ninguno', r.rivales)} ${esc(this.textoVinculo(v, 'ninguno', r.rivales))}</span><b>${esc(b.nombre)}</b>${this.avatar(b)}</header>
      <p>Afinidad <b>${afinidad(estado, a.id, b.id)}</b> (de −100 a 100). ${esc(a.nombre)} ${sentir(a, b)}; ${esc(b.nombre)} ${sentir(b, a)}.</p>
      ${veto}
      ${historia ? `<h4>Por qué</h4><ul class="lista vida">${historia}</ul>` : '<p class="tenue">Todavía no han vivido nada importante juntos.</p>'}
    </section>`;
  }

  /** Muro de los caídos: los héroes del gremio que han muerto. */
  private muroCaidos(estado: EstadoJuego): string {
    const caidos = estado.caidos.filter((c) => c.gremioId === estado.jugadorId);
    if (caidos.length === 0) return '';
    return `<details class="muro"><summary>☠ Muro de los caídos (${caidos.length})</summary><ul class="lista">${caidos
      .map((c) => `<li><b>${esc(c.nombre)}</b> · ${esc(c.clase)}, poder ${c.poder} · ${esc(c.texto)} (${esc(textoCalendario({ ...estado, dia: c.dia }))})</li>`)
      .join('')}</ul></details>`;
  }

  /** Inventario de héroes: quién está libre, de misión o lesionado, con la curación a mano. */
  private inventario(estado: EstadoJuego): string {
    const j = jugador(estado);
    const heroes = heroesDe(estado, j.id).sort((a, b) => b.poder - a.poder);
    const fila = (h: Heroe): string => {
      let detalle = '';
      let accion = '';
      if (h.estado === 'en mision') {
        const m = misionDe(estado, h.id);
        const vuelve = m ? m.diaVuelta - estado.dia : 0;
        detalle = m ? `«${esc(m.mision.titulo)}» · ${vuelve === 0 ? 'vuelve hoy al finalizar el día' : `vuelve en ${vuelve + 1} días`}` : '';
      } else if (h.estado === 'entrenando') {
        const e = estado.entrenamientos.find((x) => x.heroeId === h.id);
        const vuelve = e ? e.diaVuelta - estado.dia : 0;
        detalle = `En la zona de entrenamiento · ${vuelve === 0 ? 'termina hoy al finalizar el día' : `termina en ${vuelve + 1} días`}`;
      } else if (h.estado === 'lesionado') {
        const c = condicionesCuracion(estado, h.id);
        detalle = `${h.diasLesion} ${h.diasLesion === 1 ? 'día' : 'días'} de reposo`;
        accion = `<button class="principal" data-accion="curar" data-id="${h.id}" ${c.bloqueo ? `disabled title="${esc(c.bloqueo)}"` : ''}>Curar por ${num(c.precio)}</button>`;
      } else {
        detalle = felicidad(h) < social.efectos.descontento ? 'Está descontento: mira sus relaciones' : 'Listo para una misión';
        const a = condicionesAscension(estado, h.id);
        if (alLimite(h) && a.rangoNuevo && !desbloqueado(estado, 'ascension')) {
          detalle = 'Ha llegado a su límite (la Ascensión llega en la temporada 2)';
        } else if (alLimite(h) && a.rangoNuevo) {
          detalle = 'Ha llegado a su límite';
          accion = this.confirmarAscension === h.id
            ? `<div class="confirmar-ascension">
                <p><strong>Misión de Ascensión:</strong> ${esc(h.nombre.split(' ')[0] ?? '')} parte solo durante ${balance.ascension.duracion} días. Con un <strong>${a.probabilidad}%</strong> vuelve con rango ${a.rangoNuevo} y su techo sube a ${a.rangoNuevo}. Si fracasa, <strong>muere</strong>.</p>
                <div class="botones"><button data-accion="cancelar-ascension">Cancelar</button><button class="peligro" data-accion="ascension" data-id="${h.id}" ${a.bloqueo ? `disabled title="${esc(a.bloqueo)}"` : ''}>Enviar por ${num(a.coste)}</button></div>
              </div>`
            : `<button class="boton-ascension" data-accion="preparar-ascension" data-id="${h.id}" title="Arriesgarlo todo para romper su límite">Ascensión · ${a.probabilidad}%</button>`;
        } else if (plazasEntrenamiento(estado) > 0) {
          const e = condicionesEntrenamiento(estado, h.id);
          accion = `<button data-accion="entrenar" data-id="${h.id}" ${e.bloqueo ? `disabled title="${esc(e.bloqueo)}"` : ''} title="+${e.experiencia} exp sin riesgo de lesión">Entrenar ${e.dias} días · ${num(e.coste)}</button>`;
        }
      }
      const aviso = h.semanasSinCobrar > 0
        ? `<span class="alerta-texto">Sin cobrar ${h.semanasSinCobrar} ${h.semanasSinCobrar === 1 ? 'semana' : 'semanas'}: se irá si no cobra el próximo día 7</span>`
        : '';
      return `<div class="fila-heroe e-${h.estado.replace(' ', '-')}">
        ${this.avatar(h)}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">${this.claseChip(h.clase)} Poder ${h.poder} · sueldo ${num(sueldoEn(estado, j.id, h))} · lealtad ${h.lealtad}</span>${this.techo(estado, h)}${this.barraXp(h)}${this.habilidad(estado, h)}${this.sentimientos(estado, h, j.id)}${aviso}</div>
        <div class="situacion"><span class="estado-chip e-${h.estado.replace(' ', '-')}">${h.estado === 'en mision' ? 'de misión' : h.estado}</span><span class="tenue">${detalle}</span></div>
        <div class="accion-fila">${accion}</div>
      </div>`;
    };
    // Primero los libres: son los que puedes usar ahora mismo.
    const grupos: [Heroe['estado'], string][] = [['libre', 'Libres'], ['lesionado', 'Lesionados'], ['descansando', 'Descansando'], ['entrenando', 'Entrenando'], ['en mision', 'De misión']];
    const bloques = grupos
      .map(([e, titulo]) => {
        const lista = heroes.filter((h) => h.estado === e);
        return lista.length ? `<h3>${titulo} · ${lista.length}</h3><div class="inventario">${lista.map(fila).join('')}</div>` : '';
      })
      .join('');
    return `<p class="tenue">${j.plantilla.length} de ${plazas(j)} plazas · sueldos de la semana: <strong>${num(sueldosDe(estado, j.id))}</strong> de oro el día 7. Si no llega el oro, cobran primero los más poderosos.</p>
      ${bloques || '<p class="tenue">No tienes héroes.</p>'}`;
  }

  /** Resultados del torneo de fin de temporada: tu campeón y el ganador de cada categoría. */
  private tablaTorneo(estado: EstadoJuego, combates: CombateTorneo[]): string {
    const filas = combates
      .map((c) => {
        const mio = c.campeones.find((x) => x.gremioId === estado.jugadorId);
        const ganador = c.campeones.find((x) => x.gremioId === c.ganador);
        const gano = c.ganador === estado.jugadorId;
        return `<tr class="${gano ? 'propio' : ''}"><td>${esc(c.categoria)}</td><td>${mio ? `${esc(mio.nombre.split(' ')[0] ?? '')} (${mio.poder})` : '<span class="tenue">nadie</span>'}</td><td>${ganador ? `${esc(estado.gremios[ganador.gremioId]?.nombre ?? '')} · ${esc(ganador.nombre.split(' ')[0] ?? '')} (${ganador.poder})` : '—'}</td></tr>`;
      })
      .join('');
    const ganadas = combates.filter((c) => c.ganador === estado.jugadorId).length;
    return `<h3>Torneo de fin de temporada</h3><p>${ganadas ? `¡Ganas ${ganadas} ${ganadas === 1 ? 'categoría' : 'categorías'}!` : 'Esta vez no ganas ninguna categoría.'} <span class="tenue">Cada gremio presenta a su mejor héroe de cada clase y al mejor de todos; gana el de más poder.</span></p>
      <table><thead><tr><th>Categoría</th><th>Tu campeón</th><th>Ganador</th></tr></thead><tbody>${filas}</tbody></table>`;
  }

  private tablaRanking(estado: EstadoJuego, filas = estado.ranking): string {
    const ahora = new Map(calcularRanking(estado).map((f) => [f.gremioId, f]));
    return `<table><thead><tr><th></th><th>Gremio</th><th class="num">Puntos</th><th class="num">Ahora</th><th class="num">Fuerza</th></tr></thead><tbody>${filas
      .map((f) => {
        const g = estado.gremios[f.gremioId]!;
        return `<tr class="${g.esJugador ? 'propio' : ''}"><td>${f.puesto}.º</td><td>${esc(g.nombre)}</td><td class="num"><b>${num(f.puntos)}</b></td><td class="num tenue">${num(ahora.get(f.gremioId)?.puntos ?? f.puntos)}</td><td class="num tenue">${num(f.fuerza)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
  }

  private panelPrueba(estado: EstadoJuego): string {
    const prueba = estado.prueba;
    if (!prueba) return '<div class="botones"><button class="principal" data-accion="cerrar">Volver</button></div>';
    const s = prueba.subasta;
    // 1. Presentación de los novatos.
    if (!s && prueba.resultados.length === 0) {
      const clave = prueba.pendientes.join(',');
      if (clave !== this.claveRevelado) {
        this.claveRevelado = clave;
        this.revelados.clear();
      }
      const todos = prueba.pendientes.every((id) => this.revelados.has(id));
      const cartas = prueba.pendientes
        .map((id, i) => {
          const h = obtenerHeroe(estado, id);
          const [, mejor] = rangoPotencial(h, nivelOjeo(jugador(estado), id));
          const brillo = BRILLO[mejor] ?? 'gris';
          if (!this.revelados.has(id)) {
            return `<button class="sobre brillo-${brillo}" data-accion="revelar" data-id="${id}" style="--i:${i}" aria-label="Revelar novato">
              <span class="interrogante">?</span><small>Toca para revelar</small></button>`;
          }
          const nuevo = this.recienRevelados.has(id) ? 'girando' : '';
          return `<div class="sobre-abierto brillo-${brillo} ${nuevo}" style="--i:${i}">${this.carta(estado, h, `<span class="precio">Despierta con poder <b>${h.poder}</b></span>`)}</div>`;
        })
        .join('');
      this.recienRevelados.clear();
      return `<p>Ya has pagado los sueldos: te quedan <strong>${num(jugador(estado).oro)}</strong> de oro. Tu gremio es de <strong>categoría ${categoria(jugador(estado))}</strong>: hoy ${prueba.pendientes.length} jóvenes despiertan sus poderes.</p>
        <p class="tenue">Los sobres que brillan son los que tus ojeadores creen que pueden llegar lejos: dorado, hasta S; violeta, hasta A o A+; azul, hasta B o B+. Con mejores ojeadores, el brillo engaña menos.</p>
        <div class="sobres">${cartas}</div>
        <div class="botones"><button data-accion="terminar-prueba">No pujar esta semana</button>${
          todos ? '<button class="principal" data-accion="siguiente-candidato">Empezar la subasta</button>' : '<button class="principal" data-accion="revelar-todos">Revelar todos</button>'
        }</div>`;
    }
    // 2. Subasta en curso o recién terminada.
    if (s) {
      const h = obtenerHeroe(estado, s.heroeId);
      const nombre = (id: string | null): string => (id === null ? 'Nadie' : id === estado.jugadorId ? 'Tú' : estado.gremios[id]?.nombre ?? '');
      const motivo = motivoNoPujar(estado, s);
      const siguen = interesados(estado, s).map(nombre);
      const quedan = prueba.pendientes.length;
      const reaccion = s.ronda === 1 && !s.terminada
        ? siguen.length
          ? `Los maestros de ${siguen.join(', ')} se inclinan hacia delante.`
          : 'Ningún otro maestro parece interesado.'
        : `Siguen en la puja: ${[s.activos.includes(estado.jugadorId) ? 'tú' : '', ...siguen].filter(Boolean).join(', ') || 'nadie'}.`;
      const botones = s.terminada
        ? `<button class="principal" data-accion="siguiente-candidato">${quedan > 0 ? 'Siguiente novato' : 'Ver resultados'}</button>`
        : `<button class="pasar" data-accion="retirarse">Retirarse</button><button class="pujar" data-accion="pujar" ${motivo ? 'disabled' : ''}>Subir a ${num(siguientePrecio(s))}</button>${motivo ? `<span class="tenue aviso-puja">${esc(motivo)}</span>` : ''}`;
      const final = s.terminada
        ? s.lider === estado.jugadorId
          ? `¡${esc(h.nombre)} se une a tu gremio!`
          : s.lider
            ? `Se lo lleva ${esc(nombre(s.lider))}.`
            : 'Nadie lo quiere: vuelve a su aldea.'
        : `Ronda ${s.ronda} · va ganando: ${esc(nombre(s.lider))}`;
      return `<div class="subasta ${s.lider === estado.jugadorId ? 'ganando' : ''}">
          ${this.carta(estado, h, `<span class="precio">Despierta con poder <b>${h.poder}</b></span>`)}
          <div class="marcador">
            <span class="tenue">${s.lider ? 'Puja actual' : 'Precio de salida'}</span><b>${num(s.precio)}</b>
            <span class="lider">${final}</span>
            <span class="tenue">${esc(reaccion)}</span>
            ${botones}
          </div>
        </div>
        <p class="tenue">Tu oro: ${num(jugador(estado).oro)} · Quedan ${quedan} ${quedan === 1 ? 'novato' : 'novatos'} después de este.</p>
        ${s.terminada ? '' : '<div class="botones"><button data-accion="terminar-prueba">Terminar la Prueba sin pujar más</button></div>'}`;
    }
    // 3. Resultados.
    const filas = prueba.resultados
      .map((r) => {
        const h = estado.heroes[r.heroeId];
        const g = r.ganador ? estado.gremios[r.ganador]?.nombre : 'Nadie';
        return `<tr class="${r.ganador === estado.jugadorId ? 'propio' : ''}"><td>${esc(h?.nombre ?? '')}</td><td class="num">${h ? h.poder : ''}</td><td>${esc(g ?? '')}</td><td class="num">${r.ganador ? num(r.precio) : '—'}</td></tr>`;
      })
      .join('');
    return `<table><thead><tr><th>Novato</th><th class="num">Poder</th><th>Gremio</th><th class="num">Precio</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="botones"><button class="principal" data-accion="terminar-prueba">Ver el ranking de la semana</button></div>`;
  }

  private panelDia(estado: EstadoJuego): string {
    const r = this.resumenDia;
    if (!r) return '';
    const misiones = r.informes
      .map((i) => {
        const heroes = i.partes
          .map((parte) => this.tarjetaRegreso(estado.heroes[parte.heroeId], parte.progreso, parte.diasLesion))
          .join('');
        const muertes = i.muertes.length ? `<p class="caidos">☠ No vuelven: ${esc(i.muertes.join(', '))}.</p>` : '';
        const pasa = i.textos.length ? `<ul class="lista vida">${i.textos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
        return `<div class="resultado r-${i.exito ? 'exito' : 'fracaso'}"><b>${i.exito ? '¡Misión cumplida!' : 'La misión ha fracasado'}</b><span>«${esc(i.mision.titulo)}» · +${num(i.oro)} oro</span>
          <div class="regresos">${heroes}</div>${muertes}${pasa}</div>`;
      })
      .join('');
    const nombre = (id: string): string => estado.heroes[id]?.nombre ?? '';
    const p = r.sueldos;
    const sueldos = p
      ? `<div class="resultado ${p.completo ? '' : 'r-fracaso'}"><b>Día de sueldos</b><span>−${num(p.pagado)} oro${p.completo ? '' : ` de ${num(p.total)}`}</span>
          ${p.impagados.length ? `<p class="caidos">Sin cobrar: ${esc(p.impagados.map(nombre).join(', '))}. Pierden lealtad y, si la semana que viene tampoco cobran, se irán.</p>` : ''}
          ${p.seVan.length ? `<p class="caidos">Se van por no cobrar: ${esc(p.seVan.map((x) => `${x.nombre}${x.destino ? ` (a ${estado.gremios[x.destino]?.nombre ?? ''})` : ''}`).join(', '))}.</p>` : ''}</div>`
      : '';
    // Las misiones altas de los rivales, en una sola línea: si no, tapan lo importante.
    const altas = r.noticias.filter((n) => n.endsWith('completa una misión de rango alto.')).length;
    const resto = r.noticias.filter((n) => !n.endsWith('completa una misión de rango alto.'));
    const lineas = [...resto.slice(0, 3), ...(altas ? [`Los rivales completan ${altas} ${altas === 1 ? 'misión' : 'misiones'} de rango alto.`] : [])];
    const noticias = lineas.length ? `<h3>Noticias</h3><ul class="lista">${lineas.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
    const dentro = r.informes.flatMap((i) => i.textos);
    const vida = r.vida.filter((t) => !dentro.includes(t));
    const gremio = vida.length ? `<h3>En el gremio</h3><ul class="lista vida">${vida.slice(0, 8).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
    const asuntos = estado.social.pendientes.length
      ? `<div class="resultado asunto-aviso"><b>${estado.social.pendientes.length === 1 ? 'Hay un asunto' : `Hay ${estado.social.pendientes.length} asuntos`} en el gremio esperando tu decisión</b><button data-accion="ir-relaciones">Ver asuntos</button></div>`
      : '';
    const boton = r.prueba
      ? '<button class="principal" data-accion="ir-prueba">Ir a la Prueba de los Novatos</button>'
      : '<button class="principal" data-accion="cerrar">Seguir</button>';
    const ascensiones = r.ascensiones
      .map((a) =>
        a.exito
          ? `<div class="resultado r-exito ascension"><b>¡${esc(a.nombre)} supera su Ascensión!</b><span>Asciende a rango ${a.rangoDespues} (poder ${a.poderAntes} → ${a.poderDespues}) y su nuevo techo es ${a.techoNuevo}${a.despertar >= 3 ? ': ¡despertar legendario!' : a.despertar === 2 ? ': ¡despertar extraordinario!' : ''}.</span></div>`
          : a.salvado
            ? `<div class="resultado r-fracaso ascension"><b>${esc(a.nombre)} fracasa en su Ascensión, pero sobrevive</b><span>Una Última oración lo ha traído de vuelta, malherido.</span></div>`
            : `<div class="resultado r-fracaso ascension"><b>${esc(a.nombre)} no vuelve de su Ascensión</b><span>El gremio guarda luto. Su nombre queda en el muro de los caídos.</span></div>`,
      )
      .join('');
    const ascenso = r.categoriaNueva ? `<div class="resultado ascenso-categoria"><b>¡Categoría ${r.categoriaNueva}!</b><span>La Asociación asciende a tu gremio: desde mañana el tablón ofrece misiones más difíciles y mejor pagadas.</span></div>` : '';
    const entrenos = r.entrenamientos.length
      ? `<div class="resultado entreno"><b>Vuelven de entrenar</b><span>Sin lesiones.</span><div class="regresos">${r.entrenamientos.map((e) => this.tarjetaRegreso(estado.heroes[e.heroeId], e.progreso, 0)).join('')}</div></div>`
      : '';
    return `${ascenso}${ascensiones}${misiones}${entrenos}${misiones || ascensiones || entrenos ? '' : '<p>Hoy no ha vuelto ninguna misión.</p>'}${r.desbloqueos.map((t) => `<div class="resultado desbloqueo"><b>${esc(t)}</b></div>`).join('')}${asuntos}${sueldos}${gremio}${noticias}
      ${r.prueba ? '' : `<p class="tenue">Empieza el ${esc(textoCalendario(estado).split(' · ')[1] ?? '')}.</p>`}
      <div class="botones">${boton}</div>`;
  }

  /** Tarjeta de un héroe que vuelve (de misión o de entrenar): barra de experiencia, subida, ascenso, límite y lesión. */
  private tarjetaRegreso(h: Heroe | undefined, g: Progreso, diasLesion: number): string {
    const nombre = (h?.nombre ?? '').split(' ')[0] ?? '';
    const total = balance.heroes.experienciaPorBarra;
    // La barra se llena desde donde estaba; si se completa, llega al final y celebra la subida.
    const desde = Math.round((100 * g.experienciaAntes) / total);
    const hasta = g.barras > 0 ? 100 : Math.round((100 * g.experienciaDespues) / total);
    const hitos = [
      g.barras > 0 ? `<span class="hito subida">¡Sube de poder! ${g.poderAntes} → ${g.poderDespues}</span>` : '',
      g.rangoDespues !== g.rangoAntes
        ? `<span class="hito ascenso">¡Asciende a rango ${g.rangoDespues}! Su sueldo pasa de ${num(g.sueldoAntes)} a ${num(g.sueldoDespues)}</span>`
        : '',
      g.llegaAlLimite ? `<span class="hito limite">Ha llegado a su límite: potencial ${g.rangoDespues}</span>` : '',
      diasLesion > 0 ? `<span class="hito lesion">Lesionado ${diasLesion} ${diasLesion === 1 ? 'día' : 'días'}</span>` : '',
    ].join('');
    const barra = g.experienciaGanada > 0
      ? `<span class="barra-xp grande ${g.barras > 0 ? 'llena' : ''}"><i style="--desde:${desde}%;--hasta:${hasta}%"></i></span>
         <small class="tenue">+${g.experienciaGanada} exp · ${g.llegaAlLimite ? 'al límite' : `${g.experienciaDespues}/${total}${g.barras > 0 ? ' hacia la siguiente subida' : ''}`}</small>`
      : '<small class="tenue">Ya está al límite: no gana experiencia</small>';
    return `<div class="regreso">
      <div class="quien">${h ? `<span class="avatar mini">${retrato(h)}</span>` : ''}<strong>${esc(nombre)}</strong>${this.rangoChip(g.rangoDespues)}</div>
      <div class="progreso">${barra}</div>
      <div class="hitos">${hitos}</div>
    </div>`;
  }

  private panelSemana(estado: EstadoJuego): string {
    const r = this.resumenSemana;
    if (!r) return '';
    const actual = puesto(estado, estado.jugadorId);
    const cambio = r.puestoAnterior - actual;
    const mia = r.ranking.find((f) => f.gremioId === estado.jugadorId);
    const ganados = (mia?.puntos ?? 0) - r.puntosAnteriores;
    const delante = mia ? r.ranking.find((f) => f.puesto === mia.puesto - 1) : undefined;
    const titular =
      cambio > 0
        ? `¡Subes ${cambio} ${cambio === 1 ? 'puesto' : 'puestos'}!`
        : cambio < 0
          ? `Bajas ${-cambio} ${cambio === -1 ? 'puesto' : 'puestos'}.`
          : ganados > 0
            ? `+${num(ganados)} puntos esta semana.`
            : 'Esta semana no has sumado puntos.';
    const progreso = delante && mia
      ? `<p class="progreso-ranking">${cambio > 0 && ganados > 0 ? `+${num(ganados)} puntos esta semana. ` : ''}Para alcanzar a <b>${esc(estado.gremios[delante.gremioId]?.nombre ?? '')}</b> te faltan <b>${num(delante.puntos - mia.puntos)}</b> puntos. ${esc(TEXTO_PUNTOS)}</p>`
      : '';
    const temporada = r.temporada
      ? `<div class="resultado"><b>Fin de la temporada ${r.temporada.numero}</b><span>Terminas ${r.temporada.puesto}.º · premio +${num(r.temporada.premio)} oro</span></div>`
      : '';
    const ascenso = r.categoriaNueva ? `<div class="resultado ascenso-categoria"><b>¡Categoría ${r.categoriaNueva}!</b><span>La Asociación asciende a tu gremio: desde mañana el tablón ofrece misiones más difíciles y mejor pagadas.</span></div>` : '';
    const reto = estado.reto && !estado.reto.resultado ? `<div class="resultado reto-aviso"><b>Nuevo reto</b><span>El maestro de ${esc(estado.gremios[estado.reto.gremioId]?.nombre ?? '')} te reta con un ${estado.reto.clase.toLowerCase()} de rango ${estado.reto.rango}. Respóndele en el Mercado de héroes.</span></div>` : '';
    const nuevos = r.desbloqueos.map((t) => `<div class="resultado desbloqueo"><b>${esc(t)}</b></div>`).join('');
    return `<p><strong>${titular}</strong> Eres ${actual}.º.</p>${nuevos}${progreso}${ascenso}${reto}${temporada}${r.torneo ? this.tablaTorneo(estado, r.torneo) : ''}${this.tablaRanking(estado, r.ranking)}
      <div class="botones"><button class="principal" data-accion="${r.victoria ? 'ver-victoria' : 'cerrar'}">Seguir</button></div>`;
  }

  private panelVictoria(estado: EstadoJuego): string {
    const j = jugador(estado);
    const mejor = heroesDe(estado, j.id).sort((a, b) => b.poder - a.poder)[0];
    const caidos = estado.caidos.filter((c) => c.gremioId === j.id);
    return `<p><strong>${esc(textoFinal(puesto(estado, j.id)))}</strong></p>
      <p>${esc(j.nombre)} termina la historia en el puesto ${puesto(estado, j.id)}.º del ranking.</p>
      ${mejor ? `<p class="tenue">Vuestra leyenda: ${esc(mejor.nombre)}, con poder ${mejor.poder} (${letraDe(mejor.poder)}).</p>` : ''}
      ${caidos.length ? `<p class="tenue">En el muro de los caídos: ${esc(caidos.map((c) => c.nombre).join(', '))}.</p>` : ''}
      <button data-accion="nueva" class="principal">Nueva partida</button>`;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  private alHacerClic(evento: Event): void {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-abrir]');
    if (!objetivo || (objetivo as HTMLButtonElement).disabled) return;
    const abrir = objetivo.dataset.abrir as Panel | undefined;
    if (abrir) {
      if (objetivo.dataset.pestana) this.pestanaGremio = objetivo.dataset.pestana as PestanaGremio;
      return abrir === 'misiones' ? this.abrirMisiones() : this.abrir(abrir);
    }
    try {
      this.ejecutar(objetivo.dataset.accion ?? '', objetivo.dataset.id ?? '');
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
      this.repintar();
    }
  }

  private abrirMisiones(): void {
    this.misionId = null;
    this.equipo = [];
    this.abrir('misiones');
  }

  private ejecutar(accion: string, id: string): void {
    switch (accion) {
      case 'cerrar':
        return this.cerrar();
      case 'empezar': {
        const nombreGremio = document.querySelector<HTMLInputElement>('#nombre')?.value ?? '';
        this.estado = crearPartida({ nombreGremio });
        this.guardar();
        return this.cerrar();
      }
      case 'nueva':
        borrar();
        this.estado = null;
        return this.abrir('nueva');
    }
    const estado = this.estado;
    if (!estado) return;
    switch (accion) {
      case 'finalizar':
        return this.finalizarElDia();
      case 'elegir-mision': {
        this.misionId = id;
        const mision = estado.tablon.find((m) => m.id === id);
        this.equipo = mision ? equipoRecomendado(estado, mision).map((h) => h.id) : [];
        return this.repintar();
      }
      case 'otra-mision':
        this.misionId = null;
        return this.repintar();
      case 'alternar': {
        const mision = estado.tablon.find((m) => m.id === this.misionId);
        if (this.equipo.includes(id)) this.equipo = this.equipo.filter((x) => x !== id);
        else if (mision) {
          // Se llenan huecos (AllBlack ocupa tres; Pacto, dos): si no cabe, salen los primeros elegidos.
          this.equipo.push(id);
          const ocupa = (ids: string[]): number => huecosEquipo(ids.map((x) => obtenerHeroe(estado, x)));
          while (this.equipo.length > 1 && ocupa(this.equipo) > mision.equipo) this.equipo.shift();
        }
        return this.repintar();
      }
      case 'lanzar': {
        if (!this.misionId) return;
        const mision = estado.tablon.find((m) => m.id === this.misionId);
        lanzarMision(estado, this.misionId, this.equipo);
        this.misionId = null;
        this.equipo = [];
        this.guardar();
        const quedan = heroesLibres(estado).length;
        this.mensaje = `Misión lanzada: «${mision?.titulo ?? ''}». ${quedan ? `Te quedan ${quedan} ${quedan === 1 ? 'héroe libre' : 'héroes libres'}.` : 'Ya no te quedan héroes libres.'}`;
        return this.repintar();
      }
      case 'pestana-mercado':
        this.pestanaMercado = id === 'vender' ? 'vender' : 'comprar';
        return this.repintar();
      case 'ver-gremio':
        this.gremioRival = id;
        return this.repintar();
      case 'pestana-gremio':
        this.pestanaGremio = id as PestanaGremio;
        this.mensaje = '';
        return this.repintar();
      case 'ver-pareja':
        this.parejaVista = this.parejaVista === id ? null : id;
        return this.repintar();
      case 'ir-relaciones':
        this.pestanaGremio = 'relaciones';
        return this.abrir('gremio');
      case 'decidir': {
        const [uid, opcion] = id.split(':') as [string, string];
        const textos = resolverEvento(estado, uid, opcion);
        this.mensaje = textos.join(' ');
        this.guardar();
        return this.repintar();
      }
      case 'comprar': {
        const h = obtenerHeroe(estado, id);
        comprar(estado, id);
        this.mensaje = `${h.nombre} se une a tu gremio.`;
        this.guardar();
        return this.repintar();
      }
      case 'vender': {
        const h = obtenerHeroe(estado, id);
        const oferta = vender(estado, id);
        this.mensaje = `${h.nombre} se va a ${estado.gremios[oferta.compradorId]?.nombre ?? ''} por ${num(oferta.precio)} de oro.`;
        this.guardar();
        return this.repintar();
      }
      case 'mejorar':
        mejorar(estado, estado.jugadorId, id as Instalacion);
        this.mensaje = `¡${NOMBRE_INSTALACION[id as Instalacion]} mejorada!`;
        this.guardar();
        return this.repintar();
      case 'reto-aceptar': {
        const r = conAzar(estado, (azar) => aceptarReto(estado, azar, id));
        this.mensaje = r.desenlace === 'victoria' ? '¡Has ganado el reto!' : r.desenlace === 'derrota' ? 'Has perdido el reto.' : 'Empate en el reto.';
        this.guardar();
        return this.repintar();
      }
      case 'reto-rechazar':
        rechazarReto(estado);
        this.mensaje = 'Has rechazado el reto.';
        this.guardar();
        return this.repintar();
      case 'entrenar': {
        const h = obtenerHeroe(estado, id);
        entrenar(estado, id);
        this.mensaje = `${h.nombre} se va a entrenar ${balance.entrenamiento.dias} días.`;
        this.guardar();
        return this.repintar();
      }
      case 'revelar':
        this.revelados.add(id);
        this.recienRevelados.add(id);
        return this.repintar();
      case 'revelar-todos':
        for (const x of estado.prueba?.pendientes ?? []) {
          if (!this.revelados.has(x)) this.recienRevelados.add(x);
          this.revelados.add(x);
        }
        return this.repintar();
      case 'preparar-ascension':
        this.confirmarAscension = id;
        return this.repintar();
      case 'cancelar-ascension':
        this.confirmarAscension = null;
        return this.repintar();
      case 'ascension': {
        const h = obtenerHeroe(estado, id);
        iniciarAscension(estado, id);
        this.confirmarAscension = null;
        this.mensaje = `${h.nombre} parte hacia su Ascensión. Vuelve (o no) en ${balance.ascension.duracion} días.`;
        this.guardar();
        return this.repintar();
      }
      case 'curar': {
        const h = obtenerHeroe(estado, id);
        const precio = curar(estado, id);
        this.mensaje = `${h.nombre} está curado (−${num(precio)} oro).`;
        this.guardar();
        return this.repintar();
      }
      case 'ir-heroes':
        this.pestanaGremio = 'heroes';
        return this.abrir('gremio');
      case 'ir-prueba':
        return this.abrir('prueba');
      case 'siguiente-candidato':
        siguienteCandidato(estado);
        this.guardar();
        return this.repintar();
      case 'pujar':
      case 'retirarse':
        pujarNovato(estado, accion === 'pujar' ? 'pujar' : 'retirarse');
        this.guardar();
        return this.repintar();
      case 'terminar-prueba':
        this.resumenSemana = terminarPrueba(estado);
        this.guardar();
        return this.abrir('semana');
      case 'ver-victoria':
        return this.abrir('victoria');
    }
  }

  private finalizarElDia(): void {
    const estado = this.estado;
    if (!estado || estado.fase !== 'gestion') return;
    this.resumenDia = finalizarDia(estado);
    this.guardar();
    this.abrir('dia');
    if (this.resumenDia.ascensiones.length > 0) this.mostrarReveal(this.resumenDia.ascensiones);
  }

  /** Barra de cada Ascensión en curso, con una línea por día de lo que está sufriendo el héroe. */
  private pintarAscensiones(estado: EstadoJuego | null): void {
    const viajes = estado && estado.fase !== 'victoria' ? estado.enCurso.filter((c) => c.ascension && c.gremioId === estado.jugadorId) : [];
    this.hudAscension.hidden = viajes.length === 0;
    if (!estado || viajes.length === 0) {
      this.hudAscension.innerHTML = '';
      return;
    }
    const duracion = balance.ascension.duracion;
    this.hudAscension.innerHTML = viajes
      .map((c) => {
        const id = c.equipo[0] ?? '';
        const nombre = (estado.heroes[id]?.nombre ?? '').split(' ')[0] ?? '';
        const inicio = c.diaVuelta - duracion + 1;
        const dia = Math.min(duracion, Math.max(1, estado.dia - inicio + 1));
        const semilla = [...id].reduce((t, ch) => t + ch.charCodeAt(0), 0);
        const lineas = textosAscension.dias
          .slice(0, dia)
          .map((opciones, i) => `<li class="${i === dia - 1 ? 'hoy' : ''}"><b>Día ${i + 1}</b> ${esc((opciones[semilla % opciones.length] ?? '').replace('{nombre}', nombre))}</li>`)
          .join('');
        const marcas = Array.from({ length: duracion }, (_, i) => `<i class="${i < dia ? 'hecho' : ''} ${i === dia - 1 ? 'hoy' : ''}"></i>`).join('');
        const falta = c.diaVuelta - estado.dia;
        return `<div class="ascension-viaje">
          <div class="cabeza">${estado.heroes[id] ? `<span class="avatar mini">${retrato(estado.heroes[id]!)}</span>` : ''}<span class="etq">Ascensión</span><strong>${esc(nombre)}</strong><span class="tenue">${falta === 0 ? 'el resultado llega al finalizar el día' : `faltan ${falta + 1} días`}</span></div>
          <div class="marcas">${marcas}</div>
          <ul class="diario">${lineas}</ul>
        </div>`;
      })
      .join('');
  }

  /** El gran reveal: unas líneas de tensión y, después, el resultado. Se cierra con la ✕. */
  private mostrarReveal(resultados: ResultadoAscension[]): void {
    const t = textosAscension;
    const dias = balance.ascension.duracion;
    let retraso = 0;
    const paso = 1.1;
    const bloques = resultados
      .map((r) => {
        const nombre = r.nombre.split(' ')[0] ?? r.nombre;
        const linea = (texto: string, clase = ''): string => {
          const html = `<p class="linea ${clase}" style="--d:${retraso.toFixed(1)}s">${esc(texto.replace(/\{nombre\}/g, nombre).replace('{dias}', String(dias)))}</p>`;
          retraso += paso;
          return html;
        };
        const preambulo = t.preambulo.map((x) => linea(x)).join('');
        const extra = r.exito && r.despertar >= 3 ? linea(t.legendario, 'legendaria') : r.exito && r.despertar === 2 ? linea(t.extraordinario, 'extraordinaria') : '';
        const desenlace = (r.exito ? t.exito : t.fracaso).map((x) => linea(x, r.exito ? 'luz' : 'sombra')).join('') + extra;
        const veredicto = r.exito
          ? `<div class="veredicto exito ${DESPERTAR[r.despertar]?.clase ?? ''}" style="--d:${retraso.toFixed(1)}s"><span class="avatar grande">${retrato({ id: r.heroeId, clase: r.clase })}<span class="rango ${this.cr(r.rangoDespues)}">${r.rangoDespues}</span></span><div>${DESPERTAR[r.despertar]?.titulo ? `<em>${DESPERTAR[r.despertar]!.titulo}</em>` : ''}<b>¡${esc(r.nombre)} asciende a rango ${r.rangoDespues}!</b><span>Poder ${r.poderAntes} → ${r.poderDespues} · ${r.despertar === 0 ? 'ha alcanzado la cima' : `nuevo techo <strong class="${this.cr(r.techoNuevo)}">${r.techoNuevo}</strong>`}</span></div></div>`
          : `<div class="veredicto fracaso" style="--d:${retraso.toFixed(1)}s"><span class="avatar grande caido">${retrato({ id: r.heroeId, clase: r.clase })}</span><div><b>${esc(r.nombre)} ha caído en su Ascensión</b><span>El gremio guarda luto.</span></div></div>`;
        retraso += paso;
        return `<div class="bloque-reveal">${preambulo}${desenlace}${veredicto}</div>`;
      })
      .join('');
    this.revelacion.innerHTML = `<div class="caja-reveal ${resultados.every((r) => r.exito) ? 'exito' : resultados.every((r) => !r.exito) ? 'fracaso' : ''}">
      <button class="cerrar-reveal" data-accion="cerrar-reveal" aria-label="Cerrar">✕</button>
      <h2>La Ascensión</h2>
      ${bloques}
    </div>`;
    this.revelacion.hidden = false;
    this.revelacion.querySelector<HTMLButtonElement>('.cerrar-reveal')?.focus();
  }

  private guardar(): void {
    if (this.estado) guardar(this.estado);
  }
}
