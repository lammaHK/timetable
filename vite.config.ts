import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base matches the GitHub Pages repo path (/<repo>/)
export default defineConfig({
  base: '/timetable/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
})
