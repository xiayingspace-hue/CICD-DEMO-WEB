// 登录接口，见 CONTEXT outputs/api/API-auth-001-admin.md
import { request, TOKEN_KEY } from './http'

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  AUTH_UNAUTHENTICATED: 'AUTH_UNAUTHENTICATED',
}

/** POST /auth/login → { token, expiresIn, role, displayName } */
export function login(account, password) {
  return request('/auth/login', { method: 'POST', body: { account, password } })
}

/** GET /auth/me → { role, displayName } */
export function fetchMe() {
  return request('/auth/me', { auth: true })
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}
