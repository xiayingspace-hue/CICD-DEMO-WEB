<script setup>
// 通用按钮。data-testid、disabled、onClick 等属性透传到根 <button>。
defineProps({
  variant: { type: String, default: 'default' }, // default | primary | danger | danger-text
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button :type="type" class="btn" :class="`btn-${variant}`"><slot /></button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--brand-border-strong);
  border-radius: var(--brand-radius);
  background: var(--brand-surface);
  color: var(--brand-text-primary);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--brand-ease), border-color var(--brand-ease), box-shadow var(--brand-ease);
}

.btn:hover:not(:disabled) {
  background: var(--brand-nav-hover-bg);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--brand-focus-ring);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary {
  border-color: var(--brand-accent);
  background: var(--brand-accent);
  color: var(--brand-on-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-accent);
  box-shadow: var(--brand-shadow-accent);
}

.btn-danger {
  border-color: var(--brand-danger);
  background: var(--brand-danger);
  color: var(--brand-on-accent);
}

.btn-danger:hover:not(:disabled) {
  background: var(--brand-danger);
  box-shadow: var(--brand-shadow-sm);
}

.btn-danger-text {
  border-color: transparent;
  background: transparent;
  color: var(--brand-danger);
}

.btn-danger-text:hover:not(:disabled) {
  background: var(--brand-danger-tint);
}
</style>
