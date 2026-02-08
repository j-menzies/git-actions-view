<template>
  <v-container fluid class="pa-4" style="max-width: 1200px">
    <div v-if="initialLoading" class="text-center pa-8">
      <v-progress-circular indeterminate size="48" />
      <p class="text-body-2 text-medium-emphasis mt-4">Loading runs...</p>
    </div>

    <template v-else>
      <div v-if="runs.length === 0 && !loadingMore" class="text-center pa-8">
        <v-icon size="64" color="secondary">mdi-tray-remove</v-icon>
        <p class="text-h6 text-medium-emphasis mt-4">No runs found</p>
        <p class="text-body-2 text-medium-emphasis">
          Workflow runs will appear here once data is synced.
        </p>
      </div>

      <TransitionGroup name="list" tag="div">
        <RunCard v-for="run in runs" :key="run.id" :run="run" />
      </TransitionGroup>

      <div v-if="loadingMore" class="text-center pa-4">
        <v-progress-circular indeterminate size="24" />
      </div>

      <div v-if="!hasMore && runs.length > 0" class="text-center pa-4 text-body-2 text-medium-emphasis">
        No more runs to load.
      </div>

      <!-- Sentinel for infinite scroll -->
      <div ref="sentinel" style="height: 1px" />
    </template>
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { fetchRuns, fetchConfig } from '@/services/api'
import RunCard from './RunCard.vue'
import { useFilters } from '@/composables/useFilters'

const { state: filterState, setRepositories } = useFilters()

const runs = ref([])
const initialLoading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)
const nextCursor = ref(null)
const sentinel = ref(null)
let observer = null
let refreshTimer = null

function currentFilterParams() {
  return {
    repo: filterState.repo || undefined,
    status: filterState.status || undefined,
    branch: filterState.branch || undefined,
  }
}

async function loadConfig() {
  try {
    const config = await fetchConfig()
    setRepositories(config.repositories || [])
  } catch {
    // ignore
  }
}

async function loadRuns(append = false) {
  if (loadingMore.value) return
  if (append && !hasMore.value) return

  if (append) {
    loadingMore.value = true
  }

  try {
    const params = {
      limit: 50,
      ...currentFilterParams(),
    }
    if (append && nextCursor.value) {
      params.before = nextCursor.value
    }

    const data = await fetchRuns(params)

    if (append) {
      runs.value = [...runs.value, ...data.runs]
    } else {
      runs.value = data.runs
    }
    nextCursor.value = data.nextCursor
    hasMore.value = data.hasMore
  } catch (err) {
    console.error('Failed to load runs:', err)
  } finally {
    initialLoading.value = false
    loadingMore.value = false
  }
}

async function refreshTop() {
  try {
    const params = { limit: 50, ...currentFilterParams() }
    const data = await fetchRuns(params)
    // Merge new runs at top
    const existingIds = new Set(runs.value.map(r => r.id))
    const newRuns = data.runs.filter(r => !existingIds.has(r.id))
    // Also update existing runs (status may have changed)
    const updatedMap = new Map(data.runs.map(r => [r.id, r]))
    runs.value = runs.value.map(r => updatedMap.get(r.id) || r)
    if (newRuns.length > 0) {
      runs.value = [...newRuns, ...runs.value]
    }
  } catch {
    // silent
  }
}

// Watch for filter changes from AppBar
watch(() => filterState.revision, () => {
  runs.value = []
  nextCursor.value = null
  hasMore.value = true
  initialLoading.value = true
  loadRuns()
})

function setupIntersectionObserver() {
  if (!sentinel.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value) {
        loadRuns(true)
      }
    },
    { rootMargin: '200px' }
  )
  observer.observe(sentinel.value)
}

onMounted(async () => {
  await loadConfig()
  await loadRuns()
  await nextTick()
  setupIntersectionObserver()
  refreshTimer = setInterval(refreshTop, 15000)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.list-enter-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
