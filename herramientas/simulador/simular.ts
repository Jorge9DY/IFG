// Simulador de balance: juega N temporadas con el jugador automático y resume las métricas.
// Uso: npm run simular -- [temporadas] [semillaInicial]

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jugador, puesto, type EstadoJuego } from '../../src/motor/estado';
import { crearPartida, terminarDia } from '../../src/motor/partida';
import { ESTRATEGIA_ARRIESGADA, ESTRATEGIA_BASE, jugarDia, type Estrategia, type MetricasBot } from './bot';

export interface ResultadoTemporada {
  semilla: number;
  quiebra: boolean;
  semanaFin: number;
  puestoFinal: number;
  oroFinal: number;
  prestigioFinal: number;
  muertes: number;
  semanasOroBajo: number;
  fichajes: number;
  ventas: number;
  exitos: number;
  misiones: number;
}

export function simularTemporada(semilla: number, estrategia: Estrategia = ESTRATEGIA_BASE, modoClemente = false): ResultadoTemporada {
  const estado: EstadoJuego = crearPartida({ nombre: 'Bot', semilla, modoClemente });
  const m: MetricasBot = { pujas: 0, fichajes: 0, ventas: 0 };
  let semanasOroBajo = 0;
  let misiones = 0;
  let exitos = 0;
  while (!estado.fin) {
    jugarDia(estado, estrategia, m);
    const resumen = terminarDia(estado);
    misiones += resumen.informes.length;
    exitos += resumen.informes.filter((i) => i.resultado === 'exito').length;
    if (resumen.cierre && jugador(estado).oro < 500) semanasOroBajo++;
  }
  const j = jugador(estado);
  return {
    semilla,
    quiebra: estado.fin === 'quiebra',
    semanaFin: Math.ceil(estado.partida.dia / 7),
    puestoFinal: puesto(estado, j.id),
    oroFinal: j.oro,
    prestigioFinal: j.prestigio,
    muertes: estado.muertesTemporada[j.id] ?? 0,
    semanasOroBajo,
    fichajes: m.fichajes,
    ventas: m.ventas,
    exitos,
    misiones,
  };
}

const media = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (n: number, total: number): string => `${((100 * n) / Math.max(1, total)).toFixed(1)}%`;
const f1 = (n: number): string => n.toFixed(1);

export function informe(resultados: ResultadoTemporada[], titulo: string, descripcion: string): string {
  const n = resultados.length;
  const quiebras = resultados.filter((r) => r.quiebra);
  const completas = resultados.filter((r) => !r.quiebra);
  const puestos = [1, 2, 3, 4, 5].map((p) => completas.filter((r) => r.puestoFinal === p).length);
  const filas: [string, string, string][] = [
    ['Quiebras en la temporada 1', pct(quiebras.length, n), '10–25%'],
    ['Semana media de la quiebra', quiebras.length ? f1(media(quiebras.map((r) => r.semanaFin))) : '—', '—'],
    ['Muertes por temporada', f1(media(resultados.map((r) => r.muertes))), '0,3–1'],
    ['Puesto medio al final (sin quiebra)', completas.length ? f1(media(completas.map((r) => r.puestoFinal))) : '—', '4.º–5.º'],
    ['Semanas con oro por debajo de 500', f1(media(resultados.map((r) => r.semanasOroBajo))), '≥ 3'],
    ['Fichajes ganados', f1(media(resultados.map((r) => r.fichajes))), '3–6'],
    ['Misiones resueltas', f1(media(resultados.map((r) => r.misiones))), '—'],
    ['Tasa de éxito en misiones', pct(resultados.reduce((t, r) => t + r.exitos, 0), resultados.reduce((t, r) => t + r.misiones, 0)), '—'],
    ['Oro final medio (sin quiebra)', completas.length ? Math.round(media(completas.map((r) => r.oroFinal))).toString() : '—', '—'],
    ['Prestigio final medio', f1(media(resultados.map((r) => r.prestigioFinal))), '—'],
  ];
  return [
    `# ${titulo}`,
    '',
    `${n} temporadas simuladas. ${descripcion}`,
    '',
    '| Métrica | Resultado | Objetivo |',
    '| --- | --- | --- |',
    ...filas.map((f) => `| ${f.join(' | ')} |`),
    '',
    `Puestos finales (sin quiebra): ${puestos.map((c, i) => `${i + 1}.º ${c}`).join(' · ')}`,
    '',
  ].join('\n');
}

function principal(): void {
  const total = Number(process.argv[2] ?? 1000);
  const semillaInicial = Number(process.argv[3] ?? 1);
  const correr = (e: Estrategia): ResultadoTemporada[] =>
    Array.from({ length: total }, (_, i) => simularTemporada(semillaInicial + i, e));
  const texto = [
    informe(correr(ESTRATEGIA_BASE), 'Jugador prudente', 'Solo envía equipos con al menos un 70% de éxito.'),
    informe(correr(ESTRATEGIA_ARRIESGADA), 'Jugador arriesgado', 'Envía equipos con al menos un 55% de éxito y paga más por fichar.'),
  ].join('\n');
  console.log(texto);
  const carpeta = join(dirname(fileURLToPath(import.meta.url)), 'informes');
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, 'ultimo.md'), texto);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
