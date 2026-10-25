<script setup>
// REQ-002 提交 / 修改缺陷（同一表单，修改时回填）。
// 交互与状态参照 CONTEXT prototypes/defect-002-user-pc.html，文案以需求文档为准。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import {
  CATEGORIES,
  ERROR_CODES,
  ERROR_MESSAGES,
  LIMITS,
  LOCATIONS,
  NETWORK_MESSAGE,
  createDefect,
  fetchDefect,
  fetchSubmitContext,
  updateDefect,
} from '@/api/defect'
import { ApiError } from '@/api/http'
import { charLength, formatDate } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UiButton from '@/components/UiButton.vue'
import ImageUploader from '@/components/defect/ImageUploader.vue'

const props = defineProps({
  mode: { type: String, default: 'create' }, // create | edit
  defectId: { type: String, default: '' },
})

const router = useRouter()
const isEdit = computed(() => props.mode === 'edit')

// loading | error | noUnit | expired | notFound | ready
const phase = ref('loading')
const unitName = ref('')
const dlpEndDate = ref('')

const location = ref('')
const category = ref('')
const description = ref('')
const images = ref([])
const errors = ref({ location: '', category: '', description: '', images: '' })
const banner = ref('')
const submitting = ref(false)
const showSubmitConfirm = ref(false)
const showLeaveConfirm = ref(false)
let leaveResolve = null
let baseline = ''
const bypassLeave = ref(false)

const uploading = computed(() => images.value.some((i) => i.status === 'uploading'))
const descLength = computed(() => charLength(description.value))

function snapshot() {
  return JSON.stringify([
    location.value,
    category.value,
    description.value,
    images.value.map((i) => `${i.key}:${i.status}`),
  ])
}

// AC-023：提交页有填写、修改页有改动时，离开前确认
const dirty = computed(() => phase.value === 'ready' && !bypassLeave.value && snapshot() !== baseline)

function clearErrors() {
  errors.value = { location: '', category: '', description: '', images: '' }
  banner.value = ''
}

async function load() {
  phase.value = 'loading'
  try {
    if (isEdit.value) {
      const d = await fetchDefect(props.defectId)
      if (!d.editable) {
        // 已不可修改（派单、撤回等）：回详情查看最新状态（AC-017、AC-018、AC-019）
        const message =
          d.status === 'WITHDRAWN' ? ERROR_MESSAGES.DEFECT_WITHDRAWN : d.status === 'PENDING_DISPATCH' ? '' : ERROR_MESSAGES.DEFECT_LOCKED
        leaveTo({ name: 'defect-detail', params: { defectId: props.defectId }, state: { banner: message } })
        return
      }
      unitName.value = d.unitName
      location.value = d.location
      category.value = d.category
      description.value = d.description
      images.value = d.images.map((i) => ({ key: `e-${i.imageId}`, name: '', status: 'done', imageId: i.imageId, url: i.url }))
    } else {
      const ctx = await fetchSubmitContext()
      unitName.value = ctx.unitName
      dlpEndDate.value = ctx.dlpEndDate
      if (!ctx.canSubmit) {
        phase.value = 'expired' // AC-012
        return
      }
    }
    baseline = snapshot()
    phase.value = 'ready'
  } catch (err) {
    if (err instanceof ApiError && err.code === ERROR_CODES.DEFECT_NO_UNIT) phase.value = 'noUnit' // AC-027
    else if (err instanceof ApiError && err.code === ERROR_CODES.DEFECT_NOT_FOUND) phase.value = 'notFound' // AC-021
    else if (err instanceof ApiError && err.code === ERROR_CODES.AUTH_FORBIDDEN) phase.value = 'forbidden'
    else phase.value = 'error'
  }
}

function leaveTo(to) {
  bypassLeave.value = true
  router.replace(to)
}

function validate() {
  clearErrors()
  const e = errors.value
  if (!location.value) e.location = '请选择缺陷位置' // AC-002
  if (!category.value) e.category = '请选择缺陷类别'
  const desc = description.value.trim() // AC-003：首尾空格自动去掉
  if (!desc) e.description = '请填写缺陷描述'
  else if (charLength(desc) > LIMITS.descMax) e.description = '描述不能超过 500 字'
  const firstBad = ['location', 'category', 'description'].find((f) => e[f])
  if (firstBad) {
    document.getElementById(firstBad)?.focus()
    return false
  }
  description.value = desc
  return true
}

function onSubmit() {
  if (submitting.value || uploading.value) return // AC-009、AC-011
  if (!validate()) return
  if (isEdit.value) send()
  else showSubmitConfirm.value = true // AC-006
}

function onConfirmSubmit() {
  showSubmitConfirm.value = false
  send()
}

