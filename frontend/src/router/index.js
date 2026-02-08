import { createRouter, createWebHashHistory } from 'vue-router'
import { fetchMe, fetchConfig } from '@/services/api'

const routes = [
  {
    path: '/',
    redirect: '/runs',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/LoginPage.vue'),
  },
  {
    path: '/runs',
    name: 'Runs',
    component: () => import('@/components/RunLog.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/components/SettingsPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  try {
    const config = await fetchConfig()
    if (!config.authRequired) return true

    await fetchMe()
    return true
  } catch {
    return { name: 'Login' }
  }
})

export default router
