import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el build funciona en cualquier hosting estático (Netlify, Cloudflare Pages, GitHub Pages...).
  base: './',
  build: { chunkSizeWarningLimit: 800 },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
