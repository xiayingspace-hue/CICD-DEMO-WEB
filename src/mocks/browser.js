import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { setDisabled, resetOverrides } from './accounts'

export const worker = setupWorker(...handlers)

// 控制台 / E2E 用：模拟账号被停用（TC-029），例如 __mockAuth.disable('owner-revoke')
window.__mockAuth = {
  disable: (account) => setDisabled(account, true),
  enable: (account) => setDisabled(account, false),
  reset: resetOverrides,
}

export function startMock() {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}
