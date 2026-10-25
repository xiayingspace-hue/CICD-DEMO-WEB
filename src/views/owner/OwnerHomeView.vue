<script setup>
// 屋主首页。「我的缺陷」列表不在 REQ-002 范围（需求第 11 章已知缺口），这里只放提交入口。
import { useRouter } from 'vue-router'
import UiButton from '@/components/UiButton.vue'

const router = useRouter()
const displayName = history.state?.displayName
</script>

<template>
  <section class="home" data-testid="home-owner">
    <div class="card">
      <span class="badge" data-testid="home-role">OWNER</span>
      <h2 class="title" data-testid="home-title">屋主首页</h2>
      <p v-if="displayName" class="subtitle">你好，{{ displayName }}</p>
    </div>

    <div class="card entry">
      <p class="entry-title">发现房屋问题？</p>
      <p class="entry-hint">提交后缺陷进入「待派单」，由 CSO 派单给分包处理。</p>
      <UiButton variant="primary" data-testid="btn-new-defect" @click="router.push({ name: 'defect-new' })">提交缺陷</UiButton>
    </div>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
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

.entry-title {
  margin: 0 0 4px;
  font-weight: 600;
}

.entry-hint {
  margin: 0 0 16px;
  color: var(--brand-text-secondary);
}
</style>
