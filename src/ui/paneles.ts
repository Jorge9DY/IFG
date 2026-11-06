// Paneles de gestión (fase 3). Solo leen el estado y llaman a acciones del motor.

import balance from '../datos/balance.json';
import {
  heroe as obtenerHeroe,
  heroesDe,
  jugador,
  manutencionDe,
  puesto,
  salariosDe,
  tabla,
  type EstadoJuego,
} from '../motor/estado';
import { gastosSemanales } from '../motor/economia';
import { prestigioGanado } from '../motor/ranking';
import { salarioPedido, valorMercado } from '../motor/heroes';
import { contextoGremio } from '../motor/ia';
import { POSICION_NATURAL, sumaCombate, vistaPreviaMision, type MiembroEquipo } from '../motor/misiones';
import {
  crearPartida,
  enviarMision,
  oroDisponibleParaPujar,
  pujarPorHeroe,
  terminarSemana,
} from '../motor/partida';
import { ofertaTotal, puntuacionOferta } from '../motor/pujas';
import type { Heroe, Posicion } from '../motor/tipos';
import { aceptarOferta, contraofertar, ponerEnVenta, quitarDeVenta } from '../motor/ventas';
import { retenerHeroe } from '../motor/rivales';
import { construirMejora, infoMejoras } from '../motor/sede';
import { condicionesCesion, pagarClausula, pedirCesion } from '../motor/traspasos';
import type { Mejora } from '../motor/tipos';
import { Azar } from '../motor/azar';
import { objetivoActual } from './objetivo';
import { borrar, cargar, guardar } from './guardado';
import { esc, num, pct } from './html';

export type Panel = 'nueva' | 'sede' | 'plantilla' | 'misiones' | 'mercado' | 'clasificacion' | 'informe' | 'semana' | 'fin';

const TITULOS: Record<Panel, string> = {
  nueva: 'Gremio Rango D',
  sede: 'Elara',
  plantilla: 'Plantilla',
  misiones: 'Tablón de misiones',
  mercado: 'Mercado',
  clasificacion: 'Clasificación',
  informe: 'Informe de la semana',
  semana: 'Terminar semana',
  fin: 'Fin de la partida',
};

const POSICIONES: { valor: Posicion; nombre: string }[] = [
  { valor: 'vanguardia', nombre: 'Vanguardia' },
  { valor: 'centro', nombre: 'Centro' },
  { valor: 'retaguardia', nombre: 'Retaguardia' },
];

const ICONO_VINCULO = { Romance: '♥', Familia: '⌂', Amistad: '✋', Rivalidad: '⚔' } as const;

export interface ElementosInterfaz {
  cabecera: HTMLElement;
  objetivo: HTMLElement;
  menu: HTMLElement;
  accion: HTMLElement;
  equipo: HTMLElement;
  panel: HTMLElement;
}

/** Paneles del menú lateral, en orden; las teclas 1–6 los abren. */
const MENU: { panel: Panel; texto: string }[] = [
  { panel: 'misiones', texto: 'Misiones' },
  { panel: 'mercado', texto: 'Mercado' },
  { panel: 'plantilla', texto: 'Plantilla' },
  { panel: 'clasificacion', texto: 'Clasificación' },
  { panel: 'informe', texto: 'Informe' },
  { panel: 'sede', texto: 'Elara y la sede' },
];

const BARRAS_POR_ESTADO: Record<string, number> = { disponible: 3, luto: 2, 'en mision': 3, herido: 1, muerto: 0 };

export class Interfaz {
  estado: EstadoJuego | null = cargar();
  private abierto: Panel | null = null;
  private misionId: string | null = null;
  private equipo = new Map<string, Posicion>();
  private heroeMercado: string | null = null;
  private gremioRival = 'alba';
  private mensaje = '';

