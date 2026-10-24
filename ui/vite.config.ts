import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: proxy the VSD server. Build: emit into its static folder, so
// http://localhost:8095 serves the studio with no extra server.
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, proxy: { '/api': 'http://localhost:8095' } },
  build: { outDir: '../server/src/main/resources/static', emptyOutDir: true },
})
