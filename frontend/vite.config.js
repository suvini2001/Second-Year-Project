import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server:{port:5173},
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  base:process.env.VITE_BASE_PATH|| "/Second-Year-Project",
})
