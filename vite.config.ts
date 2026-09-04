import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/auth': {
        target: process.env.VITE_AUTH_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true,
        rewrite: (path) => `/web${path}`
      },
      '/api/Users': {
        target: process.env.VITE_CHAT_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true
      },
      '/api/Conversations': {
        target: process.env.VITE_CHAT_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true
      },
      '/api/Messages': {
        target: process.env.VITE_CHAT_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true
      },
      '/api/Groups': {
        target: process.env.VITE_CHAT_GATEWAY_URL || 'http://localhost:7000',
        changeOrigin: true
      },
      '/chathub': {
        target: process.env.VITE_CHAT_GATEWAY_URL || 'http://localhost:7000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
