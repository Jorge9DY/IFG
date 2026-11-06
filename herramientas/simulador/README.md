# Simulador de balance

Juega temporadas completas con un jugador automático y resume las métricas de balance.

```bash
npm run simular -- 1000 1
```

Argumentos: número de temporadas y semilla inicial. El informe se imprime y se guarda en `herramientas/simulador/informes/ultimo.md` (no se sube al repositorio). El último informe revisado está en `docs/informe-balance.md`.

- `bot.ts`: estrategias del jugador automático (prudente y arriesgada).
- `simular.ts`: bucle de simulación e informe.
