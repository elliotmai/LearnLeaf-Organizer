import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Custom plugin to remove "use client" directives in MUI files
function removeUseClientDirective() {
  return {
    name: 'remove-use-client-directive',
    transform(code, id) {
      if (id.includes('node_modules/@mui')) {
        return code.replace(/"use client";?/g, '')
      }
      return code
    },
  }
}
// base: "/LearnLeaf-Organizer"
// https://vitejs.dev/config/
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Set cache limit to 5 MB
      },
    }),
    removeUseClientDirective() // Add the custom plugin here without changing the existing structure
  ],
})
