import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the API runs separately (`npm run dev:server`).
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
