import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'LearnLeaf Organizer',
        short_name: 'LearnLeaf Organizer',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  optimizeDeps: {
    include: ['@mui/material', '@mui/icons-material', 'hoist-non-react-statics'],
  },
  // resolve: {
  //   alias: {
  //     '@mui/material': 'node_modules/@mui/material/index.js',
  //     '@mui/icons-material': 'node_modules/@mui/icons-material/index.js',
  //   },
  // },
  server: {
    proxy: {
      '/proxy': {
        target: 'https://uta.instructure.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/(https?:\/\/[^\/]+)(\/.*)/, '$2'),
        router: (req) => {
          const matches = req.url.match(/^\/proxy\/(https?:\/\/[^\/]+)(\/.*)/);
          return matches ? matches[1] : 'https://instructure.com';
        },
      },
    },
  },
})
