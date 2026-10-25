import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/ui/',
  plugins: [tailwindcss()],
  esbuild: { jsx: 'automatic' },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
});
