import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
base: "/LearnLeaf-Organizer"
export default defineConfig({
  plugins: [react()],
})
