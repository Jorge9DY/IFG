// Diagnóstico temporal: rama dominante y origen del oro del jugador automático.
import { crearPartida, finalizarDia, terminarPrueba } from '../../src/motor/partida';
import { AMBICIOSA, COMERCIANTE, PRUDENTE, jugarDia, jugarPrueba, metricasVacias } from './bot';
for (const e of [PRUDENTE, COMERCIANTE, AMBICIOSA]) {
  const dom: Record<string, number> = {};
  let oroMisiones = 0, oroEst = 0, completadas = 0;
  for (let s = 1; s <= 100; s++) {
    const est = crearPartida({ semilla: s });
    const m = metricasVacias();
    while (est.dia <= 112 && est.fase !== 'victoria') {
      jugarDia(est, e, m);
      const r = finalizarDia(est);
      oroMisiones += r.informes.reduce((t, i) => t + i.oro, 0);
      oroEst += r.produccion.reduce((t, p) => t + p.oro, 0);
      if (r.prueba) { jugarPrueba(est, e, m); terminarPrueba(est); }
    }
    dom[est.desarrollo.dominante ?? 'ninguna'] = (dom[est.desarrollo.dominante ?? 'ninguna'] ?? 0) + 1;
    completadas += est.investigacion.completadas.length;
  }
  console.log(e.nombre, 'dominante:', dom, 'oro misiones/establecimientos:', Math.round(oroMisiones / 100), Math.round(oroEst / 100), 'investigaciones:', completadas / 100);
}
