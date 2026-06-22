/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'logo_small.png', 'logo_tiny.png'],
      manifest: {
        name: 'Trust Home Services',
        short_name: 'TrustHome',
        description: 'Premium home repair & maintenance services — plumbing, electrical, AC and more.',
        theme_color: '#4f46e5',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Emergency SOS',
            short_name: 'SOS',
            description: 'Request urgent same-day repair',
            url: '/login',
          },
          {
            name: 'Book a Service',
            short_name: 'Book',
            description: 'Browse services and book',
            url: '/login',
          },
        ],
      },
    }),
    process.env.ANALYZE ? visualizer({ open: true, gzipSize: true, brotliSize: true }) : null,
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/html2canvas')) return 'vendor-html2canvas';
          if (id.includes('node_modules/dompurify')) return 'vendor-sanitize';
          if (id.includes('node_modules')) return 'vendor-other';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
