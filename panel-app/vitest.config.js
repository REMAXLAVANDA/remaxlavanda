import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Ayrı bir vitest config — vite.config.js'i (build/tailwind ayarları)
// bozmadan sadece test ortamı ayarlarını tutar.
export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
  },
})
