import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin API so the httpOnly session cookie works without CORS.
    proxy: {
      '/api': process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8001',
    },
  },
})
