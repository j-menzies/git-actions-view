import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import { createRouter, createWebHashHistory } from 'vue-router'
import { h, defineComponent } from 'vue'
import AppBar from '@/components/AppBar.vue'

const mockFetchMe = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/services/api', () => ({
  fetchMe: (...args) => mockFetchMe(...args),
  logout: (...args) => mockLogout(...args),
}))

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/runs' },
      { path: '/runs', name: 'Runs', component: { template: '<div />' } },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/settings', name: 'Settings', component: { template: '<div />' } },
    ],
  })
}

// Wrap AppBar in v-app to provide layout injection
const AppBarWrapper = defineComponent({
  components: { AppBar },
  template: '<v-app><AppBar /></v-app>',
})

function mountAppBar() {
  const router = createTestRouter()
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
    const wrapper = mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('GitActionsView')
  })

  it('title links to Runs route', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer' })
    const wrapper = mountAppBar()
    await flushPromises()
    const titleLink = wrapper.find('.app-title-link')
    expect(titleLink.exists()).toBe(true)
    expect(titleLink.attributes('href')).toContain('/runs')
  })

  it('shows user info when authenticated', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Developer', avatarUrl: '' })
    const wrapper = mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('Developer')
  })

  it('shows login name when no display name', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: '', avatarUrl: '' })
    const wrapper = mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('dev')
  })

  it('shows logout button when authenticated', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev', name: 'Dev' })
    const wrapper = mountAppBar()
    await flushPromises()
    expect(wrapper.text()).toContain('Logout')
  })

  it('hides user info when not authenticated', async () => {
    mockFetchMe.mockRejectedValue(new Error('Not authenticated'))
    const wrapper = mountAppBar()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Logout')
  })

  it('has theme toggle button', async () => {
    mockFetchMe.mockResolvedValue({ login: 'dev' })
    const wrapper = mountAppBar()
    await flushPromises()
    const buttons = wrapper.findAll('.v-btn')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