async function send() {
  if (submitting.value) return
  submitting.value = true
  banner.value = ''
  const payload = {
    location: location.value,
    category: category.value,
    description: description.value,
    imageIds: images.value.filter((i) => i.status === 'done').map((i) => i.imageId), // AC-025：失败的不随缺陷提交
  }
  try {
    const d = isEdit.value ? await updateDefect(props.defectId, payload) : await createDefect(payload)
    leaveTo({
      name: 'defect-detail',
      params: { defectId: d.defectId },
      state: { notice: isEdit.value ? '已保存' : '提交成功，缺陷已进入待派单' },
    })
  } catch (err) {
    submitting.value = false
    await handleError(err)
  }
}

async function handleError(err) {
  const code = err instanceof ApiError ? err.code : null
  if (code === ERROR_CODES.DEFECT_VALIDATION_FAILED) {
    // 以接口 fieldErrors 为准展示在对应字段下（AC-015）
    let matched = false
    for (const { field, message } of err.fieldErrors) {
      const key = field === 'imageIds' ? 'images' : field
      if (key in errors.value) {
        errors.value[key] = message
        matched = true
      }
    }
    if (!matched) banner.value = NETWORK_MESSAGE
  } else if (code === ERROR_CODES.DEFECT_DLP_EXPIRED) {
    // 提交瞬间 DLP 到期：保留已填内容，提示结束日期（取接口 1 的 dlpEndDate）
    banner.value = ERROR_MESSAGES.DEFECT_DLP_EXPIRED
    try {
      const ctx = await fetchSubmitContext()
      banner.value = `缺陷责任期已于 ${formatDate(ctx.dlpEndDate)} 结束，不能再提交缺陷`
    } catch {
      // 取不到日期就保留不带日期的提示
    }
  } else if (code === ERROR_CODES.DEFECT_NO_UNIT || code === ERROR_CODES.AUTH_FORBIDDEN) {
    banner.value = ERROR_MESSAGES[code]
  } else if (isEdit.value && (code === ERROR_CODES.DEFECT_LOCKED || code === ERROR_CODES.DEFECT_WITHDRAWN)) {
    // AC-018、AC-019：修改内容不保存，回详情并刷新为最新状态
    leaveTo({ name: 'defect-detail', params: { defectId: props.defectId }, state: { banner: ERROR_MESSAGES[code] } })
  } else if (isEdit.value && code === ERROR_CODES.DEFECT_NOT_FOUND) {
    leaveTo({ name: 'defect-detail', params: { defectId: props.defectId } })
  } else {
    banner.value = NETWORK_MESSAGE // AC-010：保留所有输入与已上传图片
  }
}

function goBack() {
  router.push(isEdit.value ? { name: 'defect-detail', params: { defectId: props.defectId } } : { name: 'home-owner' })
}

onBeforeRouteLeave((to) => {
  if (!dirty.value || to.name === 'login') return true // 登录态失效回登录页，已填内容不保留
  return new Promise((resolve) => {
    leaveResolve = resolve
    showLeaveConfirm.value = true
  })
})

function resolveLeave(ok) {
  showLeaveConfirm.value = false
  leaveResolve?.(ok)
  leaveResolve = null
}

