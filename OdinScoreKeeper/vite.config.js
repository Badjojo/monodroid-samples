import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

function getVersion() {
  try {
    const hash  = execSync('git rev-parse --short HEAD').toString().trim()
    // GITHUB_RUN_NUMBER est auto-incrémenté par GitHub Actions à chaque déploiement.
    // En local, fallback sur le nombre de commits (clone complet).
    const build = process.env.GITHUB_RUN_NUMBER
      ?? execSync('git rev-list --count HEAD').toString().trim()
    return `#${build} · ${hash}`
  } catch { return 'dev' }
}

const base = process.env.VITE_BASE_PATH || '/monodroid-samples/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
    __BUILD_DATE__:  JSON.stringify(new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Score Keeper',
        short_name: 'Score',
        description: 'Compteur de points pour jeux de société',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
