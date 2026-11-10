import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve, extname } from 'path'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

// Songs dropped into src/assets/music ship with the app. Their file names can hold anything (spaces, accents, "#", brackets),
// so they are not imported as modules: a virtual module lists the names, and the files are served at /music/<name>
// (by a middleware in dev, copied into the build otherwise) and fetched by the encoded name.
const MUSIC_DIR = resolve(__dirname, 'src/assets/music')
const MUSIC_FILE = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|webm|lrc)$/i
const MUSIC_TYPE = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', wav: 'audio/wav', webm: 'audio/webm', lrc: 'text/plain; charset=utf-8' }
const musicFiles = () => (existsSync(MUSIC_DIR) ? readdirSync(MUSIC_DIR).filter((name) => MUSIC_FILE.test(name)).sort() : [])

const bundledMusic = () => ({
  name: 'bundled-music',
  resolveId: (id) => (id === 'virtual:bundled-music' ? '\0virtual:bundled-music' : undefined),
  load: (id) => (id === '\0virtual:bundled-music' ? `export default ${JSON.stringify(musicFiles())}` : undefined),
  configureServer(server) {
    // a song added to (or removed from) the folder while `npm run dev` runs: refresh the list and reload the page
    server.watcher.add(MUSIC_DIR)
    const relist = (file) => {
      if (!file.startsWith(MUSIC_DIR) || !MUSIC_FILE.test(file)) return
      const mod = server.moduleGraph.getModuleById('\0virtual:bundled-music')
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    }
    server.watcher.on('add', relist).on('unlink', relist)
    server.middlewares.use('/music', (req, res, next) => {
      const name = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, ''))
      const file = resolve(MUSIC_DIR, name)
      if (!file.startsWith(MUSIC_DIR) || !MUSIC_FILE.test(file) || !existsSync(file) || !statSync(file).isFile()) return next()
      res.setHeader('Content-Type', MUSIC_TYPE[extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream')
      res.end(readFileSync(file))
    })
  },
  generateBundle() {
    for (const name of musicFiles()) this.emitFile({ type: 'asset', fileName: `music/${name}`, source: readFileSync(resolve(MUSIC_DIR, name)) })
  },
})

// The newest entry of public/changelog.json when this copy is built: it is how the app knows which changes it already has, so a
// newer copy can say what is new (see src/shared/lib/appUpdate.js).
const latestChange = (() => {
  try {
    return JSON.parse(readFileSync(resolve(__dirname, 'public/changelog.json'), 'utf8'))[0]?.id ?? ''
  } catch {
    return ''
  }
})()

export default defineConfig({
  define: { 'import.meta.env.VITE_LATEST_CHANGE': JSON.stringify(latestChange) },
  // Listen on IPv4. Vite's default ("localhost") can mean IPv6 only on Windows, and then a phone plugged in with
  // `adb reverse tcp:5173 tcp:5173` (which reaches 127.0.0.1) gets an empty response.
  server: { host: '127.0.0.1' },
  plugins: [
    react(),
    bundledMusic(),
    tailwindcss(),
    // The workspace can be installed as an app. The service worker keeps the shell and every page the visitor has
    // opened, so it still opens offline; the API calls (realtime, RAG, AI) are never cached.
    VitePWA({
      // a new version waits until the visitor taps "Update" (see src/shared/lib/appUpdate.js); registration is done there, not injected
      registerType: 'prompt',
      injectRegister: false,
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
        // "Share" in another app lists Hank62: what is shared is caught by the service worker (public/sw-focus.js) and offered
        // to Second Brain or Image Studio (src/spacehank/share)
        share_target: {
          action: '/spacehank/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { title: 'title', text: 'text', url: 'url', files: [{ name: 'media', accept: ['image/*'] }] },
        },
        background_color: '#0b0c0e',
        theme_color: '#0b0c0e',
        icons: [
          { src: '/icons/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/logo-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/logo-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        importScripts: ['sw-focus.js'],
        // the app's own code is precached, so the first install already works offline; the synthetic XR rooms and the
        // headset emulator (several MB, never loaded for a visitor) are left out
        // (the manifest's icons are added to the precache by the plugin itself, so they are not listed here)
        globPatterns: ['**/*.{html,css,js,svg,woff2}', 'icons/apple-touch-icon.png', 'icons/badge-96.png'],
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
    // the sync tests start an in-process Postgres, which is slow when the whole suite runs at once
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['src/test/setup.js'],
  },
})
