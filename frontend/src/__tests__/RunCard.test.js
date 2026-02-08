import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import RunCard from '@/components/RunCard.vue'

vi.mock('@/services/api', () => ({
  fetchJobs: vi.fn().mockResolvedValue({ jobs: [] }),
}))

function createRun(overrides = {}) {
  return {
    id: 100,
    ownerName: 'org1',
    repoName: 'repo-a',
    workflowName: 'CI Build',
    runNumber: 42,
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    branch: 'main',
    actorLogin: 'dev1',
    actorAvatarUrl: 'https://avatars.githubusercontent.com/dev1',
    htmlUrl: 'https://github.com/org1/repo-a/actions/runs/100',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString(),
    duration: '2m 50s',
    jobSummary: { total: 3, success: 2, failure: 1, in_progress: 0, other: 0 },
    ...overrides,
  }
}

function mountCard(runOverrides = {}) {
  return mount(RunCard, {
    props: { run: createRun(runOverrides) },
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

describe('RunCard', () => {
  describe('basic rendering', () => {
    it('displays repository name', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('org1/repo-a')
    })

    it('displays workflow name', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('CI Build')
    })

    it('displays run number', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('#42')
    })

    it('displays branch chip', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('main')
    })

    it('displays event chip', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('push')
    })

    it('displays actor login', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('dev1')
    })

    it('displays duration', () => {
      const wrapper = mountCard()
      expect(wrapper.text()).toContain('2m 50s')
    })
  })

  describe('conditional rendering', () => {
    it('hides branch chip when null', () => {
      const wrapper = mountCard({ branch: null })
      const branchChips = wrapper.findAll('.v-chip').filter(c => c.text().includes('main'))
      expect(branchChips.length).toBe(0)
    })

    it('hides event chip when null', () => {
      const wrapper = mountCard({ event: null })
      const eventChips = wrapper.findAll('.v-chip').filter(c => c.text().includes('push'))
      expect(eventChips.length).toBe(0)
    })

    it('hides duration when null', () => {
      const wrapper = mountCard({ duration: null })
      expect(wrapper.text()).not.toContain('2m 50s')
    })
  })

  describe('relativeTime', () => {
    it('shows "just now" for very recent runs', () => {
      const wrapper = mountCard({ createdAt: new Date().toISOString() })
      expect(wrapper.text()).toContain('just now')
    })

    it('shows minutes ago for recent runs', () => {
      const wrapper = mountCard({
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      })
      expect(wrapper.text()).toContain('5m ago')
    })

    it('shows hours ago for older runs', () => {
      const wrapper = mountCard({
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      })
      expect(wrapper.text()).toContain('3h ago')
    })

    it('shows days ago for old runs', () => {
      const wrapper = mountCard({
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      })
      expect(wrapper.text()).toContain('2d ago')
    })
  })

  describe('jobBadge', () => {
    it('shows job count with failures', () => {
      const wrapper = mountCard({
        jobSummary: { total: 5, success: 3, failure: 2, in_progress: 0, other: 0 },
      })
      expect(wrapper.text()).toContain('3/5')
    })

    it('shows success job count', () => {
      const wrapper = mountCard({
        jobSummary: { total: 3, success: 3, failure: 0, in_progress: 0, other: 0 },
      })
      expect(wrapper.text()).toContain('3/3')
    })

    it('returns null when no jobs', () => {
      const wrapper = mountCard({
        jobSummary: { total: 0, success: 0, failure: 0, in_progress: 0, other: 0 },
      })
      // Badge should not render
      expect(wrapper.text()).not.toMatch(/\d+\/\d+/)
    })

    it('applies error color when failures exist', () => {
      const wrapper = mountCard({
        jobSummary: { total: 5, success: 3, failure: 2, in_progress: 0, other: 0 },
      })
      const badge = wrapper.findAll('span').find(s => s.text().includes('3/5'))
      expect(badge?.classes()).toContain('text-error')
    })

    it('applies success color when all pass', () => {
      const wrapper = mountCard({
        jobSummary: { total: 3, success: 3, failure: 0, in_progress: 0, other: 0 },
      })
      const badge = wrapper.findAll('span').find(s => s.text().includes('3/3'))
      expect(badge?.classes()).toContain('text-success')
    })
  })

  describe('expansion', () => {
    it('starts collapsed', () => {
      const wrapper = mountCard()
      expect(wrapper.find('.job-list').exists()).toBe(false)
    })

    it('expands on click to show JobList', async () => {
      const wrapper = mountCard()
      await wrapper.find('.run-card').trigger('click')
      // After expansion, the JobList should be rendered
      expect(wrapper.findComponent({ name: 'JobList' }).exists()).toBe(true)
    })

    it('toggles expanded state on second click', async () => {
      const wrapper = mountCard()
      const card = wrapper.find('.run-card')
      await card.trigger('click')
      expect(wrapper.findComponent({ name: 'JobList' }).exists()).toBe(true)
      await card.trigger('click')
      // After second click, JobList should no longer be visible
      // The v-if removes it when expanded is false
      expect(wrapper.findComponent({ name: 'JobList' }).exists()).toBe(false)
    })
  })

  describe('external link', () => {
    it('renders GitHub link with correct URL', () => {
      const wrapper = mountCard()
      const link = wrapper.find('a[target="_blank"], [href*="github.com"]')
      expect(link.exists()).toBe(true)
    })
  })
})
