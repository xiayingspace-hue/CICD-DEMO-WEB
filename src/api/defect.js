// 屋主缺陷接口，见 CONTEXT outputs/api/API-defect-002-user.md、API-defect-003-user.md
import { request } from './http'

export const ERROR_CODES = {
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  DEFECT_NO_UNIT: 'DEFECT_NO_UNIT',
  DEFECT_VALIDATION_FAILED: 'DEFECT_VALIDATION_FAILED',
  DEFECT_DLP_EXPIRED: 'DEFECT_DLP_EXPIRED',
  DEFECT_NOT_FOUND: 'DEFECT_NOT_FOUND',
  DEFECT_LOCKED: 'DEFECT_LOCKED',
  DEFECT_WITHDRAWN: 'DEFECT_WITHDRAWN',
  DEFECT_IMAGE_TYPE_INVALID: 'DEFECT_IMAGE_TYPE_INVALID',
  DEFECT_IMAGE_TOO_LARGE: 'DEFECT_IMAGE_TOO_LARGE',
}

// 错误 code → 展示文案（接口清单各接口「展示文案」列）
export const ERROR_MESSAGES = {
  AUTH_FORBIDDEN: '无权限执行此操作',
  DEFECT_NO_UNIT: '账号未绑定单元，请联系 CSO',
  DEFECT_DLP_EXPIRED: '缺陷责任期已结束，不能再提交缺陷',
  DEFECT_NOT_FOUND: '缺陷不存在',
  DEFECT_LOCKED: '缺陷已派单，不能修改或撤回',
  DEFECT_WITHDRAWN: '缺陷已撤回',
  DEFECT_IMAGE_TYPE_INVALID: '仅支持 jpg、png 格式',
  DEFECT_IMAGE_TOO_LARGE: '单张图片不能超过 10MB',
}
export const NETWORK_MESSAGE = '网络异常，请稍后重试'

// 需求第 7 章
export const LIMITS = {
  descMax: 500,
  imagesMax: 5,
  imageBytesMax: 10 * 1024 * 1024,
  exts: ['jpg', 'jpeg', 'png'],
}

// 需求第 9 章：提交操作（不含图片上传）超过 10 秒视为网络异常；图片上传不受此限
const UPLOAD_TIMEOUT_MS = 120000

export const LOCATIONS = [
  { value: 'LIVING_ROOM', label: '客厅' },
  { value: 'BEDROOM', label: '卧室' },
  { value: 'KITCHEN', label: '厨房' },
  { value: 'BATHROOM', label: '卫生间' },
  { value: 'BALCONY', label: '阳台' },
  { value: 'CORRIDOR', label: '走廊' },
  { value: 'ENTRANCE_DOOR', label: '入户门' },
  { value: 'OTHER', label: '其他' },
]

export const CATEGORIES = [
  { value: 'WALL_CEILING', label: '墙面与天花' },
  { value: 'FLOOR', label: '地面' },
  { value: 'DOOR_WINDOW', label: '门窗' },
  { value: 'PLUMBING_ELECTRICAL', label: '水电' },
  { value: 'SANITARY', label: '卫浴' },
  { value: 'CABINET_FURNITURE', label: '橱柜与家具' },
  { value: 'PAINT', label: '油漆' },
  { value: 'OTHER', label: '其他' },
]

export function labelOf(list, value) {
  return list.find((i) => i.value === value)?.label ?? value
}

// 状态枚举（接口清单）。无法识别的后续状态：标签「处理中」，只能查看（AC-017）
export const STATUS = {
  PENDING_DISPATCH: { label: '待派单', tone: 'warn', lockNote: '' },
  DISPATCHED: { label: '已派单', tone: 'info', lockNote: '缺陷已派单，只能查看。' },
  WITHDRAWN: {
    label: '已撤回',
    tone: 'neutral',
    lockNote: '缺陷已撤回，只能查看。需要重新报告同一问题，请提交新缺陷。',
  },
}
export const UNKNOWN_STATUS = { label: '处理中', tone: 'info', lockNote: '缺陷已进入处理流程，只能查看。' }

export function statusOf(status) {
  return Object.hasOwn(STATUS, status) ? STATUS[status] : UNKNOWN_STATUS
}

/** GET /owner/submit-context → { unitName, dlpEndDate, canSubmit } */
export function fetchSubmitContext() {
  return request('/owner/submit-context', { auth: true })
}

/** POST /defect-images（multipart）→ { imageId, url } */
export function uploadImage(file) {
  const body = new FormData()
  body.append('file', file)
  return request('/defect-images', { method: 'POST', body, auth: true, timeout: UPLOAD_TIMEOUT_MS })
}

/** payload：{ location, category, description, imageIds } */
export function createDefect(payload) {
  return request('/defects', { method: 'POST', body: payload, auth: true })
}

export function fetchDefect(defectId) {
  return request(`/defects/${encodeURIComponent(defectId)}`, { auth: true })
}

export function updateDefect(defectId, payload) {
  return request(`/defects/${encodeURIComponent(defectId)}`, { method: 'PUT', body: payload, auth: true })
}

export function withdrawDefect(defectId) {
  return request(`/defects/${encodeURIComponent(defectId)}/withdraw`, { method: 'POST', auth: true })
}

// REQ-003 状态筛选项（需求第 5 章）；value 为接口 statusFilter 枚举，空串表示全部
export const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'PENDING_DISPATCH', label: '待派单' },
  { value: 'DISPATCHED', label: '已派单' },
  { value: 'IN_PROGRESS', label: '处理中' },
  { value: 'WITHDRAWN', label: '已撤回' },
]

export const LIST_PAGE_SIZE = 20

/** GET /defects → { items, pageNo, pageSize, total }；statusFilter 为空串时不传（全部） */
export function fetchDefects({ statusFilter = '', pageNo = 1 } = {}) {
  const params = new URLSearchParams({ pageNo: String(pageNo), pageSize: String(LIST_PAGE_SIZE) })
  if (statusFilter) params.set('statusFilter', statusFilter)
  return request(`/defects?${params}`, { auth: true })
}
