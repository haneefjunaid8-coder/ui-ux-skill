import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Preview/deployment note: bind to 0.0.0.0 so the sandbox preview proxy can reach the dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // allow the sandbox preview proxy host (e2b.app) so the live preview loads
    allowedHosts: ['.e2b.app', 'localhost'],
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
