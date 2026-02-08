import { reactive, provide, inject, toRefs } from 'vue'

const FILTERS_KEY = Symbol('filters')

/**
 * Provide filter state from a parent component.
 * Call this in App.vue so both AppBar and RunLog can share state.
 */
export function provideFilters() {
  const state = reactive({
    repo: null,
    status: undefined,
    branch: '',
    repositories: [],
    revision: 0, // bumped on every filter change to trigger watchers
  })

  function setFilter(newFilters) {
    state.repo = newFilters.repo ?? null
    state.status = newFilters.status ?? undefined
    state.branch = newFilters.branch ?? ''
    state.revision++
  }

  function setRepositories(repos) {
    state.repositories = repos
  }

  const provided = { state, setFilter, setRepositories }
  provide(FILTERS_KEY, provided)
  return provided
}

/**
 * Inject filter state in a child component.
 */
export function useFilters() {
  const injected = inject(FILTERS_KEY)
  if (!injected) {
    throw new Error('useFilters() requires provideFilters() in a parent component')
  }
  return injected
}
