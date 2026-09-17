import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Caminho relativo: dispensa hardcode do nome do repositório
  base: './',
})
