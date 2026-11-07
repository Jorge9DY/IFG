// Análisis semana a semana (herramienta temporal de diagnóstico).
import { sueldosDe } from '../../src/motor/economia';
import { heroesDe, jugador, puesto } from '../../src/motor/estado';
import { alLimite } from '../../src/motor/heroes';
import { crearPartida, finalizarDia, terminarPrueba } from '../../src/motor/partida';
import { calcularRanking, fuerza, prestigio } from '../../src/motor/ranking';
import { categoria } from '../../src/motor/categorias';
import { AMBICIOSA, PRUDENTE, jugarDia, jugarPrueba, metricasVacias } from './bot';
const e = process.argv[2] === 'p' ? PRUDENTE : AMBICIOSA;
const N = 150, S = 16;
const acc = Array.from({ length: S }, () => ({ puesto: 0, f: 0, p: 0, hueco: 0, oro: 0, sueldos: 0, ingresos: 0, limite: 0, plantilla: 0, cat: 0, fuerzaPrimero: 0, presPrimero: 0, n: 0 }));
for (let s = 1; s <= N; s++) {
  const est = crearPartida({ semilla: s });
  const m = metricasVacias();
  let semana = 0, ingresos = 0;
  while (semana < S && est.fase !== 'victoria') {
    jugarDia(est, e, m);
    const r = finalizarDia(est);
    ingresos += r.informes.reduce((t, i) => t + i.oro, 0);
    if (r.prueba) {
      jugarPrueba(est, e, m);
      terminarPrueba(est);
      const j = jugador(est), a = acc[semana]!;
      const rk = calcularRanking(est);
      const hs = heroesDe(est, j.id);
      a.puesto += puesto(est, j.id); a.f += fuerza(est, j.id); a.p += prestigio(j);
      a.hueco += rk[0]!.puntos - rk.find((x) => x.gremioId === j.id)!.puntos;
      a.fuerzaPrimero += rk[0]!.fuerza; a.presPrimero += rk[0]!.prestigio;
      a.oro += j.oro; a.sueldos += sueldosDe(est, j.id); a.ingresos += ingresos; ingresos = 0;
      a.limite += hs.filter(alLimite).length / Math.max(1, hs.length); a.plantilla += hs.length;
      a.cat += 'DCBAS'.indexOf(categoria(j)); a.n++;
      semana++;
    }
  }
}
console.log('sem | puesto | fuerza(1º) | prestigio(1º) | hueco | oro | ingresos/sem | sueldos/sem | %al límite | plantilla | categoría');
acc.forEach((a, i) => { const d = (x: number) => Math.round(x / Math.max(1, a.n));
  console.log(`${i + 1} | ${(a.puesto / a.n).toFixed(1)} | ${d(a.f)} (${d(a.fuerzaPrimero)}) | ${d(a.p)} (${d(a.presPrimero)}) | ${d(a.hueco)} | ${d(a.oro)} | ${d(a.ingresos)} | ${d(a.sueldos)} | ${Math.round(100 * a.limite / a.n)}% | ${(a.plantilla / a.n).toFixed(1)} | ${'DCBAS'[d(a.cat)]} (n=${a.n})`); });
