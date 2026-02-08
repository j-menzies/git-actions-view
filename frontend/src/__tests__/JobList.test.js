import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import JobList from '@/components/JobList.vue'

const mockFetchJobs = vi.fn()
vi.mock('@/services/api', () => ({
  fetchJobs: (...args) => mockFetchJobs(...args),
}))

function mountJobList(runId = 100) {
  return mount(JobList, {
    props: { runId },
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

describe('JobList', () => {
  beforeEach(() => {
    mockFetchJobs.mockReset()
  })

  it('shows loading spinner initially', () => {
    mockFetchJobs.mockReturnValue(new Promise(() => {})) // never resolves
    const wrapper = mountJobList()
    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
  })

  it('renders jobs after loading', async () => {
    mockFetchJobs.mockResolvedValue({
      jobs: [
        { id: 200, name: 'build', status: 'completed', conclusion: 'success' },
        { id: 201, name: 'test', status: 'completed', conclusion: 'success' },
      ],
    })
    const wrapper = mountJobList()
    await flushPromises()

    expect(wrapper.text()).toContain('build')
    expect(wrapper.text()).toContain('test')
    expect(wrapper.find('.v-progress-circular').exists()).toBe(false)
  })

  it('shows empty state when no jobs', async () => {
    mockFetchJobs.mockResolvedValue({ jobs: [] })
    const wrapper = mountJobList()
    await flushPromises()

    expect(wrapper.text()).toContain('No jobs found')
  })

  it('shows error on fetch failure', async () => {
    mockFetchJobs.mockRejectedValue(new Error('Network error'))
    const wrapper = mountJobList()
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load jobs')
    expect(wrapper.text()).toContain('Network error')
  })

  it('passes correct runId to fetchJobs', async () => {
    mockFetchJobs.mockResolvedValue({ jobs: [] })
    mountJobList(999)
    await flushPromises()

    expect(mockFetchJobs).toHaveBeenCalledWith(999)
  })

  it('passes last prop correctly to JobRow', async () => {
    mockFetchJobs.mockResolvedValue({
      jobs: [
        { id: 200, name: 'build', status: 'completed', conclusion: 'success' },
        { id: 201, name: 'test', status: 'completed', conclusion: 'failure' },
      ],
    })
    const wrapper = mountJobList()
    await flushPromises()

    const jobRows = wrapper.findAllComponents({ name: 'JobRow' })
    expect(jobRows).toHaveLength(2)
  })
})
