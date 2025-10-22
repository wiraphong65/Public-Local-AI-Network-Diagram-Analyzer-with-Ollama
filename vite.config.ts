import { defineConfig } from 'vite' 
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/~wiraphong/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['ae0dd4302a57.ngrok-free.app'],
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: false,
    },
  },
})
