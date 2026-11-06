// Simulador de balance: juega N partidas (hasta 4 temporadas o la victoria) con el jugador automático.
// Uso: npm run simular -- [partidas] [semillaInicial]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import balance from '../../src/datos/balance.json';
import { jugador, type EstadoJuego } from '../../src/motor/estado';
import { crearPartida, finalizarDia, terminarPrueba } from '../../src/motor/partida';
import { fuerza } from '../../src/motor/ranking';
import { AMBICIOSA, PRUDENTE, jugarDia, jugarPrueba, metricasVacias, type Estrategia, type MetricasBot } from './bot';

const TEMPORADAS = 4;

export interface ResultadoPartida {
  semilla: number;
  /** Puesto al cerrar cada temporada jugada. */
  puestos: number[];
  /** Temporada en la que gana, o null. */
  victoria: number | null;
  /** Semanas en las que no pudo pagar los sueldos. */
  impagos: number;
  /** Semanas que cerró con menos de 1.000 de oro tras pagar sueldos. */
  semanasApuradas: number;
  oroFinal: number;
  fuerzaFinal: number;
  plantillaFinal: number;
  metricas: MetricasBot;
}

export function simularPartida(semilla: number, e: Estrategia): ResultadoPartida {
  const estado: EstadoJuego = crearPartida({ semilla });
  const m = metricasVacias();
  const r: ResultadoPartida = { semilla, puestos: [], victoria: null, impagos: 0, semanasApuradas: 0, oroFinal: 0, fuerzaFinal: 0, plantillaFinal: 0, metricas: m };
  const ultimoDia = TEMPORADAS * balance.calendario.diasPorTemporada;
  while (estado.fase !== 'victoria' && estado.dia <= ultimoDia) {
    jugarDia(estado, e, m);
    const resumen = finalizarDia(estado);
    m.exitos += resumen.informes.filter((i) => i.exito).length;
    if (resumen.sueldos) {
      if (!resumen.sueldos.completo) r.impagos++;
      if (jugador(estado).oro < 1000) r.semanasApuradas++;
    }
    if (resumen.prueba) {
      jugarPrueba(estado, e, m);
      const semana = terminarPrueba(estado);
      if (semana.temporada) r.puestos.push(semana.temporada.puesto);
      if (semana.victoria) r.victoria = semana.temporada?.numero ?? null;
    }
  }
  const j = jugador(estado);
  r.oroFinal = j.oro;
  r.fuerzaFinal = fuerza(estado, j.id);
  r.plantillaFinal = j.plantilla.length;
  return r;
}

const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (n: number, total: number): string => `${((100 * n) / Math.max(1, total)).toFixed(0)}%`;
const f1 = (n: number): string => n.toFixed(1);

export function informe(resultados: ResultadoPartida[], e: Estrategia): string {
  const n = resultados.length;
  const filas: [string, string][] = [];
  for (let t = 1; t <= TEMPORADAS; t++) {
    const llegan = resultados.filter((r) => r.puestos.length >= t);
    const ganadas = resultados.filter((r) => r.victoria === t).length;
    filas.push([`Temporada ${t}: puesto medio al cerrar`, llegan.length ? f1(media(llegan.map((r) => r.puestos[t - 1] ?? 5))) : '—']);
    filas.push([`Temporada ${t}: partidas ganadas`, pct(ganadas, n)]);
  }
  const ganadas = resultados.filter((r) => r.victoria !== null).length;
  const m = (f: (x: MetricasBot) => number): string => f1(media(resultados.map((r) => f(r.metricas))));
  filas.push(
    [`Victoria en ${TEMPORADAS} temporadas o menos`, pct(ganadas, n)],
    ['Semanas con sueldos impagados (media)', f1(media(resultados.map((r) => r.impagos)))],
    ['Semanas con menos de 1.000 de oro tras sueldos', f1(media(resultados.map((r) => r.semanasApuradas)))],
    ['Misiones lanzadas', m((x) => x.misiones)],
    ['Tasa de éxito', pct(media(resultados.map((r) => r.metricas.exitos)), media(resultados.map((r) => r.metricas.misiones)))],
    ['Novatos fichados', m((x) => x.fichajesNovatos)],
    ['Reclutas', m((x) => x.reclutas)],
    ['Ventas', m((x) => x.ventas)],
    ['Compras en el mercado', m((x) => x.compras)],
    ['Mejoras de instalaciones', m((x) => x.mejoras)],
    ['Oro final', Math.round(media(resultados.map((r) => r.oroFinal))).toString()],
    ['Fuerza final (top 5)', f1(media(resultados.map((r) => r.fuerzaFinal)))],
    ['Plantilla final', f1(media(resultados.map((r) => r.plantillaFinal)))],
  );
  return [`### Estrategia ${e.nombre} (${n} partidas)`, '', '| Métrica | Valor |', '| --- | --: |', ...filas.map(([a, b]) => `| ${a} | ${b} |`), ''].join('\n');
}

function principal(): void {
  const partidas = Number(process.argv[2] ?? 300);
  const semilla = Number(process.argv[3] ?? 1);
  const textos = [PRUDENTE, AMBICIOSA].map((e) => {
    const resultados = Array.from({ length: partidas }, (_, i) => simularPartida(semilla + i, e));
    return informe(resultados, e);
  });
  const texto = `# Informe del simulador\n\n${partidas} partidas por estrategia, semillas ${semilla}–${semilla + partidas - 1}, hasta ${TEMPORADAS} temporadas.\n\n${textos.join('\n')}`;
  console.log(texto);
  const ruta = join(dirname(fileURLToPath(import.meta.url)), 'informes', 'ultimo.md');
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, texto);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
