import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 2000, // PlayCanvas 2.x chunk is ~1.9MB gzip: 488kB
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires manualChunks as a function, not an object
        manualChunks(id) {
          if (id.includes('node_modules/playcanvas')) return 'playcanvas';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react';
        }
      }
    }
  },
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.ogg', '**/*.wav']
}));
