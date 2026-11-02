import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The workspace can be installed as an app. The service worker keeps the shell and every page the visitor has
    // opened, so it still opens offline; the API calls (realtime, RAG, AI) are never cached.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hank62 Private OS',
        short_name: 'Hank62',
        description: 'A private workspace: AI agents, music, notes and a studio.',
        start_url: '/spacehank',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['productivity', 'utilities'],
        // long-press the app icon to jump straight to a tab
        shortcuts: [
          { name: 'Hank RAG', short_name: 'Hank', url: '/spacehank?tab=rag' },
          { name: 'Second Brain', short_name: 'Notes', url: '/spacehank?tab=notes' },
          { name: 'Wallet', short_name: 'Wallet', url: '/spacehank?tab=wallet' },
          { name: 'Hank Music', short_name: 'Music', url: '/spacehank?tab=music' },
        ],
        background_color: '#0b0c0e',
        theme_color: '#0b0c0e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // the app's own code is precached, so the first install already works offline; the synthetic XR rooms and the
        // headset emulator (several MB, never loaded for a visitor) are left out
        // (the manifest's icons are added to the precache by the plugin itself, so they are not listed here)
        globPatterns: ['**/*.{html,css,js,svg,woff2}', 'icons/apple-touch-icon.png'],
        globIgnores: ['assets/{music_room,living_room,office_large,meeting_room,emulate}-*.js'],
        maximumFileSizeToCacheInBytes: 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(sitemap\.xml|robots\.txt)$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          { urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/(images|models)\//.test(url.pathname), handler: 'CacheFirst', options: { cacheName: 'media', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts', expiration: { maxEntries: 30 } } },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.mjs'],
  },
})
