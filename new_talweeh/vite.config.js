import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { talweehCmsPlugin } from './scripts/vite-cms-plugin.mjs'
export default defineConfig({
  plugins: [react(), talweehCmsPlugin()],
})
