import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import { defineComponent } from 'vue'
import GitHubStatusIndicator from '@/components/GitHubStatusIndicator.vue'

const mockFetchGithubStatus = vi.fn()

vi.mock('@/services/api', () => ({
  fetchGithubStatus: (...args) => mockFetchGithubStatus(...args),
}))

const Wrapper = defineComponent({
  components: { GitHubStatusIndicator },
  template: '<v-app><GitHubStatusIndicator /></v-app>',
})

function mountIndicator() {
  return mount(Wrapper, {
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

const operationalStatus = {
  status: { indicator: 'none', description: 'All Systems Operational' },
  components: [
    { name: 'Git Operations', status: 'operational' },
    { name: 'Actions', status: 'operational' },
  ],
  incidents: [],
}

const degradedStatus = {
  status: { indicator: 'minor', description: 'Minor Service Outage' },
  components: [
    { name: 'Git Operations', status: 'operational' },
    { name: 'Actions', status: 'degraded_performance' },
  ],
  incidents: [
    {
      name: 'Actions delays',
      impact: 'minor',
      status: 'investigating',
      startedAt: '2026-02-08T18:00:00Z',
      updatedAt: new Date(Date.now() - 120000).toISOString(),
      latestUpdate: 'We are investigating delays in GitHub Actions.',
    },
  ],
}

describe('GitHubStatusIndicator', () => {
  beforeEach(() => {
    mockFetchGithubStatus.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "GitHub" label when status is operational', async () => {
    mockFetchGithubStatus.mockResolvedValue(operationalStatus)
    const wrapper = mountIndicator()
    await flushPromises()
    expect(wrapper.text()).toContain('GitHub')
    expect(wrapper.text()).not.toContain('Outage')
  })

  it('shows description when status is degraded', async () => {
    mockFetchGithubStatus.mockResolvedValue(degradedStatus)
    const wrapper = mountIndicator()
    await flushPromises()
    expect(wrapper.text()).toContain('Minor Service Outage')
  })

  it('shows "GitHub" label before data loads', () => {
    mockFetchGithubStatus.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountIndicator()
    expect(wrapper.text()).toContain('GitHub')
  })

  it('fetches status on mount', async () => {
    mockFetchGithubStatus.mockResolvedValue(operationalStatus)
    mountIndicator()
    await flushPromises()
    expect(mockFetchGithubStatus).toHaveBeenCalledTimes(1)
  })

  it('polls every 60 seconds', async () => {
    mockFetchGithubStatus.mockResolvedValue(operationalStatus)
    mountIndicator()
    await flushPromises()
    expect(mockFetchGithubStatus).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60000)
    await flushPromises()
    expect(mockFetchGithubStatus).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(60000)
    await flushPromises()
    expect(mockFetchGithubStatus).toHaveBeenCalledTimes(3)
  })

  it('cleans up polling on unmount', async () => {
    mockFetchGithubStatus.mockResolvedValue(operationalStatus)
    const wrapper = mountIndicator()
    await flushPromises()

    wrapper.unmount()
    vi.advanceTimersByTime(120000)
    await flushPromises()
    // Should not have polled again after unmount
    expect(mockFetchGithubStatus).toHaveBeenCalledTimes(1)
  })

  it('handles fetch errors gracefully', async () => {
    mockFetchGithubStatus.mockRejectedValue(new Error('Network error'))
    const wrapper = mountIndicator()
    await flushPromises()
    // Should still render without crashing, showing fallback label
    expect(wrapper.text()).toContain('GitHub')
  })
})
