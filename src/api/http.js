// 请求封装：统一基础路径、令牌、超时与错误形态。
// 业务错误抛 ApiError（带接口清单里的 code）；网络失败、超时、无法解析的响应抛 code 为空的 ApiError。

const BASE = import.meta.env.VITE_API_BASE

// 需求第 9 章：登录接口响应超过 10 秒视为网络异常；auth/me 超过 10 秒视为超时，按未登录处理（AC-013）
export const TIMEOUT_MS = 10000

export const TOKEN_KEY = 'token'

export class ApiError extends Error {
  constructor(code, status, body) {
    super(code || 'NETWORK_ERROR')
    this.code = code || null
    this.status = status ?? null
    // 校验失败时接口附带的逐字段提示（API-defect-002-user：DEFECT_VALIDATION_FAILED）
    this.fieldErrors = Array.isArray(body?.fieldErrors) ? body.fieldErrors : []
  }
}

// 带登录态的请求收到 AUTH_UNAUTHENTICATED 时的统一处理（回登录页），由 main.js 注册
let unauthenticatedHandler = null
export function setUnauthenticatedHandler(fn) {
  unauthenticatedHandler = fn
}

export async function request(path, { method = 'GET', body, auth = false, timeout = TIMEOUT_MS } = {}) {
  const headers = { Accept: 'application/json' }
  // FormData 由浏览器自行带 multipart 边界，不手动设 Content-Type
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined || isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(null)
  } finally {
    clearTimeout(timer)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // 响应体不是 JSON
  }

  if (res.ok && data) return data
  const err = new ApiError(data && typeof data.code === 'string' ? data.code : null, res.status, data)
  // /auth/me 的 401 由登录页自行处理（按未登录），不在此跳转
  if (auth && err.code === 'AUTH_UNAUTHENTICATED' && path !== '/auth/me') unauthenticatedHandler?.()
  throw err
}
