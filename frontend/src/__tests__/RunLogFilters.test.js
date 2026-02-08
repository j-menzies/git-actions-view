import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestVuetify } from './setup'
import RunLogFilters from '@/components/RunLogFilters.vue'

function mountFilters(props = {}) {
  return mount(RunLogFilters, {
    props: {
      repositories: ['org1/repo-a', 'org2/repo-b'],
      ...props,
    },
    global: {
      plugins: [createTestVuetify()],
    },
  })
}

describe('RunLogFilters', () => {
  it('renders repository select', () => {
    const wrapper = mountFilters()
    expect(wrapper.find('.v-select').exists()).toBe(true)
  })

  it('renders status chips', () => {
    const wrapper = mountFilters()
    expect(wrapper.text()).toContain('Success')
    expect(wrapper.text()).toContain('Failure')
    expect(wrapper.text()).toContain('In Progress')
    expect(wrapper.text()).toContain('Cancelled')
  })

  it('renders branch text field', () => {
    const wrapper = mountFilters()
    const textFields = wrapper.findAll('.v-text-field')
    expect(textFields.length).toBeGreaterThanOrEqual(1)
  })

  it('has 4 status options', () => {
    const wrapper = mountFilters()
    const chips = wrapper.findAll('.v-chip-group .v-chip')
    expect(chips.length).toBe(4)
  })

  it('renders with empty repositories', () => {
    const wrapper = mountFilters({ repositories: [] })
    expect(wrapper.find('.v-select').exists()).toBe(true)
  })
})
