<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100vh;
}

body {
  background: var(--brand-bg);
  color: var(--brand-text-primary);
  font-family: var(--brand-font);
  font-size: 14px;
  line-height: 1.5;
}
</style>
