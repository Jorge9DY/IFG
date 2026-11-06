import { defineConfig } from 'vitest/config';

// En GitHub Pages el juego se sirve desde /<repositorio>/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ifg/' : '/',
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
