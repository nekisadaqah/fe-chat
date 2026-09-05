import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Resolve gateway target URL from VITE_GATEWAY_URL, VITE_API_BASE_URL, or default staging gateway
  const gatewayTarget = env.VITE_GATEWAY_URL 
    || (env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL.replace(/\/web\/?$/, '') : '')
    || 'http://89.116.20.215:7000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/web': {
          target: gatewayTarget,
          changeOrigin: true,
          secure: false
        },
        '/chathub': {
          target: gatewayTarget,
          ws: true,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});

