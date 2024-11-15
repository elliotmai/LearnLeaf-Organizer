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

// Vite configuration
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
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
      },
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
    }),
    removeUseClientDirective() // Removes "use client" directive from MUI files
  ],
  server: {
    proxy: {
      '/proxy': {
        target: 'https://uta.instructure.com',  // Placeholder target
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/(https?:\/\/[^\/]+)(\/.*)/, '$2'),
        router: (req) => {
          const matches = req.url.match(/^\/proxy\/(https?:\/\/[^\/]+)(\/.*)/);
          return matches && matches[1] ? matches[1] : 'https://instructure.com';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@mui/material', '@mui/icons-material'], // Exclude from optimization
  },
  build: {
    rollupOptions: {
      external: ['@mui/material', '@mui/icons-material'], // Exclude MUI packages from bundling
    },
    commonjsOptions: {
      include: [/node_modules/], // Include all node modules in commonjs plugin handling
    },
  },
})
