import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* Single-file build → ONE self-contained HTML file (ROOT-X.html).
 * The engine runs in the tab (standalone demo mode, localStorage persistence)
 * — no server needed. The product build (vite.config.ts) is unchanged. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { __ROOTX_STANDALONE__: 'true' },
  base: './',
  build: {
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000, // inline fonts/icons as data URIs
    chunkSizeWarningLimit: 5000,
  },
});
