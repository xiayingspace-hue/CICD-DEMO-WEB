// REQ-002 缺陷接口 mock。路径、字段、code、HTTP 状态、校验顺序取自
// CONTEXT outputs/api/API-defect-002-user.md 与需求第 8 章（AC-028）。
import { http, HttpResponse, delay } from 'msw'
import { ACCOUNTS, isEnabled } from './accounts'
import { parseToken } from './token'

const BASE = import.meta.env.VITE_API_BASE
const LATENCY_MS = 500
const DESC_MAX = 500
const IMAGES_MAX = 5
const IMAGE_BYTES_MAX = 10 * 1024 * 1024
const LOCATIONS = ['LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'BALCONY', 'CORRIDOR', 'ENTRANCE_DOOR', 'OTHER']
const CATEGORIES = ['WALL_CEILING', 'FLOOR', 'DOOR_WINDOW', 'PLUMBING_ELECTRICAL', 'SANITARY', 'CABINET_FURNITURE', 'PAINT', 'OTHER']

// 单元：账号 → { unitName, dlpEndDate }；owner-nounit 没有单元
const sgToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
const units = {
  owner01: { unitName: '碧湖苑 12 栋 08-15', dlpEndDate: '2027-03-31' },
  owner02: { unitName: '碧湖苑 12 栋 09-02', dlpEndDate: '2027-03-31' },
  'owner-expired': { unitName: '碧湖苑 3 栋 02-01', dlpEndDate: '2026-09-30' },
  'owner-lastday': { unitName: '碧湖苑 5 栋 05-05', dlpEndDate: sgToday() },
  'owner-revoke': { unitName: '碧湖苑 6 栋 06-06', dlpEndDate: '2027-03-31' },
  'owner-list': { unitName: '碧湖苑 1 栋 01-01', dlpEndDate: '2027-03-31' },
  'owner-bulk': { unitName: '碧湖苑 2 栋 02-02', dlpEndDate: '2027-03-31' },
  'owner-empty': { unitName: '碧湖苑 4 栋 04-04', dlpEndDate: '2027-03-31' },
}

const nowIso = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19) + '+08:00'
const dlpExpired = (account) => units[account].dlpEndDate < sgToday()

// REQ-003 状态筛选：IN_PROGRESS = 已派单之后、未单独列出的所有状态
const LIST_FILTERS = {
  PENDING_DISPATCH: (s) => s === 'PENDING_DISPATCH',
  DISPATCHED: (s) => s === 'DISPATCHED',
  WITHDRAWN: (s) => s === 'WITHDRAWN',
  IN_PROGRESS: (s) => !['PENDING_DISPATCH', 'DISPATCHED', 'WITHDRAWN'].includes(s),
}

// 描述摘要（需求第 5 章）：前 50 个码点；截断点落在组合 emoji 中间时整体舍去；换行换成空格；超过 50 个码点加「…」
function summarize(description) {
  const total = Array.from(description).length
  let count = 0
  let out = ''
  for (const { segment } of new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(description)) {
    const n = Array.from(segment).length
    if (count + n > 50) break
    count += n
    out += segment
  }
  return out.replace(/\r\n|\r|\n/g, ' ') + (total > 50 ? '…' : '')
}

let seq = 100
const defects = new Map() // defectId → { owner, ...详情字段 }
const images = new Map() // imageId → { owner, url, usedBy }

function seed() {
  const mk = (id, owner, status, extra = {}) =>
    defects.set(id, {
      owner,
      defectId: id,
      defectNo: `DF-${String(++seq).padStart(6, '0')}`,
      unitName: units[owner].unitName,
      location: 'KITCHEN',
      category: 'PLUMBING_ELECTRICAL',
      description: '厨房水槽下方水管接口渗水，柜内底板已有水渍。\n拍摄于 2026-10-20 晚上。',
      images: [],
      status,
      submittedAt: '2026-10-20T21:12:00+08:00',
      lastModifiedAt: '2026-10-20T21:12:00+08:00',
      ...extra,
    })
  mk('seed-pending', 'owner01', 'PENDING_DISPATCH')
  mk('seed-dispatched', 'owner01', 'DISPATCHED', { location: 'BEDROOM', category: 'DOOR_WINDOW', description: '主卧窗户关不紧，大风时有缝隙。' })
  mk('seed-withdrawn', 'owner01', 'WITHDRAWN', { description: '已撤回的缺陷。' })
  mk('seed-unknown', 'owner01', 'REWORKING', { description: '后续需求新增的状态（模拟）。' })
  mk('seed-other', 'owner02', 'PENDING_DISPATCH', { description: '另一位屋主的缺陷。' })
  mk('seed-expired', 'owner-expired', 'PENDING_DISPATCH', { description: 'DLP 到期屋主预置的待派单缺陷（AC-020）。' })
}
seed()

