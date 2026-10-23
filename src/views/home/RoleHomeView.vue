<script setup>
// 三个角色首页的占位，真实内容待 defect 需求（REQ-001 第 11 章缺口；路径见 CONTEXT#4）
defineProps({
  role: { type: String, required: true },
  title: { type: String, required: true },
})

const displayName = history.state?.displayName
</script>

<template>
  <section class="landing" :data-testid="`home-${role.toLowerCase()}`">
    <div class="card">
      <span class="badge" data-testid="home-role">{{ role }}</span>
      <h2 class="title" data-testid="home-title">{{ title }}</h2>
      <p v-if="displayName" class="subtitle">你好，{{ displayName }}</p>
    </div>
  </section>
</template>

<style scoped>
.landing {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48px;
}

.card {
  min-width: 360px;
  padding: 40px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-surface);
  box-shadow: var(--brand-shadow-md);
  text-align: center;
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
</style>
