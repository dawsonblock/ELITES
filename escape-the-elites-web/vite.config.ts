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
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          playcanvas: ['playcanvas'],
          react: ['react', 'react-dom']
        }
      }
    }
  },
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.ogg', '**/*.wav']
}));
