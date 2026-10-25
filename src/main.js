import './assets/tokens.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { TOKEN_KEY, setUnauthenticatedHandler } from './api/http'

// 登录态失效（账号停用、过期）：按未登录处理，清令牌回登录页
setUnauthenticatedHandler(() => {
  localStorage.removeItem(TOKEN_KEY)
  router.replace({ name: 'login' })
})

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  const { startMock } = await import('./mocks/browser')
  await startMock()
}

enableMocking().then(() => {
  createApp(App).use(router).mount('#app')
})
