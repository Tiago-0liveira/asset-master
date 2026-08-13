import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend on 3005, proxy /api to the Express backend on 3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
