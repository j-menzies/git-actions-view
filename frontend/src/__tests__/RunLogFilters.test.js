import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { provideFilters, useFilters } from '@/composables/useFilters'

// Helper: mount a component tree that provides + consumes the filter composable
function createFilterHarness() {
  let consumed = null

  const Child = defineComponent({
    setup() {
      consumed = useFilters()
      return () => h('div')
    },
  })

  const Parent = defineComponent({
    setup() {
      const provided = provideFilters()
      return { provided }
    },
    render() {
      return h(Child)
    },
  })

  const wrapper = mount(Parent)
  return { wrapper, provided: wrapper.vm.provided, consumed }
}

describe('useFilters composable', () => {
  it('provides initial empty state', () => {
    const { consumed } = createFilterHarness()
    expect(consumed.state.repo).toBeNull()
    expect(consumed.state.status).toBeUndefined()
    expect(consumed.state.branch).toBe('')
    expect(consumed.state.repositories).toEqual([])
    expect(consumed.state.revision).toBe(0)
  })

  it('setFilter updates state and bumps revision', () => {
    const { consumed } = createFilterHarness()
    consumed.setFilter({ repo: 'org/repo', status: 'success', branch: 'main' })
    expect(consumed.state.repo).toBe('org/repo')
    expect(consumed.state.status).toBe('success')
    expect(consumed.state.branch).toBe('main')
    expect(consumed.state.revision).toBe(1)
  })

  it('setFilter handles partial updates', () => {
    const { consumed } = createFilterHarness()
    consumed.setFilter({ repo: 'org/repo' })
    expect(consumed.state.repo).toBe('org/repo')
    expect(consumed.state.status).toBeUndefined()
    expect(consumed.state.branch).toBe('')
  })

  it('setRepositories updates repositories list', () => {
    const { consumed } = createFilterHarness()
    consumed.setRepositories(['org1/repo-a', 'org2/repo-b'])
    expect(consumed.state.repositories).toEqual(['org1/repo-a', 'org2/repo-b'])
  })

  it('clearing filters resets state', () => {
    const { consumed } = createFilterHarness()
    consumed.setFilter({ repo: 'org/repo', status: 'failure', branch: 'dev' })
    expect(consumed.state.revision).toBe(1)
    consumed.setFilter({})
    expect(consumed.state.repo).toBeNull()
    expect(consumed.state.status).toBeUndefined()
    expect(consumed.state.branch).toBe('')
    expect(consumed.state.revision).toBe(2)
  })
})
