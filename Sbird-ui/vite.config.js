import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.SBIRD_UI_API_ORIGIN
  ?? process.env.SBIRD_WEB_API_ORIGIN
  ?? 'http://127.0.0.1:5310';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
});
