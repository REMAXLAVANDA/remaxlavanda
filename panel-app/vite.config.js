import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // ✅ Vercel’de alt dizine kurulum için zorunlu
  base: './',
  plugins: [react()],
});
