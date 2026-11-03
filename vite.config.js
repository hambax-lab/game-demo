import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Phaser сам по себе весит ~1.2 МБ, предупреждение о размере тут не нужно.
  build: { chunkSizeWarningLimit: 2000 },
});
