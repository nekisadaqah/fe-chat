import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/auth': {
        target: 'http://89.116.20.215:7010',
        changeOrigin: true
      },
      '/api/Users': {
        target: 'http://89.116.20.215:7510',
        changeOrigin: true
      },
      '/api/Conversations': {
        target: 'http://89.116.20.215:7510',
        changeOrigin: true
      },
      '/api/Messages': {
        target: 'http://89.116.20.215:7510',
        changeOrigin: true
      },
      '/chathub': {
        target: 'http://89.116.20.215:7510',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
