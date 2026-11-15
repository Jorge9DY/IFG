// Mide cuánto actúa el sistema social en partidas completas del bot ambicioso: hechos por partida y
// relaciones al final. Uso: npx tsx herramientas/auditoria/social.ts [partidas]
import { crearPartida, finalizarDia, terminarPrueba } from '../../src/motor/partida';
import { AMBICIOSA, jugarDia, jugarPrueba, metricasVacias } from '../simulador/bot';

const n = Number(process.argv[2] ?? 10);
const hechos: Record<string, number> = {};
let malas = 0;
let parejas = 0;
for (let s = 1; s <= n; s++) {
  const estado = crearPartida({ semilla: s });
  const m = metricasVacias();
  while (estado.fase !== 'victoria') {
    jugarDia(estado, AMBICIOSA, m);
    if (finalizarDia(estado).prueba) {
      jugarPrueba(estado, AMBICIOSA, m);
      terminarPrueba(estado);
    }
  }
  for (const mm of estado.social.memorias) hechos[mm.tipo] = (hechos[mm.tipo] ?? 0) + 1;
  for (const c of estado.caidos) if (c.causa === 'segador') hechos['(muerte por Segador)'] = (hechos['(muerte por Segador)'] ?? 0) + 1;
  for (const r of Object.values(estado.relaciones)) {
    if (r.afinidad <= -20) malas++;
    if (r.pareja === 'pareja') parejas++;
  }
}
const media = (v: number): string => (v / n).toFixed(1);
console.log(`Partidas: ${n}. Hechos por partida (memoria social, todas las memorias guardadas):`);
for (const [k, v] of Object.entries(hechos).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${media(v)}`);
console.log(`Relaciones malas al final: ${media(malas)} · parejas: ${media(parejas)}`);
