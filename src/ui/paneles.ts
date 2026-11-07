// Interfaz principal (biblia, sección 3): solo cinco elementos en pantalla. Oro arriba a la izquierda,
// Finalizar día arriba a la derecha, Gestionar gremio a la izquierda, Lanzar misiones a la derecha y
// Mercado de héroes abajo en el centro. Todo lo demás vive dentro de sus menús. Solo lee el estado y llama al motor.

import { condicionesCuracion, curar, sueldosDe } from '../motor/economia';
import { condicionesAscension, iniciarAscension } from '../motor/ascension';
import { condicionesEntrenamiento, entrenar, plazasEntrenamiento } from '../motor/entrenamiento';
import type { Progreso } from '../motor/heroes';
import { categoria, siguienteCategoria } from '../motor/categorias';
import { prestigio } from '../motor/ranking';
import { diasParaPrueba, esDia7, heroe as obtenerHeroe, heroesDe, jugador, misionDe, puesto, rivales, type EstadoJuego } from '../motor/estado';
import { alLimite, esDestacado, letraDe, rango, rangoPotencial, sueldo, textoPotencial } from '../motor/heroes';
import { NOMBRE_INSTALACION, infoInstalacion, mejorar, plazas, type Instalacion } from '../motor/instalaciones';
import { comprar, condicionesCompra, ofertaVenta, vender } from '../motor/mercado';
import { clasesCubiertas, duracionMision, probabilidadMision } from '../motor/misiones';
import { fraseReto, heroesParaReto, motivoNoAceptar, aceptarReto, rechazarReto } from '../motor/retos';
import {
  conAzar,
  crearPartida,
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
import { equipoRecomendado, heroesLibres, nivelDificultad, probabilidadRecomendada } from './ayudas';
import { borrar, cargar, guardar } from './guardado';
import { esc, num, pct } from './html';

export type Panel = 'nueva' | 'misiones' | 'mercado' | 'gremio' | 'prueba' | 'dia' | 'semana' | 'victoria';
type PestanaGremio = 'heroes' | 'instalaciones' | 'ranking';

const TITULOS: Record<Panel, string> = {
  nueva: 'Gremio de héroes',
  misiones: 'Lanzar misiones',
  mercado: 'Mercado de héroes',
  gremio: 'Gestionar gremio',
  prueba: 'Prueba de los Novatos',
  dia: 'Resumen del día',
  semana: 'Ranking de la semana',
  victoria: '¡Número uno!',
};

const ICONO_CLASE: Record<string, string> = { Guerrero: '⚔', Mago: '✦', Explorador: '➶', Sanador: '✚' };
const EFECTO_CLASE: Record<string, string> = {
  Guerrero: 'Guerrero: se lesiona menos.',
  Mago: 'Mago: más poder en misiones de rango alto, pero se lesiona más.',
  Explorador: 'Explorador: el equipo vuelve un día antes de las misiones de rango alto.',
  Sanador: 'Sanador: sus compañeros se lesionan menos.',
};

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
  private equipo: string[] = [];
  private pestanaMercado: 'comprar' | 'vender' = 'comprar';
  private gremioRival = 'dragon';
  private pestanaGremio: PestanaGremio = 'heroes';
  private resumenDia: ResumenDia | null = null;
  private resumenSemana: ResumenSemana | null = null;

  constructor(private readonly el: ElementosInterfaz) {
    for (const zona of [el.panel, el.menu, el.accion, el.objetivo, el.equipo, el.cabecera]) {
      zona.addEventListener('click', (e) => this.alHacerClic(e));
    }
    window.addEventListener('keydown', (e) => {
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

    if (enJuego && estado) {
      if (estado.fase === 'prueba') {
        this.el.objetivo.innerHTML = `<button class="boton-dia novatos" data-abrir="prueba">Prueba de los Novatos<small>Los gremios pujan por los novatos</small></button>`;
      } else {
        const faltan = diasParaPrueba(estado.dia);
        const pista = esDia7(estado.dia)
          ? `Hoy se pagan los sueldos (${num(sueldosDe(estado, estado.jugadorId))}) y después llega la Prueba de los Novatos`
          : `Prueba de los Novatos en ${faltan} ${faltan === 1 ? 'día' : 'días'}`;
        this.el.objetivo.innerHTML = `<button class="boton-dia" data-accion="finalizar">Finalizar día<small>${pista}</small></button>`;
      }
      const libres = heroesLibres(estado).length;
      const bloqueo = estado.fase !== 'gestion' ? 'disabled' : '';
      const todos = heroesDe(estado, estado.jugadorId);
      const cuenta = (e: Heroe['estado']): number => todos.filter((h) => h.estado === e).length;
      const resumen = [`${libres} ${libres === 1 ? 'libre' : 'libres'}`, cuenta('en mision') ? `${cuenta('en mision')} de misión` : '', cuenta('lesionado') ? `${cuenta('lesionado')} ${cuenta('lesionado') === 1 ? 'lesionado' : 'lesionados'}` : '', cuenta('entrenando') ? `${cuenta('entrenando')} entrenando` : '']
        .filter(Boolean)
        .join(' · ');
      const sinCobrar = todos.some((h) => h.semanasSinCobrar > 0) ? '<em class="alerta-texto">Hay héroes sin cobrar</em>' : '';
      this.el.menu.innerHTML = `<button class="boton-grande gastar" data-abrir="gremio" data-pestana="heroes" ${bloqueo}><span class="signo">−</span>Gestionar gremio<small>Héroes: ${resumen}</small><small>Mejorar instalaciones</small>${sinCobrar}</button>`;
      this.el.equipo.innerHTML = `<button class="boton-grande ganar" data-abrir="misiones" ${bloqueo}><span class="signo">+</span>Lanzar misiones<small>${estado.tablon.length} en el tablón · ${libres} ${libres === 1 ? 'héroe libre' : 'héroes libres'}</small></button>`;
      const retoPendiente = estado.reto && !estado.reto.resultado ? '<em class="alerta-texto">¡Un maestro rival te reta!</em>' : '';
      this.el.accion.innerHTML = `<button class="boton-grande mercado" data-abrir="mercado" ${bloqueo}>Mercado de héroes<small>Compra a otros gremios o vende a los tuyos</small>${retoPendiente}</button>`;
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

  private potencial(estado: EstadoJuego, h: Heroe): string {
    const [, max] = rangoPotencial(h, jugador(estado).nivelOjeadores);
    return `<span class="rango potencial r${max}" title="Potencial: hasta dónde puede crecer. La instalación de ojeadores estrecha el rango.">${esc(textoPotencial(h, jugador(estado).nivelOjeadores))}</span>`;
  }

  private claseChip(clase: string, extra = ''): string {
    return `<span class="clase-chip c-${clase} ${extra}" title="${esc(EFECTO_CLASE[clase] ?? '')}">${ICONO_CLASE[clase] ?? ''} ${clase}</span>`;
  }

  private rangoChip(letra: string): string {
    return `<span class="rango-chip r${letra}" title="Rango según su poder: F, D, C, B, A, S">Rango ${letra}</span>`;
  }

  /** Barra de experiencia hacia la siguiente subida de poder (o «Al límite» si ya no crece). */
  private barraXp(h: Heroe): string {
    if (alLimite(h)) return '<span class="al-limite" title="Ha llegado a su potencial: ya no gana poder">Al límite</span>';
    const total = balance.heroes.experienciaPorBarra;
    return `<span class="xp" title="Experiencia: al llenar la barra, +${balance.heroes.poderPorBarra} de poder"><span class="barra-xp"><i style="--hasta:${Math.round((100 * h.experiencia) / total)}%"></i></span><small>${h.experiencia}/${total} exp</small></span>`;
  }

  private carta(estado: EstadoJuego, h: Heroe, pie: string, extraClase = ''): string {
    const estadoTexto =
      h.estado === 'libre'
        ? ''
        : `<span class="estado-chip e-${h.estado.replace(' ', '-')}">${esc(h.estado === 'lesionado' ? `lesionado · ${h.diasLesion} d.` : h.estado)}</span>`;
    return `<article class="carta ${extraClase}">
      <header>
        ${this.potencial(estado, h)}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">${this.claseChip(h.clase)} Reputación ${h.reputacion} · Lealtad ${h.lealtad}</span></div>
        ${estadoTexto}
      </header>
      <div class="poder"><b>${num(h.poder)}</b><span>Poder · ${this.rangoChip(rango(h))}</span><p>Sueldo ${num(sueldo(h))} de oro por semana</p></div>
      ${this.barraXp(h)}
      <footer>${pie}</footer>
    </article>`;
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  private panelNueva(): string {
    return `
      <p>Diriges el <strong>peor gremio de héroes</strong> del reino: último del ranking, con poco oro y tres aventureros sin fama.</p>
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
        return `<button class="tarjeta-mision t-${m.rango}" data-accion="elegir-mision" data-id="${m.id}">
          <span class="nivel">${r.nombre}</span>
          <span class="titulo-mision">${esc(m.titulo)}</span>
          <span class="tipo-mision">${esc(m.tipo)} · ideal: ${m.clases.map((c) => `${ICONO_CLASE[c] ?? ''} ${c}`).join(' + ')}</span>
          <span class="oro-mision">+${num(m.recompensa)}<small>oro</small></span>
          <span class="tenue">${m.duracion} ${m.duracion === 1 ? 'día' : 'días'} · ${m.equipo} ${m.equipo === 1 ? 'héroe' : 'héroes'} · ${r.riesgo}</span>
          <span class="dificultad d-${nivelDificultad(prob)}">${prob === null ? 'Sin héroes libres' : `${pct(prob)} de éxito`}</span>
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
    return `${meta}${tarjetas ? `<p>Puedes lanzar las tres misiones si tienes héroes libres. Los enviados no vuelven hasta que termina la misión.</p><div class="tres">${tarjetas}</div>` : '<p>Ya has lanzado todas las misiones de hoy. Mañana habrá un tablón nuevo.</p>'}
      ${fuera ? `<h3>De misión</h3><ul class="lista">${fuera}</ul>` : ''}`;
  }

  private formacion(estado: EstadoJuego, mision: Mision): string {
    const libres = heroesLibres(estado).sort((a, b) => b.poder - a.poder);
    this.equipo = this.equipo.filter((id) => libres.some((h) => h.id === id));
    const equipo = this.equipo.map((id) => obtenerHeroe(estado, id));
    const prob = equipo.length ? probabilidadMision(mision, equipo) : null;
    const { cubiertas, faltan } = clasesCubiertas(mision, equipo);
    const duracion = equipo.length ? duracionMision(mision, equipo) : mision.duracion;
    const clases = `<div class="clases-mision"><span class="tenue">${esc(mision.tipo)}: ideal</span>${cubiertas.map((c) => this.claseChip(c, 'cubierta')).join('')}${faltan.map((c) => this.claseChip(c, 'falta')).join('')}<span class="tenue">+${balance.clases.bonusPorClase}% de éxito por cada una${mision.clases.length > 1 ? `, +${balance.clases.bonusCombinacion}% más con todas` : ''}</span></div>`;
    const fichas = libres
      .map((h) => {
        const va = this.equipo.includes(h.id);
        return `<button class="ficha-heroe ${va ? 'va' : ''}" data-accion="alternar" data-id="${h.id}" aria-pressed="${va}">
          ${this.potencial(estado, h)}
          <span class="quien"><strong>${esc(h.nombre.split(' ')[0] ?? '')}</strong><span class="tenue">${ICONO_CLASE[h.clase] ?? ''} ${h.clase} · poder ${num(h.poder)}</span></span>
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
          <div class="tenue">+${num(mision.recompensa)} oro · ${duracion} ${duracion === 1 ? 'día' : 'días'}${duracion < mision.duracion ? ' (el Explorador ahorra uno)' : ''} · elige <strong>${mision.equipo}</strong> ${mision.equipo === 1 ? 'héroe' : 'héroes'}. Ya te proponemos un equipo.</div></div>
        <div class="medidor d-${nivelDificultad(prob)}"><b>${prob === null ? '—' : pct(prob)}</b><span>de éxito</span></div>
      </div>
      ${clases}
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
    const nombres: Record<PestanaGremio, string> = { heroes: 'Héroes', instalaciones: 'Instalaciones', ranking: 'Ranking' };
    const pestañas = `<div class="pestanas">${(Object.keys(nombres) as PestanaGremio[])
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
      case 'ranking':
        return `${pestañas}${this.tablaRanking(estado)}
          <p class="tenue">Puntos = Fuerza (poder de tus 5 mejores héroes) + Prestigio (instalaciones, misiones de rango alto y novatos destacados fichados). El ranking oficial se actualiza el día 7; al final de cada temporada (28 días) se reparte un premio según la posición.</p>`;
      default:
        return `${pestañas}${this.inventario(estado)}`;
    }
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
        detalle = 'Listo para una misión';
        const a = condicionesAscension(estado, h.id);
        if (alLimite(h) && a.rangoNuevo) {
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
        ${this.potencial(estado, h)}
        <div class="quien"><strong>${esc(h.nombre)} ${this.rangoChip(rango(h))}</strong><span class="tenue">${this.claseChip(h.clase)} Poder ${h.poder} · sueldo ${num(sueldo(h))} · lealtad ${h.lealtad}</span>${this.barraXp(h)}${aviso}</div>
        <div class="situacion"><span class="estado-chip e-${h.estado.replace(' ', '-')}">${h.estado === 'en mision' ? 'de misión' : h.estado}</span><span class="tenue">${detalle}</span></div>
        <div class="accion-fila">${accion}</div>
      </div>`;
    };
    const grupos: [Heroe['estado'], string][] = [['lesionado', 'Lesionados'], ['en mision', 'De misión'], ['entrenando', 'Entrenando'], ['libre', 'Libres']];
    const bloques = grupos
      .map(([e, titulo]) => {
        const lista = heroes.filter((h) => h.estado === e);
        return lista.length ? `<h3>${titulo} · ${lista.length}</h3><div class="inventario">${lista.map(fila).join('')}</div>` : '';
      })
      .join('');
    return `<p class="tenue">${j.plantilla.length} de ${plazas(j)} plazas · sueldos de la semana: <strong>${num(sueldosDe(estado, j.id))}</strong> de oro el día 7. Si no llega el oro, cobran primero los más poderosos.</p>
      ${bloques || '<p class="tenue">No tienes héroes.</p>'}`;
  }

  private tablaRanking(estado: EstadoJuego, filas = estado.ranking): string {
    const ahora = new Map(calcularRanking(estado).map((f) => [f.gremioId, f]));
    return `<table><thead><tr><th></th><th>Gremio</th><th class="num">Fuerza</th><th class="num">Prestigio</th><th class="num">Puntos</th><th class="num">Ahora</th></tr></thead><tbody>${filas
      .map((f) => {
        const g = estado.gremios[f.gremioId]!;
        return `<tr class="${g.esJugador ? 'propio' : ''}"><td>${f.puesto}.º</td><td>${esc(g.nombre)}</td><td class="num">${num(f.fuerza)}</td><td class="num">${num(f.prestigio)}</td><td class="num"><b>${num(f.puntos)}</b></td><td class="num tenue">${num(ahora.get(f.gremioId)?.puntos ?? f.puntos)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
  }

  private panelPrueba(estado: EstadoJuego): string {
    const prueba = estado.prueba;
    if (!prueba) return '<div class="botones"><button class="principal" data-accion="cerrar">Volver</button></div>';
    const s = prueba.subasta;
    // 1. Presentación de los novatos.
    if (!s && prueba.resultados.length === 0) {
      const cartas = prueba.pendientes
        .map((id) => {
          const h = obtenerHeroe(estado, id);
          return this.carta(estado, h, `<span class="precio">Despierta con poder <b>${h.poder}</b></span>`);
        })
        .join('');
      return `<p>Ya has pagado los sueldos de la semana: te quedan <strong>${num(jugador(estado).oro)}</strong> de oro. Hoy ${prueba.pendientes.length} jóvenes despiertan sus poderes y los gremios pujan por ellos.</p>
        <p class="tenue">No sabes cuánto valen de verdad: el potencial es un rango. La subasta es por turnos: en cada ronda subes la puja o te retiras.</p>
        <div class="cartas">${cartas}</div>
        <div class="botones"><button data-accion="terminar-prueba">No pujar esta semana</button><button class="principal" data-accion="siguiente-candidato">Empezar la subasta</button></div>`;
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
          ? `¡${esc(h.nombre)} se une a tu gremio!${esDestacado(h) ? ' Es un novato destacado.' : ''}`
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
          .map((parte) => this.tarjetaRegreso((estado.heroes[parte.heroeId]?.nombre ?? '').split(' ')[0] ?? '', parte.progreso, parte.diasLesion))
          .join('');
        return `<div class="resultado r-${i.exito ? 'exito' : 'fracaso'}"><b>${i.exito ? '¡Misión cumplida!' : 'La misión ha fracasado'}</b><span>«${esc(i.mision.titulo)}» · +${num(i.oro)} oro</span>
          <div class="regresos">${heroes}</div></div>`;
      })
      .join('');
    const nombre = (id: string): string => estado.heroes[id]?.nombre ?? '';
    const p = r.sueldos;
    const sueldos = p
      ? `<div class="resultado ${p.completo ? '' : 'r-fracaso'}"><b>Día de sueldos</b><span>−${num(p.pagado)} oro${p.completo ? '' : ` de ${num(p.total)}`}</span>
          ${p.impagados.length ? `<p class="caidos">Sin cobrar: ${esc(p.impagados.map(nombre).join(', '))}. Pierden lealtad y, si la semana que viene tampoco cobran, se irán.</p>` : ''}
          ${p.seVan.length ? `<p class="caidos">Se van por no cobrar: ${esc(p.seVan.map((x) => `${x.nombre}${x.destino ? ` (a ${estado.gremios[x.destino]?.nombre ?? ''})` : ''}`).join(', '))}.</p>` : ''}</div>`
      : '';
    const noticias = r.noticias.length ? `<h3>Noticias</h3><ul class="lista">${r.noticias.slice(0, 4).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
    const boton = r.prueba
      ? '<button class="principal" data-accion="ir-prueba">Ir a la Prueba de los Novatos</button>'
      : '<button class="principal" data-accion="cerrar">Seguir</button>';
    const ascensiones = r.ascensiones
      .map((a) =>
        a.exito
          ? `<div class="resultado r-exito ascension"><b>¡${esc(a.nombre)} supera su Ascensión!</b><span>Asciende a rango ${a.rangoDespues} (poder ${a.poderAntes} → ${a.poderDespues}) y su nuevo techo es ${a.techoNuevo}.</span></div>`
          : `<div class="resultado r-fracaso ascension"><b>${esc(a.nombre)} no vuelve de su Ascensión</b><span>El gremio guarda luto.</span></div>`,
      )
      .join('');
    const ascenso = r.categoriaNueva ? `<div class="resultado ascenso-categoria"><b>¡Categoría ${r.categoriaNueva}!</b><span>La Asociación asciende a tu gremio: desde mañana el tablón ofrece misiones más difíciles y mejor pagadas.</span></div>` : '';
    const entrenos = r.entrenamientos.length
      ? `<div class="resultado entreno"><b>Vuelven de entrenar</b><span>Sin lesiones.</span><div class="regresos">${r.entrenamientos.map((e) => this.tarjetaRegreso(e.nombre.split(' ')[0] ?? '', e.progreso, 0)).join('')}</div></div>`
      : '';
    return `${ascenso}${ascensiones}${misiones}${entrenos}${misiones || ascensiones || entrenos ? '' : '<p>Hoy no ha vuelto ninguna misión.</p>'}${sueldos}${noticias}
      ${r.prueba ? '' : `<p class="tenue">Empieza el ${esc(textoCalendario(estado).split(' · ')[1] ?? '')}.</p>`}
      <div class="botones">${boton}</div>`;
  }

  /** Tarjeta de un héroe que vuelve (de misión o de entrenar): barra de experiencia, subida, ascenso, límite y lesión. */
  private tarjetaRegreso(nombre: string, g: Progreso, diasLesion: number): string {
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
      <div class="quien"><strong>${esc(nombre)}</strong>${this.rangoChip(g.rangoDespues)}</div>
      <div class="progreso">${barra}</div>
      <div class="hitos">${hitos}</div>
    </div>`;
  }

  private panelSemana(estado: EstadoJuego): string {
    const r = this.resumenSemana;
    if (!r) return '';
    const actual = puesto(estado, estado.jugadorId);
    const cambio = r.puestoAnterior - actual;
    const titular = cambio > 0 ? `¡Subes ${cambio} ${cambio === 1 ? 'puesto' : 'puestos'}!` : cambio < 0 ? `Bajas ${-cambio} ${cambio === -1 ? 'puesto' : 'puestos'}.` : 'Te mantienes en el mismo puesto.';
    const temporada = r.temporada
      ? `<div class="resultado"><b>Fin de la temporada ${r.temporada.numero}</b><span>Terminas ${r.temporada.puesto}.º · premio +${num(r.temporada.premio)} oro</span></div>`
      : '';
    const ascenso = r.categoriaNueva ? `<div class="resultado ascenso-categoria"><b>¡Categoría ${r.categoriaNueva}!</b><span>La Asociación asciende a tu gremio: desde mañana el tablón ofrece misiones más difíciles y mejor pagadas.</span></div>` : '';
    const reto = estado.reto && !estado.reto.resultado ? `<div class="resultado reto-aviso"><b>Nuevo reto</b><span>El maestro de ${esc(estado.gremios[estado.reto.gremioId]?.nombre ?? '')} te reta con un ${estado.reto.clase.toLowerCase()} de rango ${estado.reto.rango}. Respóndele en el Mercado de héroes.</span></div>` : '';
    return `<p><strong>${titular}</strong> Eres ${actual}.º.</p>${ascenso}${reto}${temporada}${this.tablaRanking(estado, r.ranking)}
      <div class="botones"><button class="principal" data-accion="${r.victoria ? 'ver-victoria' : 'cerrar'}">Seguir</button></div>`;
  }

  private panelVictoria(estado: EstadoJuego): string {
    const j = jugador(estado);
    const mejor = heroesDe(estado, j.id).sort((a, b) => b.poder - a.poder)[0];
    return `<p>${esc(j.nombre)} ha cerrado la temporada como <strong>el mejor gremio del reino</strong>. Empezasteis los últimos; ahora todos os miran.</p>
      ${mejor ? `<p class="tenue">Vuestra leyenda: ${esc(mejor.nombre)}, con poder ${mejor.poder} (${letraDe(mejor.poder)}).</p>` : ''}
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
        else if (mision && this.equipo.length < mision.equipo) this.equipo.push(id);
        else if (mision) this.equipo = [...this.equipo.slice(1), id];
        return this.repintar();
      }
      case 'lanzar': {
        if (!this.misionId) return;
        const mision = estado.tablon.find((m) => m.id === this.misionId);
        lanzarMision(estado, this.misionId, this.equipo);
        this.misionId = null;
        this.equipo = [];
        this.guardar();
        this.mensaje = `Misión lanzada: «${mision?.titulo ?? ''}».`;
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
  }

  private guardar(): void {
    if (this.estado) guardar(this.estado);
  }
}
