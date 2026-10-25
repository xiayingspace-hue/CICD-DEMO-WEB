<script setup>
// 屋主端外壳：侧栏（首页、提交缺陷）+ 内容区。REQ-002 AC-001。
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">缺陷管理平台</div>
      <nav class="nav" aria-label="屋主导航">
        <RouterLink :to="{ name: 'home-owner' }" class="nav-item" data-testid="nav-home">首页</RouterLink>
        <RouterLink :to="{ name: 'defect-new' }" class="nav-item" data-testid="nav-new">提交缺陷</RouterLink>
      </nav>
    </aside>
    <main class="content">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  min-width: 1280px;
}

.sidebar {
  flex: none;
  width: 220px;
  padding: 24px 12px;
  background: var(--brand-sidebar);
  color: var(--brand-sidebar-text);
}

.brand {
  margin: 0 12px 24px;
  color: var(--brand-sidebar-text-active);
  font-size: 16px;
  font-weight: 600;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  padding: 8px 12px;
  border-radius: var(--brand-radius);
  color: var(--brand-sidebar-text);
  text-decoration: none;
  transition: background var(--brand-ease);
}

.nav-item:hover {
  background: var(--brand-sidebar-hover-bg);
}

.nav-item.router-link-exact-active {
  background: var(--brand-sidebar-active-bg);
  color: var(--brand-sidebar-text-active);
}

.content {
  flex: 1;
  min-width: 0;
  padding: 32px 40px;
}
</style>
