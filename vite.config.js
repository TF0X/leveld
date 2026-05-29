import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/leveld/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', '*.png', '*.svg'],
      manifest: {
        name: 'AscendRPG',
        short_name: 'AscendRPG',
        description: 'Gamified self-improvement RPG tracker',
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        display: 'standalone',
        start_url: '/leveld/',
        icons: [
          { src: '/leveld/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/leveld/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
})
