/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'ROOT-X Deliveries',
        short_name: 'ROOT-X',
        description: 'Deliveries within UNIOSUN and approved student-township areas.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f5ef',
        theme_color: '#0f4c3a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
      // The service worker is only generated for production builds, so the dev server is unaffected.
      devOptions: { enabled: false },
    }),
  ],
  // Allow the sandbox live-preview hosts (*.e2b.app) for the dev and preview servers.
  server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
