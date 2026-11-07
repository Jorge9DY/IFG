import { describe, expect, it } from 'vitest';
import { retrato } from '../src/ui/retrato';

describe('retratos provisionales', () => {
  it('el mismo héroe tiene siempre la misma cara, y héroes distintos suelen diferir', () => {
    expect(retrato({ id: 'h_1', clase: 'Mago' })).toBe(retrato({ id: 'h_1', clase: 'Mago' }));
    const caras = new Set(Array.from({ length: 30 }, (_, i) => retrato({ id: `h_${i}`, clase: 'Guerrero' })));
    expect(caras.size).toBeGreaterThan(20);
  });

  it('es un SVG con el color de su clase', () => {
    const svg = retrato({ id: 'h_7', clase: 'Sanador' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('#3fb8c8');
  });
});
