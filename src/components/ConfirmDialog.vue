<script setup>
// 确认框。标题、正文、按钮文案由调用方传入（文案定义见需求第 8 章「确认框文案」）。
import { nextTick, ref, watch } from 'vue'
import UiButton from './UiButton.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  cancelText: { type: String, required: true },
  confirmText: { type: String, required: true },
  danger: { type: Boolean, default: false },
  testid: { type: String, required: true }, // 例如 m-submit，按钮为 `${testid}-cancel` / `${testid}-confirm`
})
const emit = defineEmits(['cancel', 'confirm'])

const cancelBtn = ref(null)
watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    cancelBtn.value?.$el.focus()
  },
)
</script>

<template>
  <div v-if="open" class="overlay" :data-testid="testid" @keydown.esc="emit('cancel')">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="title">
      <h3 class="modal-title" :class="{ danger }">{{ title }}</h3>
      <p class="modal-text">{{ text }}</p>
      <div class="modal-actions">
        <UiButton ref="cancelBtn" :data-testid="`${testid}-cancel`" @click="emit('cancel')">{{ cancelText }}</UiButton>
        <UiButton :variant="danger ? 'danger' : 'primary'" :data-testid="`${testid}-confirm`" @click="emit('confirm')">{{ confirmText }}</UiButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-overlay);
}

.modal {
  width: 420px;
  max-width: calc(100vw - 32px);
  padding: 24px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-surface);
  box-shadow: var(--brand-shadow-lg);
}

.modal-title {
  margin: 0 0 8px;
  font-size: 16px;
}

.modal-title.danger {
  color: var(--brand-danger);
}

.modal-text {
  margin: 0;
  color: var(--brand-text-secondary);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
