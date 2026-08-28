import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base matches the GitHub Pages repo path (/<repo>/)
export default defineConfig({
  // relative base: portable to GitHub Pages sub-path AND lets static analyzers
  // resolve asset paths. Manifest/SW URLs use import.meta.env.BASE_URL (="./").
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
})
