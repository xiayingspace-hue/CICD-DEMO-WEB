// mock 账号。业务账号与密码取自 CONTEXT outputs/qa/QA-auth-001-admin.md「测试账号约定」。
export const PASSWORD = 'Test@1234'

export const ACCOUNTS = {
  owner01: { role: 'OWNER', displayName: '陈小明', enabled: true },
  cso01: { role: 'CSO', displayName: '李静', enabled: true },
  sub01: { role: 'SUBCONTRACTOR', displayName: '华建装修', enabled: true },
  off01: { role: 'OWNER', displayName: '停用账号', enabled: false },
  'owner-expired': { role: 'OWNER', displayName: 'DLP 到期屋主', enabled: true, dlpExpired: true },
  'owner-revoke': { role: 'OWNER', displayName: '待停用屋主', enabled: true },
}

// 仅 mock 使用的场景账号：任意密码，用于触发异常分支
export const SCENARIO_ACCOUNTS = {
  net01: 'network', // 网络层失败
  timeout01: 'timeout', // 响应超过 10 秒
  slow01: 'slow', // 延迟 3 秒后以 owner01 身份成功（TC-014）
  err500: 'server-error', // 5xx，无业务 code
  err429: 'unknown-code', // 429 + 无法识别的 code（TC-032）
}

// 运行时停用状态，存 localStorage，刷新后仍生效（AC-016 / TC-029）
const DISABLED_KEY = 'mock.disabledAccounts'

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem(DISABLED_KEY)) || {}
  } catch {
    return {}
  }
}

export function isEnabled(account) {
  const overrides = readOverrides()
  if (account in overrides) return !overrides[account]
  return ACCOUNTS[account].enabled
}

export function setDisabled(account, disabled) {
  const overrides = readOverrides()
  overrides[account] = disabled
  localStorage.setItem(DISABLED_KEY, JSON.stringify(overrides))
}

export function resetOverrides() {
  localStorage.removeItem(DISABLED_KEY)
}
