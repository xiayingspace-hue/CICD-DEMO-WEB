import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/auth/LoginView.vue'
import RoleHomeView from '@/views/home/RoleHomeView.vue'
import { HOME_BY_ROLE } from './homes'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: LoginView },
  ...Object.entries(HOME_BY_ROLE).map(([role, home]) => ({
    path: home.path,
    name: home.name,
    component: RoleHomeView,
    props: { role, title: home.title },
  })),
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
