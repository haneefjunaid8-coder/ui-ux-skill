import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Preview/deployment note: bind 0.0.0.0 so the sandbox preview proxy can reach
// the dev server; allow the e2b.app preview host. ROOT-X app runs on 5173.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: ['.e2b.app', 'localhost'],
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
});
