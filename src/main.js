import './assets/tokens.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  const { startMock } = await import('./mocks/browser')
  await startMock()
}

enableMocking().then(() => {
  createApp(App).use(router).mount('#app')
})
