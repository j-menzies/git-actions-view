import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import { createRouter, createWebHashHistory } from 'vue-router'
import { h, defineComponent } from 'vue'
import AppBar from '@/components/AppBar.vue'
import { provideFilters } from '@/composables/useFilters'

const mockFetchMe = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/services/api', () => ({
  fetchMe: (...args) => mockFetchMe(...args),
  logout: (...args) => mockLogout(...args),
}))

function createTestRouter(initialRoute = '/runs') {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/runs' },
      { path: '/runs', name: 'Runs', component: { template: '<div />' } },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/settings', name: 'Settings', component: { template: '<div />' } },
    ],
  })
  router.push(initialRoute)
  return router
}

// Wrap AppBar in v-app + provideFilters
const AppBarWrapper = defineComponent({
  components: { AppBar },
  setup() {
    provideFilters()
  },
  template: '<v-app><AppBar /></v-app>',
})

async function mountAppBar(initialRoute = '/runs') {
  const router = createTestRouter(initialRoute)
  await router.isReady()
  return mount(AppBarWrapper, {
    global: {
      plugins: [createTestVuetify(), router],
    },
  })
}

describe('AppBar', () => {
  beforeEach(() => {
    mockFetchMe.mockReset()
    mockLogout.mockReset()
  })

  it('displays title', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer' })
    const wrapper = await mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('GitActionsView')
  })

  it('title links to Runs route', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer' })
    const wrapper = await mountAppBar()
    await flushPromises()
    const titleLink = wrapper.find('.app-title-link')
    expect(titleLink.exists()).toBe(true)
    expect(titleLink.attributes('href')).toContain('/runs')
  })

  it('shows user info when authenticated', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer', avatarUrl: '' })
    const wrapper = await mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('Developer')
  })

  it('shows login name when no display name', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: '', avatarUrl: '' })
    const wrapper = await mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('dev')
  })

  it('shows profile menu activator when authenticated', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Dev', avatarUrl: '' })
    const wrapper = await mountAppBar()
    await flushPromises()
    const activator = wrapper.find('[data-testid="profile-menu-activator"]')
    expect(activator.exists()).toBe(true)
  })

  it('hides profile menu when not authenticated', async () => {
    mockFetchMe.mockRejectedValue(new Error('Not authenticated'))
    const wrapper = await mountAppBar()
    await flushPromises()
    const activator = wrapper.find('[data-testid="profile-menu-activator"]')
    expect(activator.exists()).toBe(false)
  })

  it('shows user name in profile menu button', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer', avatarUrl: '' })
    const wrapper = await mountAppBar()
    await flushPromises()
    const activator = wrapper.find('[data-testid="profile-menu-activator"]')
    expect(activator.exists()).toBe(true)
    expect(activator.text()).toContain('Developer')
  })

  it('shows filter button on Runs page', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev' })
    const wrapper = await mountAppBar('/runs')
    await flushPromises()
    const filterBtn = wrapper.find('[data-testid="filter-menu-activator"]')
    expect(filterBtn.exists()).toBe(true)
  })

  it('hides filter button on Settings page', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev' })
    const wrapper = await mountAppBar('/settings')
    await flushPromises()
    const filterBtn = wrapper.find('[data-testid="filter-menu-activator"]')
    expect(filterBtn.exists()).toBe(false)
  })
})
