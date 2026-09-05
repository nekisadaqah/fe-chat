import { defineConfig, loadEnv } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Resolve gateway target URL for Vite dev server proxy
  const gatewayTarget = env.VITE_GATEWAY_URL 
    || (env.VITE_API_BASE_URL ? env.VITE_API_BASE_URL.replace(/\/web\/?$/, '') : '');

  const proxyConfig: Record<string, ProxyOptions> = gatewayTarget ? {
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
  } : {};

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: proxyConfig
    }
  };
});



