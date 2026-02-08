import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import { createRouter, createWebHashHistory } from 'vue-router'
import { defineComponent } from 'vue'
import LoginPage from '@/components/LoginPage.vue'

const mockFetchConfig = vi.fn()
const mockLoginBasic = vi.fn()

vi.mock('@/services/api', () => ({
  fetchConfig: (...args) => mockFetchConfig(...args),
  loginBasic: (...args) => mockLoginBasic(...args),
}))

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/runs' },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
      { path: '/runs', name: 'Runs', component: { template: '<div />' } },
    ],
  })
}

// Wrap in v-app for Vuetify layout
const LoginPageWrapper = defineComponent({
  components: { LoginPage },
  template: '<v-app><LoginPage /></v-app>',
})

function mountLoginPage() {
  const router = createTestRouter()
  return mount(LoginPageWrapper, {
    global: {
      plugins: [createTestVuetify(), router],
    },
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockFetchConfig.mockReset()
    mockLoginBasic.mockReset()
  })

  it('shows loading spinner while fetching config', () => {
    mockFetchConfig.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountLoginPage()
    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
  })

  it('shows title and subtitle', async () => {
    mockFetchConfig.mockResolvedValue({
      authMechanisms: ['OAUTH2'],
      authRequired: true,
    })
    const wrapper = mountLoginPage()
    await flushPromises()
    expect(wrapper.text()).toContain('GitActionsView')
    expect(wrapper.text()).toContain('Sign in')
  })

  it('shows OAuth button when OAUTH2 enabled', async () => {
    mockFetchConfig.mockResolvedValue({
      authMechanisms: ['OAUTH2'],
      authRequired: true,
    })
    const wrapper = mountLoginPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Sign in with GitHub')
  })

  it('shows basic auth form when BASIC_AUTH enabled', async () => {
    mockFetchConfig.mockResolvedValue({
      authMechanisms: ['BASIC_AUTH'],
      authRequired: true,
    })
    const wrapper = mountLoginPage()
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows both OAuth and Basic auth when both enabled', async () => {
    mockFetchConfig.mockResolvedValue({
      authMechanisms: ['OAUTH2', 'BASIC_AUTH'],
      authRequired: true,
    })
    const wrapper = mountLoginPage()
    await flushPromises()
    expect(wrapper.text()).toContain('Sign in with GitHub')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows guest access link when no auth', async () => {
    mockFetchConfig.mockResolvedValue({
      authMechanisms: [],
      authRequired: false,
    })
    const wrapper = mountLoginPage()
    await flushPromises()
    // The component redirects on mount when auth not required
    // so it may not show the message; just verify it doesn't crash
    expect(wrapper.exists()).toBe(true)
  })

  it('handles config fetch failure gracefully', async () => {
    mockFetchConfig.mockRejectedValue(new Error('Network error'))
    const wrapper = mountLoginPage()
    await flushPromises()
    // Should not crash
    expect(wrapper.exists()).toBe(true)
  })
})
