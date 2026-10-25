<script setup>
// 屋主首页，含「我的缺陷」列表（REQ-003 AC-001~016）。筛选与页码放在路由 query（status、page），
// 从详情返回、刷新、浏览器后退都能回到原位；列表是快照，不自动刷新。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  CATEGORIES,
  ERROR_CODES,
  ERROR_MESSAGES,
  LIST_PAGE_SIZE,
  LOCATIONS,
  STATUS_FILTERS,
  fetchDefects,
  labelOf,
  statusOf,
} from '@/api/defect'
import { ApiError } from '@/api/http'
import { formatDateTime } from '@/utils/format'
import UiButton from '@/components/UiButton.vue'

const route = useRoute()
const router = useRouter()
const displayName = history.state?.displayName

// 路由 query 里不合法的值按默认处理，不请求接口（接口会返回 400）
const statusFilter = computed(() => {
  const v = String(route.query.status ?? '')
  return STATUS_FILTERS.some((f) => f.value === v) ? v : ''
})
const pageNo = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 && n <= 2147483647 ? n : 1
})

// loading | error | forbidden | empty | emptyFiltered | ready
const phase = ref('loading')
const items = ref([])
const total = ref(0)
let seq = 0

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / LIST_PAGE_SIZE)))

function queryOf(status, page) {
  const query = {}
  if (status) query.status = status
  if (page > 1) query.page = String(page)
  return query
}

async function load() {
  const mine = ++seq
  phase.value = 'loading'
  try {
    const res = await fetchDefects({ statusFilter: statusFilter.value, pageNo: pageNo.value })
    if (mine !== seq) return
    const lastPage = Math.ceil(res.total / LIST_PAGE_SIZE)
    // AC-016：请求页码已超过最后一页，回到最后一页并重新请求，路由页码同步，不显示空表
    if (res.items.length === 0 && res.total > 0 && pageNo.value > lastPage) {
      router.replace({ name: 'home-owner', query: queryOf(statusFilter.value, lastPage) })
      return
    }
    items.value = res.items
    total.value = res.total
    if (res.total === 0) phase.value = statusFilter.value ? 'emptyFiltered' : 'empty' // AC-010
    else phase.value = 'ready'
  } catch (err) {
    if (mine !== seq) return
    phase.value = err instanceof ApiError && err.code === ERROR_CODES.AUTH_FORBIDDEN ? 'forbidden' : 'error' // AC-011、AC-013
  }
}

onMounted(load)
onBeforeUnmount(() => seq++)

function goto(status, page) {
  router.push({ name: 'home-owner', query: queryOf(status, page) })
}

function onFilterChange(e) {
  goto(e.target.value, 1) // AC-006：切换筛选回到第 1 页
}

function openDetail(item) {
  router.push({ name: 'defect-detail', params: { defectId: item.defectId } })
}
</script>