// 刷新、关闭标签页：浏览器自带的离开提示
function onBeforeUnload(e) {
  e.preventDefault()
  e.returnValue = ''
}
watch(dirty, (d) => {
  if (d) window.addEventListener('beforeunload', onBeforeUnload)
  else window.removeEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

onMounted(load)
// 修改页在同一组件实例内切换缺陷时重新加载
watch(() => props.defectId, async () => {
  await nextTick()
  if (isEdit.value) load()
})
</script>

<template>
  <section class="page" data-testid="defect-form-page">
    <button type="button" class="link" data-testid="btn-back" @click="goBack">← 返回</button>
    <h2 class="title" data-testid="form-title">{{ isEdit ? '修改缺陷' : '提交缺陷' }}</h2>
    <p class="subtitle">{{ isEdit ? '修改后保存，缺陷编号与状态不变' : '填写缺陷信息，提交后由 CSO 派单给分包处理' }}</p>

    <div v-if="phase === 'loading'" class="card state" aria-busy="true" data-testid="form-loading">加载中…</div>

    <div v-else-if="phase === 'error'" class="card state" role="alert" data-testid="form-error">
      {{ NETWORK_MESSAGE }}
      <UiButton data-testid="btn-form-retry" @click="load">重试</UiButton>
    </div>

    <div v-else-if="phase === 'expired'" class="card state" data-testid="form-expired">
      <span data-testid="dlp-msg">缺陷责任期已于 {{ formatDate(dlpEndDate) }} 结束，不能再提交缺陷</span>
      <UiButton data-testid="btn-home" @click="router.push({ name: 'home-owner' })">回到首页</UiButton>
    </div>

    <div v-else-if="phase === 'noUnit'" class="card state" data-testid="form-no-unit">
      <span data-testid="no-unit-msg">{{ ERROR_MESSAGES.DEFECT_NO_UNIT }}</span>
      <UiButton data-testid="btn-home" @click="router.push({ name: 'home-owner' })">回到首页</UiButton>
    </div>

    <div v-else-if="phase === 'forbidden'" class="card state" data-testid="form-forbidden">
      {{ ERROR_MESSAGES.AUTH_FORBIDDEN }}
    </div>

    <div v-else-if="phase === 'notFound'" class="card state" data-testid="defect-not-found">
      {{ ERROR_MESSAGES.DEFECT_NOT_FOUND }}
      <UiButton data-testid="btn-home" @click="router.push({ name: 'home-owner' })">回到首页</UiButton>
    </div>

    <form v-else class="card" novalidate data-testid="defect-form" @submit.prevent="onSubmit">
      <div v-if="banner" class="banner" role="alert" data-testid="banner-form">{{ banner }}</div>

      <div class="field">
        <label for="unit">所属单元</label>
        <input id="unit" data-testid="unit" :value="unitName" disabled />
      </div>

      <div class="row2">
        <div class="field">
          <label for="location">位置</label>
          <select
            id="location"
            v-model="location"
            data-testid="location"
            :class="{ invalid: errors.location }"
            :aria-invalid="!!errors.location"
            @change="errors.location = ''"
          >
            <option value="">请选择位置</option>
            <option v-for="o in LOCATIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <div v-if="errors.location" class="field-error" data-testid="e-location">{{ errors.location }}</div>
        </div>
        <div class="field">
          <label for="category">类别</label>
          <select
            id="category"
            v-model="category"
            data-testid="category"
            :class="{ invalid: errors.category }"
            :aria-invalid="!!errors.category"
            @change="errors.category = ''"
          >
            <option value="">请选择类别</option>
            <option v-for="o in CATEGORIES" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <div v-if="errors.category" class="field-error" data-testid="e-category">{{ errors.category }}</div>
        </div>
      </div>

      <div class="field">
        <label for="description">描述</label>
        <textarea
          id="description"
          v-model="description"
          data-testid="description"
          placeholder="请描述缺陷的具体情况"
          :class="{ invalid: errors.description }"
          :aria-invalid="!!errors.description"
          @input="errors.description = ''"
        />
        <div class="counter" :class="{ over: descLength > LIMITS.descMax }" data-testid="desc-counter">
          {{ descLength }} / {{ LIMITS.descMax }}
        </div>
        <div v-if="errors.description" class="field-error" data-testid="e-description">{{ errors.description }}</div>
      </div>

      <div class="field">
        <label id="images-label">图片（选填）</label>
        <ImageUploader v-model:images="images" v-model:error="errors.images" :disabled="submitting" />
        <div v-if="errors.images" class="field-error" data-testid="e-images">{{ errors.images }}</div>
      </div>

      <div class="actions">
        <span v-if="uploading" class="hint" data-testid="uploading-hint">图片上传中，请稍候</span>
        <UiButton data-testid="btn-cancel" @click="goBack">取消</UiButton>
        <UiButton type="submit" variant="primary" data-testid="btn-submit" :disabled="submitting || uploading" :aria-busy="submitting">
          {{ submitting ? (isEdit ? '保存中…' : '提交中…') : isEdit ? '保存' : '提交' }}
        </UiButton>
      </div>
      <p v-if="isEdit" class="hint edit-hint" data-testid="edit-dlp-hint">DLP 到期后仍可修改、撤回待派单的缺陷</p>
    </form>

    <ConfirmDialog
      testid="m-submit"
      :open="showSubmitConfirm"
      title="确认提交缺陷"
      text="提交后缺陷进入「待派单」，在 CSO 派单前你可以修改或撤回。"
      cancel-text="再看看"
      confirm-text="确认提交"
      @cancel="showSubmitConfirm = false"
      @confirm="onConfirmSubmit"
    />
    <ConfirmDialog
      testid="m-leave"
      danger
      :open="showLeaveConfirm"
      title="未提交的内容将丢失"
      text="不保存草稿，离开后已填写的内容和已上传的图片不会保留。"
      cancel-text="继续填写"
      confirm-text="离开"
      @cancel="resolveLeave(false)"
      @confirm="resolveLeave(true)"
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

.title {
  margin: 8px 0 4px;
  font-size: 22px;
}

.subtitle {
  margin: 0 0 16px;
  color: var(--brand-text-secondary);
}

.card {
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

.banner {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-danger-tint);
  color: var(--brand-danger);
}

.field {
  margin-bottom: 16px;
}

.field > label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

input,
select,
textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-surface);
  color: var(--brand-text-primary);
  font: inherit;
}

input:disabled {
  background: var(--brand-bg);
  color: var(--brand-text-secondary);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--brand-accent);
  box-shadow: var(--brand-focus-ring);
}

.invalid {
  border-color: var(--brand-danger);
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.counter {
  margin-top: 4px;
  color: var(--brand-text-muted);
  font-size: 12px;
  text-align: right;
}

.counter.over {
  color: var(--brand-danger);
}

.field-error {
  margin-top: 4px;
  color: var(--brand-danger);
  font-size: 12px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.hint {
  color: var(--brand-text-muted);
  font-size: 12px;
}

.edit-hint {
  margin: 8px 0 0;
  text-align: right;
}
</style>
