import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
   build: {
      rollupOptions: {
         input: {
            index: resolve(__dirname, 'index.html'),
            match: resolve(__dirname, 'match.html'),
         },
      },
   },
})
