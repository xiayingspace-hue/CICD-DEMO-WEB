<script setup>
// REQ-002 缺陷详情，含撤回、进入修改。AC-007、AC-014、AC-016~AC-021、AC-024、AC-026。
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CATEGORIES,
  ERROR_CODES,
  ERROR_MESSAGES,
  LOCATIONS,
  NETWORK_MESSAGE,
  fetchDefect,
  labelOf,
  statusOf,
  withdrawDefect,
} from '@/api/defect'
import { ApiError } from '@/api/http'
import { formatDateTime } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UiButton from '@/components/UiButton.vue'

const props = defineProps({ defectId: { type: String, required: true } })
const router = useRouter()

// loading | error | notFound | ready
const phase = ref('loading')
const defect = ref(null)
const banner = ref('')
const notice = ref('')
const showWithdrawConfirm = ref(false)
const withdrawing = ref(false)
let noticeTimer = null
let imageReloaded = false

// 跳转带来的一次性提示（提交成功、已保存、被锁定等）。读后清掉，刷新页面不再重复显示
function takeNavState() {
  const { banner: b, notice: n, ...rest } = history.state || {}
  banner.value = b || ''
  notice.value = n || ''
  if (b || n) history.replaceState(rest, '')
  if (n) {
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => (notice.value = ''), 4000)
  }
}

async function load({ silent = false } = {}) {
  if (!silent) phase.value = 'loading'
  try {
    defect.value = await fetchDefect(props.defectId)
    phase.value = 'ready'
  } catch (err) {
    if (err instanceof ApiError && err.code === ERROR_CODES.DEFECT_NOT_FOUND) phase.value = 'notFound' // AC-021
    else if (!silent || !defect.value) phase.value = 'error'
  }
}

// 图片地址是 10 分钟有效的签名地址；页面停留过久后加载失败（403），重新取一次详情拿新地址
function onImageError() {
  if (imageReloaded) return
  imageReloaded = true
  load({ silent: true })
}

async function onWithdraw() {
  showWithdrawConfirm.value = false
  if (withdrawing.value) return
  withdrawing.value = true
  banner.value = ''
  notice.value = ''
  try {
    defect.value = await withdrawDefect(props.defectId) // AC-016
    notice.value = '缺陷已撤回'
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => (notice.value = ''), 4000)
  } catch (err) {
    const code = err instanceof ApiError ? err.code : null
    if (code === ERROR_CODES.DEFECT_LOCKED || code === ERROR_CODES.DEFECT_WITHDRAWN) {
      banner.value = ERROR_MESSAGES[code] // AC-018、AC-019：提示并刷新详情
      await load({ silent: true })
    } else if (code === ERROR_CODES.DEFECT_NOT_FOUND) {
      phase.value = 'notFound'
    } else {
      banner.value = NETWORK_MESSAGE
    }
  } finally {
    withdrawing.value = false
  }
}

onMounted(() => {
  takeNavState()
  load()
})
watch(
  () => props.defectId,
  () => {
    imageReloaded = false
    load()
  },
)
onBeforeUnmount(() => clearTimeout(noticeTimer))
</script>

