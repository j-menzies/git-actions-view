import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import { createRouter, createWebHashHistory } from 'vue-router'
import { defineComponent } from 'vue'
import SettingsPage from '@/components/SettingsPage.vue'

const mockFetchSettings = vi.fn()
const mockUpdateSettings = vi.fn()
const mockFetchRepos = vi.fn()
const mockAddRepo = vi.fn()
const mockUpdateRepo = vi.fn()
const mockDeleteRepo = vi.fn()
const mockRebuildDatabase = vi.fn()

vi.mock('@/services/api', () => ({
  fetchSettings: (...args) => mockFetchSettings(...args),
  updateSettings: (...args) => mockUpdateSettings(...args),
  fetchRepos: (...args) => mockFetchRepos(...args),
  addRepo: (...args) => mockAddRepo(...args),
  updateRepo: (...args) => mockUpdateRepo(...args),
  deleteRepo: (...args) => mockDeleteRepo(...args),
  rebuildDatabase: (...args) => mockRebuildDatabase(...args),
}))

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/settings', name: 'Settings', component: { template: '<div />' } },
    ],
  })
}

// Wrap in v-app for Vuetify layout
const SettingsWrapper = defineComponent({
  components: { SettingsPage },
  template: '<v-app><SettingsPage /></v-app>',
})

function mountSettings() {
  return mount(SettingsWrapper, {
    global: {
      plugins: [createTestVuetify(), createTestRouter()],
    },
  })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    mockFetchSettings.mockReset()
    mockUpdateSettings.mockReset()
    mockFetchRepos.mockReset()
    mockAddRepo.mockReset()
    mockUpdateRepo.mockReset()
    mockDeleteRepo.mockReset()
    mockRebuildDatabase.mockReset()

    mockFetchSettings.mockResolvedValue({ discoveryPollSeconds: 60, activePollSeconds: 10 })
    mockFetchRepos.mockResolvedValue({ repos: [] })
  })

  it('renders the settings heading', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('Settings')
  })

  it('displays polling interval section', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('Polling Intervals')
  })

  it('displays database section', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('Database')
    expect(wrapper.text()).toContain('Rebuild Cache')
  })

  it('displays repositories section', async () => {
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('Repositories')
  })

  it('loads settings on mount', async () => {
    mountSettings()
    await flushPromises()
    expect(mockFetchSettings).toHaveBeenCalledTimes(1)
  })

  it('loads repos on mount', async () => {
    mountSettings()
    await flushPromises()
    expect(mockFetchRepos).toHaveBeenCalledTimes(1)
  })

  it('displays repos in table when present', async () => {
    mockFetchRepos.mockResolvedValue({
      repos: [
        { id: 1, owner: 'test-org', name: 'my-repo', hidden: 0, created_at: '2026-01-01' },
      ],
    })
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('test-org/my-repo')
  })

  it('shows empty message when no repos', async () => {
    mockFetchRepos.mockResolvedValue({ repos: [] })
    const wrapper = mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('No repositories configured')
  })

  it('calls updateSettings when save is clicked', async () => {
    mockUpdateSettings.mockResolvedValue({ discoveryPollSeconds: 90, activePollSeconds: 20, restarted: true })
    const wrapper = mountSettings()
    await flushPromises()

    // Find and click Save button
    const saveBtn = wrapper.findAll('.v-btn').find(b => b.text().includes('Save'))
    expect(saveBtn).toBeDefined()
    await saveBtn.trigger('click')
    await flushPromises()
    expect(mockUpdateSettings).toHaveBeenCalledTimes(1)
  })

  it('shows rebuild confirmation dialog', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    const rebuildBtn = wrapper.findAll('.v-btn').find(b => b.text().includes('Rebuild Cache'))
    expect(rebuildBtn).toBeDefined()
    await rebuildBtn.trigger('click')
    await flushPromises()
    // Dialog should be visible
    expect(wrapper.text()).toContain('Rebuild Database Cache?')
  })
})
