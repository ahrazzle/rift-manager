import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SPA, relative base so it can be hosted from any static path (Vercel/Netlify/subdir).
export default defineConfig({
  plugins: [react()],
  base: './',
})
