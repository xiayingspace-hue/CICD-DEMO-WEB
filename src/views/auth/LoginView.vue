<script setup>
// REQ-001 登录页。交互与状态参照 CONTEXT prototypes/auth-001-admin-pc.html，文案以需求文档为准。
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ERROR_CODES, fetchMe, login, saveToken } from '@/api/auth'
import { HOME_BY_ROLE } from '@/router/homes'

const router = useRouter()

const checking = ref(true) // AC-013：确认登录态期间不展示表单
const account = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errors = ref({ account: false, password: false })
const banner = ref('') // '' | 'cred' | 'noperm' | 'error'

const accountInput = ref(null)
const passwordInput = ref(null)

function goHome(role, displayName) {
  const home = HOME_BY_ROLE[role]
  if (!home) return false
  router.replace({ name: home.name, state: { displayName } })
  return true
}

onMounted(async () => {
  try {
    const me = await fetchMe()
    if (goHome(me.role, me.displayName)) return
  } catch {
    // 401、网络失败、超时一律视为未登录（AC-013、AC-016）
  }
  checking.value = false
})

async function onSubmit() {
  if (submitting.value) return // AC-009

  banner.value = ''
  const acc = account.value.trim() // AC-003：账号去首尾空格，密码原样
  const pwd = password.value
  errors.value = { account: !acc, password: !pwd }
  if (!acc || !pwd) {
    // AC-002
    ;(acc ? passwordInput : accountInput).value.focus()
    return
  }

  submitting.value = true
  try {
    const res = await login(acc, pwd)
    if (!HOME_BY_ROLE[res.role]) throw new Error('unknown role')
    saveToken(res.token)
    goHome(res.role, res.displayName) // AC-004/005/006/014
  } catch (err) {
    submitting.value = false
    if (err.code === ERROR_CODES.AUTH_INVALID_CREDENTIALS) {
      // AC-007：清空密码，保留账号，焦点回到密码框
      banner.value = 'cred'
      password.value = ''
      await nextTick()
      passwordInput.value.focus()
    } else if (err.code === ERROR_CODES.AUTH_ACCOUNT_DISABLED) {
      banner.value = 'noperm' // AC-008：保留输入
    } else {
      banner.value = 'error' // AC-010：网络、超时、5xx、无法识别的 code，保留输入
    }
  }
}
</script>

<template>
  <div v-if="checking" class="checking" aria-busy="true" data-testid="auth-checking">
    <span class="spinner" />
  </div>

  <section v-else class="login" data-testid="login">
    <div class="brand">
      <div class="brand-name">
        <span class="brand-mark">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
        </span>
        缺陷管理平台
      </div>
      <h1 class="slogan" data-testid="system-name">屋主缺陷管理平台</h1>
      <p class="desc">TOP 交房后，DLP 期内的缺陷提报、整改与验收</p>
    </div>

    <div class="panel">
      <form class="card" novalidate data-testid="login-form" @submit.prevent="onSubmit">
        <h2 class="title">登录</h2>
        <p class="subtitle">请输入 CSO 分配给您的账号和密码</p>

        <div v-if="banner === 'cred'" class="banner" role="alert" data-testid="banner-cred">账号或密码错误</div>
        <div v-if="banner === 'noperm'" class="banner" role="alert" data-testid="banner-noperm">账号已停用，请联系 CSO</div>
        <div v-if="banner === 'error'" class="banner" role="alert" data-testid="banner-error">网络异常，请稍后重试</div>

        <div class="field">
          <label for="account">账号</label>
          <input
            id="account"
            ref="accountInput"
            v-model="account"
            data-testid="account"
            autocomplete="username"
            placeholder="请输入账号"
            :class="{ invalid: errors.account }"
            :readonly="submitting"
            :aria-invalid="errors.account"
            @input="errors.account = false"
          />
          <div v-if="errors.account" class="field-error" data-testid="e-account">请输入账号</div>
        </div>

        <div class="field">
          <label for="password">密码</label>
          <div class="input-wrap">
            <input
              id="password"
              ref="passwordInput"
              v-model="password"
              data-testid="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
              :class="{ invalid: errors.password }"
              :readonly="submitting"
              :aria-invalid="errors.password"
              @input="errors.password = false"
            />
            <button
              type="button"
              class="toggle"
              data-testid="toggle-pwd"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18" /><path d="M10.6 6.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.9" /></svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
          <div v-if="errors.password" class="field-error" data-testid="e-password">请输入密码</div>
        </div>

        <button type="submit" class="submit" data-testid="btn-login" :disabled="submitting" :aria-busy="submitting">
          <span v-if="submitting" class="spinner small" />
          {{ submitting ? '登录中…' : '登录' }}
        </button>
        <div v-if="submitting" class="hint loading" data-testid="login-loading">正在验证账号…</div>

        <p class="hint foot" data-testid="login-foot">账号由 CSO 分配，忘记密码请联系 CSO</p>
      </form>
    </div>
  </section>
</template>

<style scoped>
.checking {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login {
  display: flex;
  min-height: 100vh;
}

.brand {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px;
  background: var(--brand-sidebar);
  color: var(--brand-sidebar-text);
}

.brand-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-sidebar-text-active);
}

.brand-mark {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--brand-radius);
  background: var(--brand-accent);
  color: var(--brand-on-accent);
}

.slogan {
  margin: 32px 0 12px;
  font-size: 32px;
  color: var(--brand-sidebar-text-active);
}

.desc {
  margin: 0;
  color: var(--brand-sidebar-muted);
}

.panel {
  flex: 0 0 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.card {
  width: 100%;
  max-width: 400px;
  min-width: 0;
  padding: 40px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-surface);
  box-shadow: var(--brand-shadow-md);
}

.title {
  margin: 0 0 4px;
  font-size: 22px;
}

.subtitle {
  margin: 0 0 24px;
  color: var(--brand-text-secondary);
}

.banner {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-danger-tint);
  color: var(--brand-danger);
  overflow-wrap: anywhere;
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.field input {
  display: block;
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-surface);
  color: var(--brand-text-primary);
  font: inherit;
  outline: none;
  transition: border-color var(--brand-ease), box-shadow var(--brand-ease);
}

.field input:focus {
  border-color: var(--brand-accent);
  box-shadow: var(--brand-focus-ring);
}

.field input.invalid {
  border-color: var(--brand-danger);
}

.field input[readonly] {
  background: var(--brand-bg);
}

.input-wrap {
  position: relative;
}

.input-wrap input {
  padding-right: 40px;
}

.toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: var(--brand-text-muted);
  cursor: pointer;
}

.toggle:hover {
  color: var(--brand-accent);
}

.field-error {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-danger);
}

.submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  margin-top: 8px;
  border: 0;
  border-radius: var(--brand-radius);
  background: var(--brand-accent);
  color: var(--brand-on-accent);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow var(--brand-ease);
}

.submit:hover:not(:disabled) {
  box-shadow: var(--brand-shadow-accent);
}

.submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--brand-text-muted);
}

.hint.loading {
  margin-top: 8px;
}

.hint.foot {
  margin-top: 24px;
  text-align: center;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--brand-border);
  border-top-color: var(--brand-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: var(--brand-accent-tint);
  border-top-color: var(--brand-on-accent);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