<template>
  <section class="home" data-testid="home-owner">
    <div class="card head">
      <div>
        <span class="badge" data-testid="home-role">OWNER</span>
        <h2 class="title" data-testid="home-title">屋主首页</h2>
        <p v-if="displayName" class="subtitle">你好，{{ displayName }}</p>
      </div>
    </div>

    <div class="card list-card">
      <div class="list-head">
        <h3 class="list-title">我的缺陷</h3>
        <UiButton variant="primary" data-testid="btn-new-defect" @click="router.push({ name: 'defect-new' })">提交缺陷</UiButton>
      </div>

      <div class="filter">
        <label for="filter">状态</label>
        <select id="filter" data-testid="filter" :value="statusFilter" @change="onFilterChange">
          <option v-for="f in STATUS_FILTERS" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>

      <div v-if="phase === 'loading'" class="state" aria-busy="true" data-testid="list-loading">加载中…</div>

      <div v-else-if="phase === 'error'" class="state error" role="alert" data-testid="list-error">
        <span data-testid="list-error-text">加载失败，请稍后重试</span>
        <UiButton data-testid="btn-retry" @click="load">重试</UiButton>
      </div>

      <div v-else-if="phase === 'forbidden'" class="state error" role="alert" data-testid="list-noperm">
        {{ ERROR_MESSAGES.AUTH_FORBIDDEN }}
      </div>

      <div v-else-if="phase === 'empty'" class="state" data-testid="list-empty">
        <span>你还没有提交过缺陷</span>
        <UiButton variant="primary" data-testid="btn-empty-new" @click="router.push({ name: 'defect-new' })">提交缺陷</UiButton>
      </div>

      <div v-else-if="phase === 'emptyFiltered'" class="state" data-testid="list-empty-filtered">
        <span>该状态下暂无缺陷</span>
        <UiButton data-testid="btn-clear-filter" @click="goto('', 1)">查看全部</UiButton>
      </div>

      <template v-else>
        <table class="table" data-testid="defect-table">
          <thead>
            <tr>
              <th>缺陷编号</th>
              <th>位置</th>
              <th>类别</th>
              <th>描述摘要</th>
              <th>状态</th>
              <th>提交时间</th>
            </tr>
          </thead>
          <tbody data-testid="rows">
            <tr
              v-for="item in items"
              :key="item.defectId"
              class="row"
              data-testid="defect-row"
              :data-defect-no="item.defectNo"
              @click="openDetail(item)"
            >
              <td class="no" data-testid="cell-no">
                <RouterLink :to="{ name: 'defect-detail', params: { defectId: item.defectId } }" @click.stop>{{ item.defectNo }}</RouterLink>
              </td>
              <td data-testid="cell-location">{{ labelOf(LOCATIONS, item.location) }}</td>
              <td data-testid="cell-category">{{ labelOf(CATEGORIES, item.category) }}</td>
              <!-- 摘要由服务端生成，按纯文本渲染（AC-007） -->
              <td class="summary" data-testid="cell-summary">{{ item.descriptionSummary }}</td>
              <td data-testid="cell-status">
                <span class="tag" :class="statusOf(item.status).tone">{{ statusOf(item.status).label }}</span>
              </td>
              <td class="time" data-testid="cell-time">{{ formatDateTime(item.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="pager">
          <span data-testid="pager-total">共 {{ total }} 条</span>
          <UiButton data-testid="pg-prev" :disabled="pageNo <= 1" @click="goto(statusFilter, pageNo - 1)">上一页</UiButton>
          <span data-testid="pager-page">第 {{ pageNo }} / {{ totalPages }} 页</span>
          <UiButton data-testid="pg-next" :disabled="pageNo >= totalPages" @click="goto(statusFilter, pageNo + 1)">下一页</UiButton>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1000px;
}

.card {
  padding: 24px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-surface);
  box-shadow: var(--brand-shadow-md);
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--brand-radius-sm);
  background: var(--brand-success-tint);
  color: var(--brand-success-text);
  font-size: 12px;
  font-weight: 600;
}

.title {
  margin: 12px 0 4px;
  font-size: 22px;
}

.subtitle {
  margin: 0;
  color: var(--brand-text-secondary);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  margin: 0;
  font-size: 18px;
}

.filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  color: var(--brand-text-secondary);
}

.filter select {
  height: 36px;
  min-width: 140px;
  padding: 0 10px;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-surface);
  color: var(--brand-text-primary);
  font: inherit;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--brand-text-secondary);
}

.state.error {
  color: var(--brand-danger);
}

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.table th,
.table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--brand-border);
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere; /* 无空格的超长摘要在单元格内换行，不撑破表格 */
}

.table th {
  color: var(--brand-text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.table th:nth-child(1) { width: 110px; }
.table th:nth-child(2) { width: 90px; }
.table th:nth-child(3) { width: 110px; }
.table th:nth-child(5) { width: 80px; }
.table th:nth-child(6) { width: 140px; }

.row {
  cursor: pointer;
}

.row:hover {
  background: var(--brand-bg);
}

.no a {
  color: var(--brand-accent);
  text-decoration: none;
}

.time {
  color: var(--brand-text-secondary);
  white-space: nowrap;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--brand-radius-sm);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.tag.warn {
  background: var(--brand-status-warn-tint);
  color: var(--brand-status-warn);
}

.tag.info {
  background: var(--brand-info-tint);
  color: var(--brand-info-text);
}

.tag.neutral {
  background: var(--brand-status-neutral-tint);
  color: var(--brand-status-neutral);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  color: var(--brand-text-secondary);
}
</style>
