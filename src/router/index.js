import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/auth/LoginView.vue'
import RoleHomeView from '@/views/home/RoleHomeView.vue'
import OwnerLayout from '@/views/owner/OwnerLayout.vue'
import OwnerHomeView from '@/views/owner/OwnerHomeView.vue'
import DefectFormView from '@/views/owner/DefectFormView.vue'
import DefectDetailView from '@/views/owner/DefectDetailView.vue'
import { HOME_BY_ROLE } from './homes'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'login', component: LoginView },
  // 屋主端：首页 + REQ-002 提交、详情、修改（首页路径取自 HOME_BY_ROLE.OWNER）
  {
    path: '/owner',
    component: OwnerLayout,
    children: [
      { path: 'home', name: HOME_BY_ROLE.OWNER.name, component: OwnerHomeView },
      { path: 'defects/new', name: 'defect-new', component: DefectFormView, props: { mode: 'create' } },
      { path: 'defects/:defectId', name: 'defect-detail', component: DefectDetailView, props: true },
      {
        path: 'defects/:defectId/edit',
        name: 'defect-edit',
        component: DefectFormView,
        props: (route) => ({ mode: 'edit', defectId: route.params.defectId }),
      },
    ],
  },
  ...Object.entries(HOME_BY_ROLE)
    .filter(([role]) => role !== 'OWNER')
    .map(([role, home]) => ({
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
