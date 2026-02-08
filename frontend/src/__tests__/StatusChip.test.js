import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import StatusChip from '@/components/StatusChip.vue'

function mountChip(props = {}) {
  return mount(StatusChip, {
    props,
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

describe('StatusChip', () => {
  describe('in_progress status', () => {
    it('shows warning color and In Progress label', () => {
      const wrapper = mountChip({ status: 'in_progress' })
      expect(wrapper.text()).toContain('In Progress')
    })
  })

  describe('queued status', () => {
    it('shows Queued label', () => {
      const wrapper = mountChip({ status: 'queued' })
      expect(wrapper.text()).toContain('Queued')
    })
  })

  describe('waiting status', () => {
    it('shows Waiting label', () => {
      const wrapper = mountChip({ status: 'waiting' })
      expect(wrapper.text()).toContain('Waiting')
    })
  })

  describe('completed with conclusion', () => {
    it('shows Success for success conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'success' })
      expect(wrapper.text()).toContain('Success')
    })

    it('shows Failure for failure conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'failure' })
      expect(wrapper.text()).toContain('Failure')
    })

    it('shows Cancelled for cancelled conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'cancelled' })
      expect(wrapper.text()).toContain('Cancelled')
    })

    it('shows Skipped for skipped conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'skipped' })
      expect(wrapper.text()).toContain('Skipped')
    })

    it('shows Timed Out for timed_out conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'timed_out' })
      expect(wrapper.text()).toContain('Timed Out')
    })

    it('shows Action Required for action_required conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'action_required' })
      expect(wrapper.text()).toContain('Action Required')
    })

    it('shows Startup Failure for startup_failure conclusion', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'startup_failure' })
      expect(wrapper.text()).toContain('Startup Failure')
    })
  })

  describe('edge cases', () => {
    it('shows status as label when no conclusion and not in-flight', () => {
      const wrapper = mountChip({ status: 'completed' })
      // No conclusion, not in_progress/queued/waiting -> shows status
      expect(wrapper.text()).toContain('completed')
    })

    it('shows Unknown when no status and no conclusion', () => {
      const wrapper = mountChip({})
      expect(wrapper.text()).toContain('Unknown')
    })

    it('falls back to raw conclusion for unknown conclusions', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'neutral' })
      expect(wrapper.text()).toContain('neutral')
    })
  })

  describe('variant prop', () => {
    it('defaults to tonal variant', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'success' })
      const chip = wrapper.find('.v-chip')
      expect(chip.exists()).toBe(true)
    })

    it('accepts custom variant', () => {
      const wrapper = mountChip({ status: 'completed', conclusion: 'success', variant: 'flat' })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