  constructor(private readonly el: ElementosInterfaz) {
    el.panel.addEventListener('click', (e) => this.alHacerClic(e));
    el.panel.addEventListener('input', (e) => this.alCambiar(e));
    el.menu.addEventListener('click', (e) => this.alHacerClic(e));
    el.accion.addEventListener('click', (e) => this.alHacerClic(e));
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'Escape' && this.abierto && this.abierto !== 'nueva' && this.abierto !== 'fin') this.cerrar();
      const indice = Number(e.key) - 1;
      const atajo = MENU[indice];
      if (atajo && this.estado && !this.estado.fin && this.abierto !== 'nueva') {
        if (this.abierto === atajo.panel) this.cerrar();
        else this.abrir(atajo.panel);
      }
    });
    if (!this.estado) this.abrir('nueva');
    else if (this.estado.fin) this.abrir('fin');
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
    this.repintar();
  }

  /** Lugar de la sede 3D → panel. */
  abrirDesdeSede(punto: string): void {
    const destino: Record<string, Panel> = {
      tablon: 'misiones',
      mostrador: 'mercado',
      elara: 'sede',
      dormitorios: 'plantilla',
      pizarra: 'clasificacion',
      puerta: 'semana',
    };
    const panel = destino[punto];
    if (panel && this.estado) this.abrir(panel);
  }

  private repintar(): void {
    const estado = this.estado;
    const enJuego = !!estado && !estado.fin;
    this.pintarHud(estado);
    this.el.menu.hidden = !enJuego;
    this.el.accion.hidden = !enJuego;
    this.el.equipo.hidden = !estado;
    const sugerido = objetivoActual(estado).panel;
    this.el.menu.innerHTML = MENU.map(
      (m, i) =>
        `<button data-abrir="${m.panel}" class="${this.abierto === m.panel || (!this.abierto && sugerido === m.panel) ? 'activo' : ''}">${m.texto}<span class="tecla">${i + 1}</span></button>`,
    ).join('');

    if (!this.abierto) {
      this.el.panel.hidden = true;
      this.el.panel.innerHTML = '';
      return;
    }
    this.el.panel.hidden = false;
    const cerrable = this.abierto !== 'nueva' && this.abierto !== 'fin';
    this.el.panel.innerHTML = `
      <div class="panel-cabecera">
        <h2>${TITULOS[this.abierto]}</h2>
        ${cerrable ? '<button data-accion="cerrar" aria-label="Cerrar">✕</button>' : ''}
      </div>
      ${this.mensaje ? `<p class="mensaje">${esc(this.mensaje)}</p>` : ''}
      <div class="panel-cuerpo">${this.contenido()}</div>`;
  }

  /** Las cuatro esquinas: semana, objetivo, acción principal y plantilla. */
  private pintarHud(estado: EstadoJuego | null): void {
    if (!estado) {
      this.el.cabecera.innerHTML = '<div class="titulo"><svg class="emblema" viewBox="0 0 46 42" aria-hidden="true"><path d="M23 2 44 40H2Z" fill="none" stroke="#eceef0" stroke-width="2"/><path d="M23 14c4 6 7 9 7 14a7 7 0 0 1-14 0c0-3 2-5 3-7 1 3 2 4 4 4-2-4-1-8 0-11Z" fill="#eceef0"/></svg><div><div class="palabra">Gremio</div><div class="numero">D</div></div></div>';
    } else {
      const j = jugador(estado);
      this.el.cabecera.innerHTML = `
        <div class="titulo"><svg class="emblema" viewBox="0 0 46 42" aria-hidden="true"><path d="M23 2 44 40H2Z" fill="none" stroke="#eceef0" stroke-width="2"/><path d="M23 14c4 6 7 9 7 14a7 7 0 0 1-14 0c0-3 2-5 3-7 1 3 2 4 4 4-2-4-1-8 0-11Z" fill="#eceef0"/></svg><div><div class="palabra">Temporada ${estado.partida.temporada} · Semana</div><div class="numero">${estado.partida.temporada}-${estado.partida.semana}</div></div></div>
        <span class="lugar texto-contorno">${esc(j.nombre)} · Sede</span>
        <div class="datos">
          <span class="pastilla ${j.oro < 500 ? 'mal' : ''}">Oro <b>${num(j.oro)}</b></span>
          <span class="pastilla">Puesto <b>${puesto(estado, j.id)}.º</b></span>
          <span class="pastilla">Prestigio <b>${num(j.prestigio)}</b></span>
          <span class="pastilla">Deuda <b>${num(j.deuda)}</b></span>
        </div>`;
    }
    const o = objetivoActual(estado);
    this.el.objetivo.innerHTML = `
      <div class="cabeza"><span class="icono" aria-hidden="true"></span>objetivo</div>
      <div class="tarea">${esc(o.accion)} <em>${esc(o.meta)}</em></div>
      <div class="pista">${esc(o.pista)}</div>`;
    this.el.accion.innerHTML = `<button class="boton-principal" data-abrir="semana">Terminar semana<small>${estado ? `Semana ${estado.partida.semana} de 20` : ''}</small></button>`;
    this.el.equipo.innerHTML = estado
      ? heroesDe(estado, estado.jugadorId)
          .map((h) => {
            const llenas = BARRAS_POR_ESTADO[h.estado] ?? 3;
            const barras = [0, 1, 2].map((i) => `<i class="${i < llenas ? '' : 'vacia'}"></i>`).join('');
            const fuera = h.estado !== 'disponible' && h.estado !== 'luto';
            return `<div class="fila" title="${esc(`${h.nombre} · ${h.clase} · ${h.estado}`)}">
              <span class="nombre">${esc(h.nombre.split(' ')[0] ?? h.nombre)}${h.estado === 'en mision' ? ' · de misión' : h.estado === 'herido' ? ' · herido' : ''}</span>
              <span class="barras">${barras}</span>
              <span class="cara ${fuera ? 'fuera' : ''}">${esc(h.nombre.charAt(0))}</span>
            </div>`;
          })
          .join('')
      : '';
  }

  private contenido(): string {
    const estado = this.estado;
    if (this.abierto === 'nueva' || !estado) return this.panelNueva();
    switch (this.abierto) {
      case 'sede':
        return this.panelSede(estado);
      case 'plantilla':
        return this.panelPlantilla(estado);
      case 'misiones':
        return this.panelMisiones(estado);
      case 'mercado':
        return this.panelMercado(estado);
      case 'clasificacion':
        return this.panelClasificacion(estado);
      case 'informe':
        return this.panelInforme(estado);
      case 'semana':
        return this.panelSemana(estado);
      case 'fin':
        return this.panelFin(estado);
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  private panelNueva(): string {
    return `
      <p>El Cristal de Resonancia te ha marcado como rango D. Solo un gremio te ha querido: la Llama Menguante, con una única maga, Elara, y 40.000 de deuda. Prometiste llevarlo a lo más alto.</p>
      <label class="campo">Tu nombre <input id="nombre" maxlength="24" value="Aventurero" /></label>
      <label class="campo casilla"><input id="clemente" type="checkbox" /> Modo Clemente: los héroes no mueren, quedan gravemente heridos</label>
      <button data-accion="empezar" class="principal">Empezar la temporada 1</button>`;
  }

  private panelSede(estado: EstadoJuego): string {
    const j = jugador(estado);
    const consejos: string[] = [];
    const disponibles = heroesDe(estado, j.id).filter((h) => h.estado === 'disponible' || h.estado === 'luto');
    if (j.plantilla.length < 3) consejos.push('Necesitamos al menos tres héroes para salir de misión. Mira el mercado: los rangos D y C son baratos.');
    if (estado.partida.semana === 1) consejos.push('Esta semana está abierto el Draft. Al cerrar la semana, los demás gremios se llevarán a los candidatos que queden.');
    if (j.oro < 1000) consejos.push('Nos queda poco oro. Si cerramos tres semanas seguidas en números rojos, la Asociación nos quitará la licencia.');
    if (disponibles.length >= 3 && estado.tablon.length > 0) consejos.push('Hay héroes libres y misiones en el tablón. Cada semana sin misiones con éxito perdemos prestigio.');
    if (j.cierresNegativos > 0) consejos.push(`Llevamos ${j.cierresNegativos} cierre(s) en negativo. Vende a alguien o arriesga con una misión que pague bien.`);
    if (consejos.length === 0) consejos.push('Vamos bien. Sigue así y el resto de gremios empezará a tomarnos en serio.');
    return `<blockquote class="elara">${consejos.map((c) => `<p>${esc(c)}</p>`).join('')}</blockquote>
      <p class="tenue">Afinidad con Elara: ${estado.partida.afinidadElara} · Despertares: ${estado.partida.despertares}/5</p>
      <h3>Mejoras de la sede</h3>
      <table><thead><tr><th>Mejora</th><th>Efecto</th><th class="num">Coste</th><th></th></tr></thead><tbody>${infoMejoras(estado)
        .map(
          (m) => `<tr><td><strong>${esc(m.mejora)}</strong></td><td>${esc(m.efecto)}</td><td class="num">${num(m.coste)}</td>
            <td>${m.construida ? '<span class="tenue">Construida</span>' : `<button data-accion="construir" data-id="${esc(m.mejora)}" ${m.bloqueo ? `disabled title="${esc(m.bloqueo)}"` : ''}>Construir</button>`}</td></tr>`,
        )
        .join('')}</tbody></table>`;
  }

  private filaHeroe(estado: EstadoJuego, h: Heroe, extra = ''): string {
    const vinculos = h.vinculos
      .filter((v) => !v.oculto || estado.partida.despertares >= 1)
      .map((v) => {
        const otro = estado.heroes[v.con];
        return otro ? `<span title="${esc(`${v.tipo} con ${otro.nombre}`)}">${ICONO_VINCULO[v.tipo]}</span>` : '';
      })
      .join('');
    const potencial = h.potencialVisible ? ` <span class="tenue">(pot. ${h.potencial})</span>` : '';
    const s = h.stats;
    return `<tr>
      <td><strong>${esc(h.nombre)}</strong> ${vinculos}<div class="tenue">${esc(h.raza)} · ${esc(h.edad)} años${h.rasgos.length ? ' · ' + esc(h.rasgos.join(', ')) : ''}</div></td>
      <td><span class="rango r${h.rango}">${h.rango}</span>${potencial}</td>
      <td>${esc(h.clase)}<div class="tenue">${esc(h.elemento)}</div></td>
      <td class="num">${s.poder}/${s.defensa}/${s.magia}/${s.agilidad}<div class="tenue">suma ${sumaCombate(h)}</div></td>
      <td class="num">${s.moral}</td>
      <td>${esc(h.estado)}${h.semanasFuera ? ` (${h.semanasFuera} sem.)` : ''}</td>
      ${extra}
    </tr>`;
  }

  private panelPlantilla(estado: EstadoJuego): string {
    const j = jugador(estado);
    const filas = heroesDe(estado, j.id)
      .map((h) => {
        const enVenta = estado.enVenta.some((t) => t.heroeId === h.id);
        const cesion = (estado.cesiones ?? []).find((c) => c.heroeId === h.id);
        const accion =
          h.id === 'h_000_elara'
            ? '<td></td>'
            : cesion
              ? `<td>${num(h.contrato?.salario ?? 0)}<div class="tenue">Cedido por ${esc(estado.gremios[cesion.origenId]?.nombre ?? '')} hasta la semana ${cesion.semanaFin}</div></td>`
              : `<td>${num(h.contrato?.salario ?? 0)}<div>${
                enVenta
                  ? `<button data-accion="quitar-venta" data-id="${h.id}">Quitar de venta</button>`
                  : `<button data-accion="vender" data-id="${h.id}">Poner en venta (${num(valorMercado(h))})</button>`
              }</div></td>`;
        return this.filaHeroe(estado, h, accion);
      })
      .join('');
    const ofertas = estado.ofertas
      .map((o) => {
        const h = obtenerHeroe(estado, o.heroeId);
        const comprador = estado.gremios[o.compradorId]?.nombre ?? o.compradorId;
        return `<li>${esc(comprador)} ofrece <strong>${num(o.precio)}</strong> por ${esc(h.nombre)} (valor ${num(valorMercado(h))})
          <button data-accion="aceptar-oferta" data-id="${o.id}">Aceptar</button>
          <button data-accion="contraofertar" data-id="${o.id}" data-precio="${Math.round(o.precio * 1.15)}">Pedir ${num(Math.round(o.precio * 1.15))}</button></li>`;
      })
      .join('');
    const sobornos = (estado.sobornos ?? [])
      .map((s) => {
        const h = estado.heroes[s.heroeId];
        if (!h) return '';
        return `<li><strong>${esc(h.nombre)}</strong> se irá al Colmillo Carmesí al cierre de la semana ${s.semanaLimite} si no le subes el salario de ${num(h.contrato?.salario ?? 0)} a ${num(s.salarioPedido)}.
          <button data-accion="retener" data-id="${h.id}">Retener</button></li>`;
      })
      .join('');
    return `${sobornos ? `<div class="alerta"><h3>Intento de soborno</h3><ul class="lista">${sobornos}</ul></div>` : ''}
      <p class="tenue">${j.plantilla.length}/${j.plantillaMax} héroes · salarios ${num(salariosDe(estado, j.id))} por semana · stats Poder/Defensa/Magia/Agilidad</p>
      <table><thead><tr><th>Héroe</th><th>Rango</th><th>Clase</th><th>Stats</th><th>Moral</th><th>Estado</th><th>Salario</th></tr></thead><tbody>${filas}</tbody></table>
      <h3>Ofertas recibidas</h3>${ofertas ? `<ul class="lista">${ofertas}</ul>` : '<p class="tenue">Ninguna. Pon héroes en venta y los gremios harán ofertas al cerrar la semana.</p>'}`;
  }

  private panelMisiones(estado: EstadoJuego): string {
    const enCurso = estado.enCurso
      .filter((c) => c.gremioId === estado.jugadorId)
      .map((c) => `<li>Rango ${c.mision.rango} (${esc(c.mision.etiqueta)}) · vuelve al cierre de la semana ${c.semanaFin} · ${c.equipo.map((p) => esc(obtenerHeroe(estado, p.heroeId).nombre)).join(', ')}</li>`)
      .join('');
    const tarjetas = estado.tablon
      .map(
        (m) => `<button class="tarjeta ${this.misionId === m.id ? 'activo' : ''}" data-accion="elegir-mision" data-id="${m.id}">
          <span class="rango r${m.rango}">${m.rango}</span> ${esc(m.etiqueta)} · ${esc(m.elemento)}
          <div class="tenue">Poder ${num(m.poderRecomendado)} · ${m.duracion} sem. · ${num(m.recompensa.oro)} oro · +${m.recompensa.prestigio} prestigio</div>
        </button>`,
      )
      .join('');
    return `${enCurso ? `<h3>En curso</h3><ul class="lista">${enCurso}</ul>` : ''}
      <h3>Tablón (semana ${estado.partida.semana})</h3>
      <div class="tarjetas">${tarjetas || '<p class="tenue">No quedan misiones esta semana.</p>'}</div>
      ${this.formacion(estado)}`;
  }

  private formacion(estado: EstadoJuego): string {
    const mision = estado.tablon.find((m) => m.id === this.misionId);
    if (!mision) return '<p class="tenue">Elige una misión para formar el equipo.</p>';
    const disponibles = heroesDe(estado, estado.jugadorId).filter((h) => h.estado === 'disponible' || h.estado === 'luto');
    for (const id of [...this.equipo.keys()]) if (!disponibles.some((h) => h.id === id)) this.equipo.delete(id);
    const miembros: MiembroEquipo[] = [...this.equipo].map(([id, posicion]) => ({ heroe: obtenerHeroe(estado, id), posicion }));
    const j = jugador(estado);
    const vista = vistaPreviaMision(mision, miembros, {
      despertarII: estado.partida.despertares >= 2,
      enfermeria: j.mejoras.includes('Enfermeria'),
    });
    const riesgo = new Map(vista.riesgos.map((r) => [r.heroeId, r.riesgo]));
    const filas = disponibles
      .map((h) => {
        const pos = this.equipo.get(h.id) ?? '';
        const opciones = ['<option value="">— no va —</option>']
          .concat(POSICIONES.map((p) => `<option value="${p.valor}" ${pos === p.valor ? 'selected' : ''}>${p.nombre}${POSICION_NATURAL[h.clase] === p.valor ? ' ★' : ''}</option>`))
          .join('');
        const r = riesgo.get(h.id);
        return `<tr><td><strong>${esc(h.nombre)}</strong> <span class="rango r${h.rango}">${h.rango}</span><div class="tenue">${esc(h.clase)} · ${esc(h.elemento)}${h.estado === 'luto' ? ' · de luto' : ''}</div></td>
          <td><select data-accion="posicion" data-id="${h.id}">${opciones}</select></td>
          <td class="num">${r === undefined ? '' : `${r.toFixed(1)}%`}</td></tr>`;
      })
      .join('');
    const tam = this.equipo.size;
    const valido = tam >= 3 && tam <= 5;
    const modo = estado.partida.modoClemente ? ' (Modo Clemente: nadie muere)' : '';
    return `<h3>Formación: misión ${mision.rango} contra ${esc(mision.elemento)}</h3>
      <p class="tenue">★ = posición natural. Riesgo de muerte si la misión fracasa${modo}.</p>
      <table><thead><tr><th>Héroe</th><th>Posición</th><th>Riesgo</th></tr></thead><tbody>${filas}</tbody></table>
      <p class="resumen">Equipo ${tam}/5 · Poder ${num(Math.round(vista.poder))} de ${num(mision.poderRecomendado)} recomendado · <strong>Éxito ${pct(vista.probabilidad)}</strong></p>
      <button data-accion="enviar" class="principal" ${valido ? '' : 'disabled'}>${valido ? 'Enviar equipo' : 'Elige de 3 a 5 héroes'}</button>`;
  }

  private panelMercado(estado: EstadoJuego): string {
    const disponible = oroDisponibleParaPujar(estado);
    const filas = estado.mercado
      .map((e) => {
        const h = obtenerHeroe(estado, e.heroeId);
        const extra = `<td>${num(valorMercado(h))}<div class="tenue">pide ${num(salarioPedido(h.rango))}/sem.</div></td>
          <td>${e.draft ? '<span class="etiqueta-draft">Draft</span> ' : ''}<button data-accion="elegir-heroe" data-id="${h.id}">Pujar</button></td>`;
        return this.filaHeroe(estado, h, extra);
      })
      .join('');
    return `<p class="tenue">Puedes ofrecer hasta <strong>${num(disponible)}</strong> de oro de prima (tu oro menos 4 semanas de salarios).</p>
      ${this.formularioPuja(estado)}
      <table><thead><tr><th>Héroe</th><th>Rango</th><th>Clase</th><th>Stats</th><th>Moral</th><th>Estado</th><th>Valor</th><th></th></tr></thead><tbody>${filas}</tbody></table>
      ${this.otrosGremios(estado)}`;
  }

  private otrosGremios(estado: EstadoJuego): string {
    const rivales = Object.values(estado.gremios).filter((g) => !g.esJugador);
    const pestañas = rivales
      .map((g) => `<button data-accion="ver-gremio" data-id="${g.id}" class="${this.gremioRival === g.id ? 'activo' : ''}">${esc(g.nombre)}</button>`)
      .join(' ');
    const filas = heroesDe(estado, this.gremioRival)
      .sort((a, b) => sumaCombate(b) - sumaCombate(a))
      .map((h) => {
        const cesion = condicionesCesion(estado, h.id);
        const extra = `<td>${num(h.contrato?.clausula ?? 0)}<div class="tenue">cláusula</div></td>
          <td><button data-accion="clausula" data-id="${h.id}">Pagar cláusula</button>
          ${cesion.bloqueo ? '' : `<button data-accion="cesion" data-id="${h.id}">Cesión 4 sem. (${num(cesion.coste)})</button>`}</td>`;
        return this.filaHeroe(estado, h, extra);
      })
      .join('');
    return `<h3>Héroes de otros gremios</h3>
      <p class="tenue">Pagar la cláusula ficha al héroe si su puntuación con tu gremio llega a 60. En una cesión pagas su salario y su gremio se queda el 20% del oro de sus misiones. Nadie cede héroes de rango A o S (salvo el Alba si tu reputación es 70 o más).</p>
      <div class="fila">${pestañas}</div>
      <table><thead><tr><th>Héroe</th><th>Rango</th><th>Clase</th><th>Stats</th><th>Moral</th><th>Estado</th><th>Cláusula</th><th></th></tr></thead><tbody>${filas}</tbody></table>`;
  }

  private formularioPuja(estado: EstadoJuego): string {
    const entrada = estado.mercado.find((e) => e.heroeId === this.heroeMercado);
    if (!entrada) return '';
    const h = obtenerHeroe(estado, entrada.heroeId);
    const valor = valorMercado(h);
    const prima = Math.min(Math.round(valor * 1.1), oroDisponibleParaPujar(estado));
    const salario = salarioPedido(h.rango);
    return `<div class="puja" data-heroe="${h.id}">
      <h3>Puja por ${esc(h.nombre)} (${h.rango}, ${esc(h.clase)})</h3>
      <div class="fila">
        <label class="campo">Prima <input id="prima" type="number" min="0" step="50" value="${prima}" /></label>
        <label class="campo">Salario semanal <input id="salario" type="number" min="0" step="5" value="${salario}" /></label>
        <label class="campo">Temporadas <select id="duracion"><option>1</option><option selected>2</option><option>3</option></select></label>
      </div>
      <p id="desglose" class="resumen">${this.desglose(estado, h, prima, salario)}</p>
      <button data-accion="pujar" class="principal">Pujar (3 rondas a ciegas)</button>
    </div>`;
  }

  private desglose(estado: EstadoJuego, h: Heroe, prima: number, salario: number): string {
    const total = ofertaTotal({ prima, salario, duracion: 2 });
    const d = puntuacionOferta(total, valorMercado(h), contextoGremio(estado, estado.jugadorId, h), h.rasgos);
    if (!d.elegible) return 'Este héroe es Ambicioso: no ficha por gremios fuera del Top 3 con poco prestigio.';
    return `Tu puntuación: <strong>${num(d.total)}</strong> · dinero ${num(Math.round(d.D))} · prestigio ${num(d.P)} · reputación ${num(d.R)} · vínculos ${num(d.V)} · titular ${num(d.E)} · riesgo −${num(d.X)}`;
  }

  private panelClasificacion(estado: EstadoJuego): string {
    const filas = tabla(estado)
      .map((f) => {
        const g = estado.gremios[f.gremioId]!;
        return `<tr class="${g.esJugador ? 'propio' : ''}"><td>${f.puesto}.º</td><td>${esc(g.nombre)}</td><td class="num">${num(Math.round(f.puntos))}</td><td class="num">${num(g.puntosMisionTemporada)}</td><td class="num">${prestigioGanado(g) >= 0 ? '+' : ''}${num(prestigioGanado(g))}</td><td class="num">${num(g.prestigio)}</td><td class="num">${g.plantilla.length}</td></tr>`;
      })
      .join('');
    return `<table><thead><tr><th></th><th>Gremio</th><th>Puntos</th><th>Misiones</th><th>Prestigio ganado</th><th>Prestigio</th><th>Héroes</th></tr></thead><tbody>${filas}</tbody></table>
      <p class="tenue">Cada temporada es una carrera nueva: Puntos de Gremio = 3 × prestigio ganado en la temporada + puntos de misión (F 1 · D 2 · C 4 · B 7 · A 12 · S 20).</p>`;
  }

  private panelInforme(estado: EstadoJuego): string {
    const informes = estado.informes
      .map((i) => {
        const partes = i.partes
          .map((p) => `${esc(obtenerHeroe(estado, p.heroeId).nombre)}: ${esc(p.consecuencia)}${p.semanasFuera ? ` (${p.semanasFuera} sem.)` : ''}`)
          .join(' · ');
        return `<li><strong>${esc(i.resultado)}</strong> (éxito ${pct(i.probabilidad)}, tirada ${i.tirada}) · +${num(i.oro)} oro · ${i.prestigio >= 0 ? '+' : ''}${num(i.prestigio)} prestigio<div class="tenue">${partes}</div></li>`;
      })
      .join('');
    const eventos = estado.registro.map((e) => `<li>${esc(e.texto)}</li>`).join('');
    return `<h3>Misiones resueltas</h3>${informes ? `<ul class="lista">${informes}</ul>` : '<p class="tenue">Ninguna misión volvió en el último cierre.</p>'}
      <h3>Lo que ha pasado</h3>${eventos ? `<ul class="lista">${eventos}</ul>` : '<p class="tenue">Nada destacable en el último cierre.</p>'}`;
  }

  private panelSemana(estado: EstadoJuego): string {
    const j = jugador(estado);
    const gastos = gastosSemanales(j, salariosDe(estado, j.id), manutencionDe(estado, j.id)).total;
    const libres = heroesDe(estado, j.id).filter((h) => h.estado === 'disponible').length;
    return `<p>Al cerrar la semana se resuelven las misiones que vuelven, los rivales juegan su turno y se pagan unos <strong>${num(gastos)}</strong> de oro en gastos.</p>
      ${libres >= 3 && estado.tablon.length ? `<p class="aviso-texto">Tienes ${libres} héroes sin misión.</p>` : ''}
      <button data-accion="terminar" class="principal">Terminar la semana ${estado.partida.semana}</button>`;
  }

  private panelFin(estado: EstadoJuego): string {
    const j = jugador(estado);
    const texto =
      estado.fin === 'quiebra'
        ? 'La Asociación ha retirado la licencia de la Llama Menguante. Elara cierra la puerta de la sede en silencio.'
        : `Fin de la temporada 1. La Llama Menguante termina en el puesto ${puesto(estado, j.id)}.º con ${num(j.oro)} de oro y ${num(j.prestigio)} de prestigio.`;
    return `<p>${esc(texto)}</p><button data-accion="nueva" class="principal">Nueva partida</button>`;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  private alHacerClic(evento: Event): void {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-abrir]');
    if (!objetivo) return;
    const abrir = objetivo.dataset.abrir as Panel | undefined;
    if (abrir) {
      if (this.abierto === abrir) this.cerrar();
      else this.abrir(abrir);
      return;
    }
    const id = objetivo.dataset.id ?? '';
    try {
      this.ejecutar(objetivo.dataset.accion ?? '', id, objetivo);
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
      this.repintar();
    }
  }

  private ejecutar(accion: string, id: string, objetivo: HTMLElement): void {
    const estado = this.estado;
    switch (accion) {
      case 'cerrar':
        return this.cerrar();
      case 'empezar': {
        const nombre = (document.querySelector<HTMLInputElement>('#nombre')?.value ?? '').trim() || 'Aventurero';
        const modoClemente = document.querySelector<HTMLInputElement>('#clemente')?.checked ?? false;
        this.estado = crearPartida({ nombre, modoClemente });
        return this.tras('sede');
      }
      case 'nueva':
        borrar();
        this.estado = null;
        return this.abrir('nueva');
    }
    if (!estado) return;
    switch (accion) {
      case 'elegir-mision':
        this.misionId = id;
        this.equipo.clear();
        return this.repintar();
      case 'enviar':
        if (!this.misionId) return;
        enviarMision(estado, this.misionId, [...this.equipo].map(([heroeId, posicion]) => ({ heroeId, posicion })));
        this.misionId = null;
        this.equipo.clear();
        this.mensaje = 'Equipo enviado. Volverá al cierre de la semana en que termine la misión.';
        return this.tras('misiones', false);
      case 'elegir-heroe':
        this.heroeMercado = id;
        return this.repintar();
      case 'pujar': {
        if (!this.heroeMercado) return;
        const leer = (sel: string): number => Number(document.querySelector<HTMLInputElement>(sel)?.value ?? 0);
        const oferta = { prima: Math.max(0, Math.round(leer('#prima'))), salario: Math.max(0, Math.round(leer('#salario'))), duracion: leer('#duracion') || 2 };
        const h = obtenerHeroe(estado, this.heroeMercado);
        const r = pujarPorHeroe(estado, this.heroeMercado, [oferta]);
        const rivales = new Set(r.subasta.rondas.flat().map((p) => p.gremioId).filter((g) => g !== estado.jugadorId)).size;
        const ganador = r.subasta.ganador ? estado.gremios[r.subasta.ganador]?.nombre : null;
        this.mensaje = r.fichado
          ? `${h.nombre} se une a la Llama Menguante (${r.subasta.rondas.length} ronda(s), ${rivales} rival(es)).`
          : ganador
            ? `${h.nombre} ha elegido ${ganador}.`
            : `${h.nombre} no ha aceptado ninguna oferta.`;
        this.heroeMercado = null;
        return this.tras('mercado', false);
      }
      case 'vender': {
        const h = obtenerHeroe(estado, id);
        ponerEnVenta(estado, id, valorMercado(h));
        this.mensaje = `${h.nombre} está en venta. Las ofertas llegan al cerrar la semana.`;
        return this.tras('plantilla', false);
      }
      case 'quitar-venta':
        quitarDeVenta(estado, id);
        return this.tras('plantilla');
      case 'aceptar-oferta': {
        const r = conAzar(estado, (azar) => aceptarOferta(estado, azar, id));
        this.mensaje = r === 'vendido' ? 'Venta cerrada.' : r === 'se niega' ? 'El héroe se niega a irse a ese gremio.' : 'El comprador ya no tiene fondos.';
        return this.tras('plantilla', false);
      }
      case 'contraofertar': {
        const precio = Number(objetivo.dataset.precio ?? 0);
        const r = conAzar(estado, (azar) => contraofertar(estado, azar, id, precio));
        this.mensaje = r === 'aceptada' ? `Aceptan pagar ${num(precio)}. Ahora puedes cerrar la venta.` : r === 'retirada' ? 'El gremio se ha retirado.' : 'Rechazan la contraoferta.';
        return this.tras('plantilla', false);
      }
      case 'construir':
        construirMejora(estado, id as Mejora);
        this.mensaje = `Construida: ${id}.`;
        return this.tras('sede', false);
      case 'retener': {
        retenerHeroe(estado, id);
        this.mensaje = `${obtenerHeroe(estado, id).nombre} se queda en el gremio.`;
        return this.tras('plantilla', false);
      }
      case 'ver-gremio':
        this.gremioRival = id;
        return this.repintar();
      case 'clausula': {
        const h = obtenerHeroe(estado, id);
        const r = pagarClausula(estado, id);
        this.mensaje = r === 'fichado' ? `${h.nombre} se une a la Llama Menguante.` : `${h.nombre} rechaza venir aunque pagues su cláusula. No se ha cobrado nada.`;
        return this.tras('mercado', false);
      }
      case 'cesion': {
        const h = obtenerHeroe(estado, id);
        pedirCesion(estado, id, 4);
        this.mensaje = `${h.nombre} juega cedido con el gremio durante 4 semanas.`;
        return this.tras('mercado', false);
      }
      case 'terminar': {
        const resumen = terminarSemana(estado);
        this.misionId = null;
        this.equipo.clear();
        this.heroeMercado = null;
        this.mensaje = `Semana ${resumen.semana} cerrada: patrocinio +${num(resumen.cierre.ingresoPatrocinio)}, gastos −${num(resumen.cierre.gastos.total)}.`;
        return this.tras(estado.fin ? 'fin' : 'informe', false);
      }
    }
  }

  private alCambiar(evento: Event): void {
    const el = evento.target as HTMLElement;
    const estado = this.estado;
    if (!estado) return;
    if (el instanceof HTMLSelectElement && el.dataset.accion === 'posicion') {
      const id = el.dataset.id ?? '';
      if (el.value) {
        if (!this.equipo.has(id) && this.equipo.size >= 5) {
          this.mensaje = 'Un equipo tiene como máximo 5 héroes.';
        } else {
          this.equipo.set(id, el.value as Posicion);
        }
      } else {
        this.equipo.delete(id);
      }
      this.repintar();
      return;
    }
    if (el.id === 'prima' || el.id === 'salario') {
      const h = this.heroeMercado ? estado.heroes[this.heroeMercado] : undefined;
      const destino = document.querySelector('#desglose');
      if (h && destino) {
        const prima = Number(document.querySelector<HTMLInputElement>('#prima')?.value ?? 0);
        const salario = Number(document.querySelector<HTMLInputElement>('#salario')?.value ?? 0);
        destino.innerHTML = this.desglose(estado, h, prima, salario);
      }
    }
  }

  /** Guarda, abre el panel indicado y repinta. */
  private tras(panel: Panel, limpiarMensaje = true): void {
    if (this.estado) guardar(this.estado);
    const mensaje = this.mensaje;
    this.abrir(panel);
    if (!limpiarMensaje) {
      this.mensaje = mensaje;
      this.repintar();
    }
  }
}

/** Ejecuta una acción de venta con el generador de la partida y guarda su nuevo estado. */
function conAzar<T>(estado: EstadoJuego, f: (azar: Azar) => T): T {
  const azar = new Azar(estado.azar);
  const r = f(azar);
  estado.azar = azar.obtenerEstado();
  return r;
}