// REQ-003 列表数据。按 QA 约定：owner-list 25 条（各状态、同一提交时间、各类摘要边界），owner-bulk 45 条（待派单 21 条）
function seedList() {
  const base = Date.UTC(2026, 9, 1, 1, 30) // 2026-10-01T01:30:00Z = 新加坡 09:30
  const at = (i) => new Date(base + i * 3600 * 1000 * 5 + 8 * 3600 * 1000).toISOString().slice(0, 19) + '+08:00'
  const long = '厨房水槽下方水管接口渗水，柜内底板已有水渍并且发霉，请尽快安排人员上门处理，谢谢你们的帮助。'
  const descs = [
    long,
    `第一行描述内容\n第二行描述内容，继续写一些字让它超过五十个字符的长度限制，方便验证摘要截取。`,
    `Windows 换行第一行\r\n第二行内容，继续写一些字让它超过五十个字符的长度限制，方便验证摘要。`,
    '连续两个换行\n\n之后继续写一些字，让它超过五十个字符的长度限制，用来验证连续换行不被合并为一个空格。',
    '一'.repeat(50),
    '短描述',
    '1234567890123456789012345678901234567890123456789🔧后面还有内容',
    '一'.repeat(49) + '👍🏽后面还有内容',
    '一'.repeat(48) + '👍🏽',
    '<script>alert(1)</script>这段描述含有脚本标签，应按文字原样显示而不是执行，且描述超过五十个字符。',
    'A'.repeat(120),
  ]
  const statuses = ['PENDING_DISPATCH', 'DISPATCHED', 'WITHDRAWN', 'FUTURE_STATUS']
  const mk = (owner, i, status, description) => {
    const id = `list-${owner}-${i}`
    defects.set(id, {
      owner,
      defectId: id,
      defectNo: `DF-${String(++seq).padStart(6, '0')}`,
      unitName: units[owner].unitName,
      location: LOCATIONS[i % LOCATIONS.length],
      category: CATEGORIES[i % CATEGORIES.length],
      description,
      images: [],
      status,
      submittedAt: at(i),
      lastModifiedAt: at(i),
    })
  }
  for (let i = 0; i < 25; i++) mk('owner-list', i, statuses[i % statuses.length], descs[i % descs.length])
  // 提交时间完全相同的两条（编号大的在前）
  defects.get('list-owner-list-1').submittedAt = defects.get('list-owner-list-0').submittedAt
  // 45 条：待派单恰好 21 条
  for (let i = 0; i < 45; i++) mk('owner-bulk', i, i < 21 ? 'PENDING_DISPATCH' : statuses[1 + (i % 3)], `批量缺陷 ${i + 1}：${long}`)
}
seedList()

const json = (body, status = 200) => HttpResponse.json(body, { status })
const err = (code, message, status, extra = {}) => json({ code, message, ...extra }, status)
const unauthenticated = () => err('AUTH_UNAUTHENTICATED', '未登录', 401)
const forbidden = () => err('AUTH_FORBIDDEN', '无权限执行此操作', 403)
const notFound = () => err('DEFECT_NOT_FOUND', '缺陷不存在', 404)
const noUnit = () => err('DEFECT_NO_UNIT', '账号未绑定单元，请联系 CSO', 403)

// 401 → 403（角色）。通过时返回 { account }，否则返回应直接响应的 Response
function authenticate(request) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '')
  const parsed = parseToken(token)
  if (!parsed || !Object.hasOwn(ACCOUNTS, parsed.account) || !isEnabled(parsed.account)) return { res: unauthenticated() }
  if (ACCOUNTS[parsed.account].role !== 'OWNER') return { res: forbidden() }
  return { account: parsed.account }
}

function view(d) {
  const { owner: _owner, ...rest } = d
  return { ...rest, images: d.images.map((id) => ({ imageId: id, url: images.get(id).url })), editable: d.status === 'PENDING_DISPATCH' }
}

