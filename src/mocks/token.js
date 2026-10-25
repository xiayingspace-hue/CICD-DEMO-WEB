// mock 令牌：里面带账号与签发时间，便于刷新后 /auth/me 与缺陷接口仍能识别
const TOKEN_PREFIX = 'mock-token.'

export function issueToken(account) {
  return `${TOKEN_PREFIX}${encodeURIComponent(account)}.${Date.now()}`
}

export function parseToken(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null
  const rest = token.slice(TOKEN_PREFIX.length)
  const dot = rest.lastIndexOf('.')
  if (dot < 0) return null
  return { account: decodeURIComponent(rest.slice(0, dot)), issuedAt: Number(rest.slice(dot + 1)) }
}
