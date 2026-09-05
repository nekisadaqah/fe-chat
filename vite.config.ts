import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/web': {
        target: process.env.VITE_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true
      },
      '/chathub': {
        target: process.env.VITE_GATEWAY_URL || 'http://localhost:7000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