// 校验请求体。imageIds 无效：不存在、非本人、被其他缺陷占用
function validate(body, account, defectId) {
  const fieldErrors = []
  const b = body && typeof body === 'object' ? body : {}
  if (!LOCATIONS.includes(b.location)) fieldErrors.push({ field: 'location', message: '请选择缺陷位置' })
  if (!CATEGORIES.includes(b.category)) fieldErrors.push({ field: 'category', message: '请选择缺陷类别' })
  const desc = typeof b.description === 'string' ? b.description.trim() : ''
  if (!desc) fieldErrors.push({ field: 'description', message: '请填写缺陷描述' })
  else if (Array.from(desc).length > DESC_MAX) fieldErrors.push({ field: 'description', message: '描述不能超过 500 字' })
  const ids = b.imageIds ?? []
  if (!Array.isArray(ids) || ids.length > IMAGES_MAX) fieldErrors.push({ field: 'imageIds', message: '最多上传 5 张图片' })
  else if (ids.some((id) => !images.has(id) || images.get(id).owner !== account || (images.get(id).usedBy && images.get(id).usedBy !== defectId)))
    fieldErrors.push({ field: 'imageIds', message: '图片无效，请重新上传' })
  return fieldErrors.length ? err('DEFECT_VALIDATION_FAILED', '校验不通过', 400, { fieldErrors }) : null
}

function applyBody(d, body) {
  const next = { location: body.location, category: body.category, description: body.description.trim(), images: body.imageIds ?? [] }
  const changed = ['location', 'category', 'description'].some((k) => next[k] !== d[k]) || next.images.join() !== d.images.join()
  d.images.forEach((id) => (images.get(id).usedBy = null))
  Object.assign(d, next)
  d.images.forEach((id) => (images.get(id).usedBy = d.defectId))
  if (changed) d.lastModifiedAt = nowIso()
}

// 找缺陷：不存在、他人的、标识格式不合法都按 404（AC-021、AC-028）
function findOwn(account, defectId) {
  const d = defects.get(defectId)
  return d && d.owner === account ? d : null
}

function lockedResponse(d) {
  if (d.status === 'WITHDRAWN') return err('DEFECT_WITHDRAWN', '缺陷已撤回', 409)
  if (d.status !== 'PENDING_DISPATCH') return err('DEFECT_LOCKED', '缺陷已派单，不能修改或撤回', 409)
  return null
}

async function toDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return `data:${file.type || 'image/png'};base64,${btoa(bin)}`
}

