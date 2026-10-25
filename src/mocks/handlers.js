// 登录接口 mock。路径、字段、code、HTTP 状态取自 CONTEXT outputs/api/API-auth-001-admin.md
import { http, HttpResponse, delay } from 'msw'
import { ACCOUNTS, PASSWORD, SCENARIO_ACCOUNTS, isEnabled } from './accounts'
import { issueToken, parseToken } from './token'
import { defectHandlers } from './defects'

const BASE = import.meta.env.VITE_API_BASE
const EXPIRES_IN = 28800
const LATENCY_MS = 600

const invalidCredentials = () =>
  HttpResponse.json({ code: 'AUTH_INVALID_CREDENTIALS', message: '账号或密码错误' }, { status: 401 })

const unauthenticated = () =>
  HttpResponse.json({ code: 'AUTH_UNAUTHENTICATED', message: '未登录' }, { status: 401 })

function success(account) {
  const { role, displayName } = ACCOUNTS[account]
  return HttpResponse.json({ token: issueToken(account), expiresIn: EXPIRES_IN, role, displayName })
}

async function scenario(kind) {
  switch (kind) {
    case 'network':
      return HttpResponse.error()
    case 'timeout':
      await delay(15000)
      return HttpResponse.error()
    case 'slow':
      await delay(3000)
      return success('owner01')
    case 'server-error':
      return new HttpResponse('Internal Server Error', { status: 500 })
    case 'unknown-code':
      return HttpResponse.json({ code: 'TOO_MANY_REQUESTS', message: '请求过于频繁' }, { status: 429 })
  }
}

export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(LATENCY_MS)

    let body
    try {
      body = await request.json()
    } catch {
      return invalidCredentials()
    }
    const account = body?.account
    const password = body?.password
    if (typeof account !== 'string' || typeof password !== 'string' || !account || !password) {
      return invalidCredentials()
    }

    if (Object.hasOwn(SCENARIO_ACCOUNTS, account)) return scenario(SCENARIO_ACCOUNTS[account])

    // 精确匹配、区分大小写；账号不存在与密码错误返回相同结果
    if (!Object.hasOwn(ACCOUNTS, account) || password !== PASSWORD) return invalidCredentials()
    // 仅密码正确时才透露停用
    if (!isEnabled(account)) {
      return HttpResponse.json({ code: 'AUTH_ACCOUNT_DISABLED', message: '账号已停用，请联系 CSO' }, { status: 403 })
    }
    return success(account)
  }),

  http.get(`${BASE}/auth/me`, async ({ request }) => {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '')

    // 仅 mock 使用的令牌：模拟 auth/me 网络失败与超时（TC-022）
    if (token === 'mock-me-network') return HttpResponse.error()
    if (token === 'mock-me-timeout') {
      await delay(15000)
      return HttpResponse.error()
    }

    await delay(LATENCY_MS)
    const parsed = parseToken(token)
    if (!parsed || !Object.hasOwn(ACCOUNTS, parsed.account)) return unauthenticated()
    if (Date.now() - parsed.issuedAt > EXPIRES_IN * 1000) return unauthenticated()
    // 每次都查账号当前状态，停用后令牌立即失效（AC-016）；重新启用后恢复有效（需求第 11 章，CONTEXT#3）
    if (!isEnabled(parsed.account)) return unauthenticated()

    const { role, displayName } = ACCOUNTS[parsed.account]
    return HttpResponse.json({ role, displayName })
  }),

  ...defectHandlers,
]
