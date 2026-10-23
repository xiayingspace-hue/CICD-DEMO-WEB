import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // 联调模式（VITE_USE_MOCK=false）下，接口经此代理转到网关
    proxy: {
      '/defect-service': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