export const defectHandlers = [

  // REQ-003 列表。校验口径见需求第 7 章；401 → 403 → 400（第 8 章）
  http.get(`${BASE}/defects`, async ({ request }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const q = new URL(request.url).searchParams
    const statusFilter = q.get('statusFilter') || ''
    const pageNoRaw = q.get('pageNo')
    const pageSizeRaw = q.get('pageSize')
    const fieldErrors = []
    if (statusFilter && !LIST_FILTERS[statusFilter]) fieldErrors.push({ field: 'statusFilter', message: '状态筛选条件不正确' })
    const pageNo = pageNoRaw === null ? 1 : /^\d+$/.test(pageNoRaw) ? Number(pageNoRaw) : 0
    if (pageNo < 1 || pageNo > 2147483647) fieldErrors.push({ field: 'pageNo', message: '页码不正确' })
    const pageSize = pageSizeRaw === null ? 20 : /^\d+$/.test(pageSizeRaw) ? Number(pageSizeRaw) : 0
    if (pageSize < 1 || pageSize > 100) fieldErrors.push({ field: 'pageSize', message: '每页条数不正确' })
    if (fieldErrors.length) return err('DEFECT_VALIDATION_FAILED', '校验不通过', 400, { fieldErrors })

    // 范围只由登录身份决定；排序：提交时间倒序，相同时编号大的在前
    const match = statusFilter ? LIST_FILTERS[statusFilter] : () => true
    const all = [...defects.values()]
      .filter((d) => d.owner === a.account && match(d.status))
      .sort((x, y) => Date.parse(y.submittedAt) - Date.parse(x.submittedAt) || y.defectNo.localeCompare(x.defectNo))
    const items = all.slice((pageNo - 1) * pageSize, pageNo * pageSize).map((d) => ({
      defectId: d.defectId,
      defectNo: d.defectNo,
      location: d.location,
      category: d.category,
      descriptionSummary: summarize(d.description),
      status: d.status,
      submittedAt: d.submittedAt,
    }))
    return json({ items, pageNo, pageSize, total: all.length })
  }),
  http.get(`${BASE}/owner/submit-context`, async ({ request }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const unit = units[a.account]
    if (!unit) return noUnit() // AC-027
    return json({ unitName: unit.unitName, dlpEndDate: unit.dlpEndDate, canSubmit: !dlpExpired(a.account) })
  }),

  http.post(`${BASE}/defect-images`, async ({ request }) => {
    await delay(LATENCY_MS * 2)
    const a = authenticate(request)
    if (a.res) return a.res
    const form = await request.formData()
    const file = form.get('file')
    const ext = file && file.name ? file.name.split('.').pop().toLowerCase() : ''
    if (!(file instanceof File) || file.size === 0 || !['jpg', 'jpeg', 'png'].includes(ext))
      return err('DEFECT_IMAGE_TYPE_INVALID', '仅支持 jpg、png 格式', 400)
    if (file.size > IMAGE_BYTES_MAX) return err('DEFECT_IMAGE_TOO_LARGE', '单张图片不能超过 10MB', 400)
    // 文件名含 fail 的图片模拟上传失败（5xx），便于验证 AC-011、AC-025
    if (/fail/i.test(file.name)) return new HttpResponse('Internal Server Error', { status: 500 })
    const imageId = `img-${++seq}`
    const url = await toDataUrl(file)
    images.set(imageId, { owner: a.account, url, usedBy: null })
    return json({ imageId, url })
  }),

  http.post(`${BASE}/defects`, async ({ request }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const unit = units[a.account]
    if (!unit) return noUnit()
    if (dlpExpired(a.account)) return err('DEFECT_DLP_EXPIRED', '缺陷责任期已结束，不能再提交缺陷', 403) // AC-012、AC-028
    let body = null
    try {
      body = await request.json()
    } catch {
      // 非 JSON 按空请求体校验
    }
    const bad = validate(body, a.account)
    if (bad) return bad
    const id = `d-${++seq}`
    const t = nowIso()
    // 单元一律取自账号，忽略请求里的 unitId（AC-008）
    const d = { owner: a.account, defectId: id, defectNo: `DF-${String(seq).padStart(6, '0')}`, unitName: unit.unitName, status: 'PENDING_DISPATCH', submittedAt: t, lastModifiedAt: t, images: [], location: '', category: '', description: '' }
    applyBody(d, body)
    d.lastModifiedAt = t
    defects.set(id, d)
    return json(view(d))
  }),

  http.get(`${BASE}/defects/:defectId`, async ({ request, params }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const d = findOwn(a.account, params.defectId)
    return d ? json(view(d)) : notFound()
  }),

  http.put(`${BASE}/defects/:defectId`, async ({ request, params }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const d = findOwn(a.account, params.defectId)
    if (!d) return notFound()
    const locked = lockedResponse(d) // 已锁定优先于校验（AC-028）
    if (locked) return locked
    let body = null
    try {
      body = await request.json()
    } catch {
      // 同上
    }
    const bad = validate(body, a.account, d.defectId)
    if (bad) return bad
    applyBody(d, body)
    return json(view(d))
  }),

  http.post(`${BASE}/defects/:defectId/withdraw`, async ({ request, params }) => {
    await delay(LATENCY_MS)
    const a = authenticate(request)
    if (a.res) return a.res
    const d = findOwn(a.account, params.defectId)
    if (!d) return notFound()
    const locked = lockedResponse(d)
    if (locked) return locked
    d.status = 'WITHDRAWN'
    return json(view(d))
  }),
]

// 控制台 / E2E 用：模拟派单、改 DLP 截止日（AC-012、AC-017、AC-018）
export const defectMockControls = {
  setStatus: (defectId, status) => {
    const d = defects.get(defectId)
    if (d) d.status = status
  },
  setDlpEnd: (account, date) => {
    if (units[account]) units[account].dlpEndDate = date === 'today' ? sgToday() : date
  },
  list: () => [...defects.values()].map(({ owner, defectId, defectNo, status }) => ({ owner, defectId, defectNo, status })),
}
