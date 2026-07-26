import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'R10 Analytics',
        short_name: 'R10 Bets',
        description: 'Análise matemática de jogadores para apostas esportivas. EV, Kelly criterion e alertas em tempo real.',
        theme_color: '#92400e',
        background_color: '#1a0f00',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          { src: 'screenshot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'R10 Analytics — Painel de Jogadores' },
          { src: 'screenshot-narrow.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'R10 Analytics no celular' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }
    })
  ]
})