<template>
  <section class="page" data-testid="defect-detail-page">
    <button type="button" class="link" data-testid="btn-back-home" @click="router.push({ name: 'home-owner' })">← 返回首页</button>

    <div v-if="phase === 'loading'" class="card state" aria-busy="true" data-testid="defect-loading">加载中…</div>

    <div v-else-if="phase === 'error'" class="card state" role="alert" data-testid="defect-error">
      {{ NETWORK_MESSAGE }}
      <UiButton data-testid="btn-defect-retry" @click="load()">重试</UiButton>
    </div>

    <div v-else-if="phase === 'notFound'" class="card state" data-testid="defect-not-found">
      {{ ERROR_MESSAGES.DEFECT_NOT_FOUND }}
      <UiButton data-testid="btn-home" @click="router.push({ name: 'home-owner' })">回到首页</UiButton>
    </div>

    <template v-else>
      <div v-if="notice" class="notice" role="status" data-testid="toast">{{ notice }}</div>
      <div v-if="banner" class="banner" role="alert" data-testid="banner-defect">{{ banner }}</div>

      <div class="card" data-testid="defect-detail">
        <div class="head">
          <h2 class="title">缺陷详情</h2>
          <span class="badge" :class="statusOf(defect.status).tone" data-testid="d-status">{{ statusOf(defect.status).label }}</span>
        </div>
        <p class="meta">缺陷编号 <span data-testid="d-no">{{ defect.defectNo }}</span></p>

        <dl class="kv">
          <div><dt>所属单元</dt><dd data-testid="d-unit">{{ defect.unitName }}</dd></div>
          <div><dt>位置</dt><dd data-testid="d-location">{{ labelOf(LOCATIONS, defect.location) }}</dd></div>
          <div><dt>类别</dt><dd data-testid="d-category">{{ labelOf(CATEGORIES, defect.category) }}</dd></div>
          <div><dt>提交时间</dt><dd data-testid="d-submitted">{{ formatDateTime(defect.submittedAt) }}</dd></div>
          <div><dt>最近修改时间</dt><dd data-testid="d-modified">{{ formatDateTime(defect.lastModifiedAt) }}</dd></div>
        </dl>

        <div class="block">
          <div class="block-label">描述</div>
          <!-- 纯文本渲染，保留换行，不执行脚本（AC-026） -->
          <div class="desc" data-testid="d-desc">{{ defect.description }}</div>
        </div>

        <div class="block">
          <div class="block-label">图片</div>
          <div v-if="defect.images.length" class="thumbs" data-testid="d-images">
            <a
              v-for="img in defect.images"
              :key="img.imageId"
              class="thumb"
              :href="img.url"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="d-image"
            >
              <img :src="img.url" alt="缺陷图片" @error="onImageError" />
            </a>
          </div>
          <p v-else class="muted" data-testid="d-no-images">无图片</p>
        </div>

        <!-- editable 以服务端为准（AC-014、AC-016、AC-017、AC-024）；DLP 到期不影响（AC-020） -->
        <div v-if="defect.editable" class="actions" data-testid="d-actions">
          <UiButton variant="danger-text" data-testid="btn-withdraw" :disabled="withdrawing" @click="showWithdrawConfirm = true">撤回</UiButton>
          <UiButton
            variant="primary"
            data-testid="btn-edit"
            @click="router.push({ name: 'defect-edit', params: { defectId } })"
          >修改</UiButton>
        </div>
        <div v-else class="lock-note" data-testid="d-lock-note">{{ statusOf(defect.status).lockNote }}</div>
      </div>
    </template>

    <ConfirmDialog
      testid="m-withdraw"
      danger
      :open="showWithdrawConfirm"
      title="确认撤回缺陷"
      text="撤回后缺陷不再进入 CSO 的待办，且不能恢复。需要再次报告，请提交新缺陷。"
      cancel-text="再想想"
      confirm-text="确认撤回"
      @cancel="showWithdrawConfirm = false"
      @confirm="onWithdraw"
    />
  </section>
</template>

<style scoped>
.page {
  max-width: 760px;
}

.link {
  padding: 0;
  border: none;
  background: none;
  color: var(--brand-text-secondary);
  font: inherit;
  cursor: pointer;
}

.link:hover {
  color: var(--brand-accent);
}

.card {
  margin-top: 12px;
  padding: 24px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-surface);
  box-shadow: var(--brand-shadow-md);
}

.state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  color: var(--brand-text-secondary);
}

.notice,
.banner {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
}

.notice {
  background: var(--brand-success-tint);
  color: var(--brand-success-text);
}

.banner {
  background: var(--brand-danger-tint);
  color: var(--brand-danger);
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 22px;
}

.badge {
  padding: 2px 10px;
  border-radius: var(--brand-radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.badge.warn {
  background: var(--brand-status-warn-tint);
  color: var(--brand-status-warn);
}

.badge.info {
  background: var(--brand-info-tint);
  color: var(--brand-info-text);
}

.badge.neutral {
  background: var(--brand-status-neutral-tint);
  color: var(--brand-status-neutral);
}

.meta {
  margin: 8px 0 16px;
  color: var(--brand-text-secondary);
}

.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
  margin: 0;
}

.kv dt {
  color: var(--brand-text-muted);
  font-size: 12px;
}

.kv dd {
  margin: 2px 0 0;
}

.block {
  margin-top: 20px;
}

.block-label {
  margin-bottom: 6px;
  color: var(--brand-text-muted);
  font-size: 12px;
}

.desc {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.muted {
  margin: 0;
  color: var(--brand-text-muted);
}

.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.thumb {
  display: block;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  padding: 0;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.lock-note {
  margin-top: 24px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-info-tint);
  color: var(--brand-info-text);
}
</style>
