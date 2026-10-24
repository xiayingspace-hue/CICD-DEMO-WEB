// 请求封装：统一基础路径、令牌、超时与错误形态。
// 业务错误抛 ApiError（带接口清单里的 code）；网络失败、超时、无法解析的响应抛 code 为空的 ApiError。

const BASE = import.meta.env.VITE_API_BASE

// 需求第 9 章：登录接口响应超过 10 秒视为网络异常；auth/me 超过 10 秒视为超时，按未登录处理（AC-013）
export const TIMEOUT_MS = 10000

export const TOKEN_KEY = 'token'

export class ApiError extends Error {
  constructor(code, status) {
    super(code || 'NETWORK_ERROR')
    this.code = code || null
    this.status = status ?? null
  }
}

export async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
  throw new ApiError(data && typeof data.code === 'string' ? data.code : null, res.status)
}
