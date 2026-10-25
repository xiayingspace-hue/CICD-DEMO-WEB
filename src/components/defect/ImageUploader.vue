<script setup>
// 缺陷图片上传（REQ-002 AC-004、AC-011、AC-025）。
// images 项：{ key, name, file?, status: 'uploading'|'done'|'failed', imageId?, url?, preview? }
import { onBeforeUnmount } from 'vue'
import { LIMITS, uploadImage } from '@/api/defect'

const images = defineModel('images', { type: Array, required: true })
const error = defineModel('error', { type: String, default: '' })
defineProps({ disabled: { type: Boolean, default: false } })

let seq = 0

function checkFile(file) {
  if (images.value.length >= LIMITS.imagesMax) return '最多上传 5 张图片'
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!LIMITS.exts.includes(ext)) return '仅支持 jpg、png 格式'
  if (file.size > LIMITS.imageBytesMax) return '单张图片不能超过 10MB'
  return ''
}

async function upload(item) {
  item.status = 'uploading'
  try {
    const res = await uploadImage(item.file)
    item.imageId = res.imageId
    item.url = res.url
    item.status = 'done'
  } catch {
    item.status = 'failed' // AC-011：单张失败不影响其他
  }
}

function onPick(e) {
  error.value = ''
  // 一次选多张超过名额时，按选择顺序加入名额内的，超出的提示（需求第 8 章）
  for (const file of Array.from(e.target.files)) {
    const msg = checkFile(file)
    if (msg) {
      error.value = msg
      continue
    }
    const item = {
      key: `u${++seq}`,
      name: file.name,
      file,
      status: 'uploading',
      preview: URL.createObjectURL(file),
    }
    images.value.push(item)
    // 经 images 取到响应式代理再上传，状态变化才会触发渲染
    upload(images.value[images.value.length - 1])
  }
  e.target.value = ''
}

function remove(item) {
  images.value = images.value.filter((i) => i !== item)
  if (item.preview) URL.revokeObjectURL(item.preview)
  error.value = ''
}

function retry(item) {
  upload(item)
}

onBeforeUnmount(() => {
  images.value.forEach((i) => i.preview && URL.revokeObjectURL(i.preview))
})
</script>

<template>
  <div>
    <div class="thumbs" data-testid="thumbs">
      <div
        v-for="(img, idx) in images"
        :key="img.key"
        class="thumb"
        :class="img.status"
        :data-testid="`thumb-${idx}`"
        :data-status="img.status"
      >
        <img v-if="img.preview || img.url" :src="img.preview || img.url" alt="缺陷图片" />
        <span v-if="img.status === 'uploading'" class="mask">上传中…</span>
        <template v-if="img.status === 'failed'">
          <span class="mask failed">上传失败</span>
          <button type="button" class="retry" data-testid="thumb-retry" @click="retry(img)">重试</button>
        </template>
        <button type="button" class="remove" data-testid="thumb-remove" aria-label="删除图片" @click="remove(img)">×</button>
      </div>

      <!-- 满 5 张后入口保持可点（仅置灰样式），选择文件时提示「最多上传 5 张图片」（AC-004，CONTEXT#9） -->
      <label
        class="thumb add"
        :class="{ disabled, full: images.length >= LIMITS.imagesMax }"
        data-testid="btn-add-image"
      >
        + 添加图片
        <input
          type="file"
          multiple
          accept=".jpg,.jpeg,.png"
          class="file-input"
          data-testid="file-input"
          :disabled="disabled"
          @change="onPick"
        />
      </label>
    </div>
    <p class="hint">最多 5 张，格式 jpg、png，单张不超过 10MB。上传失败的图片不会随缺陷提交。</p>
  </div>
</template>

<style scoped>
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  color: var(--brand-text-secondary);
  font-size: 12px;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb.failed {
  border-color: var(--brand-danger);
}

.mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-overlay);
  color: var(--brand-on-accent);
}

.mask.failed {
  background: var(--brand-danger-tint);
  color: var(--brand-danger);
  padding-bottom: 24px;
}

.retry {
  position: absolute;
  bottom: 8px;
  padding: 0 8px;
  border: 1px solid var(--brand-danger);
  border-radius: var(--brand-radius-sm);
  background: var(--brand-surface);
  color: var(--brand-danger);
  font: inherit;
  cursor: pointer;
}

.remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--brand-overlay);
  color: var(--brand-on-accent);
  line-height: 20px;
  cursor: pointer;
}

.add {
  border-style: dashed;
  cursor: pointer;
}

.add:hover:not(.disabled),
.add:focus-within {
  border-color: var(--brand-accent);
  color: var(--brand-accent);
}

.add.full {
  opacity: 0.55;
}

.add.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}

.hint {
  margin: 8px 0 0;
  color: var(--brand-text-muted);
  font-size: 12px;
}
</style>
