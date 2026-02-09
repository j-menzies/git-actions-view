import { reactive, provide, inject } from 'vue'

const SYNC_STATUS_KEY = Symbol('syncStatus')

export function provideSyncStatus() {
  const state = reactive({
    connected: false,
    syncingRepo: null,
    lastDiscoveryPoll: null,
    lastActivePoll: null,
  })

  let eventSource = null

  function connect() {
    eventSource = new EventSource('/api/v1/events')

    eventSource.onopen = () => {
      state.connected = true
    }

    eventSource.onerror = () => {
      state.connected = false
    }

    eventSource.addEventListener('sync:start', (e) => {
      const data = JSON.parse(e.data)
      state.syncingRepo = data.repo
    })

    eventSource.addEventListener('sync:complete', (e) => {
      const data = JSON.parse(e.data)
      if (state.syncingRepo === data.repo) {
        state.syncingRepo = null
      }
    })

    eventSource.addEventListener('sync:poll', (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'discovery') {
        state.lastDiscoveryPoll = data.lastPollTime
      } else if (data.type === 'active') {
        state.lastActivePoll = data.lastPollTime
      }
    })
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      state.connected = false
    }
  }

  provide(SYNC_STATUS_KEY, state)
  return { state, connect, disconnect }
}

const defaultState = reactive({
  connected: false,
  syncingRepo: null,
  lastDiscoveryPoll: null,
  lastActivePoll: null,
})

export function useSyncStatus() {
  return inject(SYNC_STATUS_KEY, defaultState)
}
