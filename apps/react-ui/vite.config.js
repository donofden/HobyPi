import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // binds 0.0.0.0 so LAN devices can open :3000
    port: 3000,
    strictPort: true
  },
  preview: {
    host: true,
    port: 3000
  }
})
