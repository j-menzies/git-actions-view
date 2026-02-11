<template>
  <v-menu location="bottom end" :close-on-content-click="false" max-width="420">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        variant="text"
        size="small"
        class="text-none"
        :color="indicatorColor"
      >
        <v-icon size="10" class="mr-1">mdi-circle</v-icon>
        <span class="text-caption">{{ statusLabel }}</span>
      </v-btn>
    </template>

    <v-card v-if="statusData">
      <v-card-title class="text-subtitle-2 d-flex align-center">
        <v-icon size="12" :color="indicatorColor" class="mr-2">mdi-circle</v-icon>
        {{ statusData.status.description }}
      </v-card-title>

      <v-card-text class="pt-0">
        <!-- Degraded components -->
        <div v-if="degradedComponents.length > 0" class="mb-3">
          <div class="text-caption text-medium-emphasis mb-1">Affected Services</div>
          <v-chip
            v-for="comp in degradedComponents"
            :key="comp.name"
            size="small"
            :color="componentColor(comp.status)"
            variant="tonal"
            class="mr-1 mb-1"
          >
            {{ comp.name }}
          </v-chip>
        </div>

        <!-- Active incidents -->
        <div v-if="statusData.incidents.length > 0">
          <div class="text-caption text-medium-emphasis mb-1">Active Incidents</div>
          <div
            v-for="incident in statusData.incidents"
            :key="incident.name"
            class="mb-2 pa-2 rounded"
            style="background: rgba(var(--v-theme-on-surface), 0.05)"
          >
            <div class="text-body-2 font-weight-medium">{{ incident.name }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ incident.status }} &middot; {{ timeAgo(incident.updatedAt) }}
            </div>
            <div v-if="incident.latestUpdate" class="text-caption mt-1" style="line-height: 1.4">
              {{ truncate(incident.latestUpdate, 200) }}
            </div>
          </div>
        </div>

        <div v-if="degradedComponents.length === 0 && statusData.incidents.length === 0" class="text-body-2 text-medium-emphasis">
          All GitHub systems operational.
        </div>

        <v-divider class="my-2" />
        <a
          href="https://www.githubstatus.com"
          target="_blank"
          rel="noopener"
          class="text-caption text-primary"
        >
          View full status page
          <v-icon size="12">mdi-open-in-new</v-icon>
        </a>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { fetchGithubStatus } from '@/services/api'

const statusData = ref(null)
let pollTimer = null

const indicatorColor = computed(() => {
  const map = {
    none: 'success',
    minor: 'warning',
    major: 'orange',
    critical: 'error',
  }
  return map[statusData.value?.status?.indicator] || 'grey'
})

const statusLabel = computed(() => {
  if (!statusData.value) return 'GitHub'
  const ind = statusData.value.status.indicator
  if (ind === 'none') return 'GitHub'
  return statusData.value.status.description
})

const degradedComponents = computed(() =>
  (statusData.value?.components || []).filter(c => c.status !== 'operational')
)

function componentColor(status) {
  const map = {
    degraded_performance: 'warning',
    partial_outage: 'orange',
    major_outage: 'error',
  }
  return map[status] || 'grey'
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

async function loadStatus() {
  try {
    statusData.value = await fetchGithubStatus()
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadStatus()
  pollTimer = setInterval(loadStatus, 60000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
