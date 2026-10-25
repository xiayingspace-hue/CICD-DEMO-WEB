// 需求第 9 章：所有时间按新加坡时间展示，格式 DD/MM/YYYY HH:mm

const sgFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Singapore',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso ?? ''
  const p = Object.fromEntries(sgFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function formatDate(date) {
  const [y, m, d] = String(date).split('-')
  return y && m && d ? `${d}/${m}/${y}` : date
}

/** 描述字数按 Unicode 码点计（需求第 7 章；与后端口径一致） */
export function charLength(s) {
  return Array.from(s).length
}
