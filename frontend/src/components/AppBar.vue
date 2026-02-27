<template>
  <v-app-bar flat border density="compact">
    <v-app-bar-title>
      <router-link :to="{ name: 'Runs' }" class="app-title-link">
        <v-icon class="mr-1">mdi-github</v-icon>
        GitActionsView
      </router-link>
    </v-app-bar-title>

    <div class="sync-status-centered d-flex align-center text-caption text-medium-emphasis">
      <v-icon
        size="8"
        :color="syncStatus.connected ? 'success' : 'error'"
        class="mr-1"
      >mdi-circle</v-icon>
      <span>{{ lastSyncLabel }}</span>
      <span v-if="syncStatus.repoCount != null" class="mx-1">|</span>
      <span v-if="syncStatus.repoCount != null">{{ syncStatus.repoCount }} repos</span>
    </div>

    <template #append>
      <!-- GitHub Status -->
      <GitHubStatusIndicator />

      <!-- Fullscreen toggle -->
      <v-btn
        v-if="isFullscreenSupported"
        icon
        @click="toggleFullscreen"
        :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
        data-testid="fullscreen-toggle"
      >
        <v-icon>{{ isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
      </v-btn>

      <!-- Filter popover (only on Runs page) -->
      <v-menu
        v-if="isRunsPage"
        v-model="filterMenuOpen"
        location="bottom end"
        :close-on-content-click="false"
      >
        <template #activator="{ props: filterProps }">
          <v-btn
            icon
            v-bind="filterProps"
            data-testid="filter-menu-activator"
          >
            <v-badge
              :model-value="activeFilterCount > 0"
              :content="activeFilterCount"
              color="primary"
              floating
            >
              <v-icon>mdi-filter-variant</v-icon>
            </v-badge>
          </v-btn>
        </template>

        <v-card min-width="320" max-width="400" class="pa-4" data-testid="filter-panel">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-medium">Filters</span>
            <v-btn
              v-if="activeFilterCount > 0"
              variant="text"
              size="small"
              color="primary"
              @click="clearFilters"
            >
              Clear all
            </v-btn>
          </div>

          <v-select
            v-model="localFilters.repo"
            :items="repoOptions"
            label="Repository"
            clearable
            density="compact"
            variant="outlined"
            hide-details
            class="mb-3"
            @update:model-value="emitChange"
          />

          <div class="text-caption text-medium-emphasis mb-1">Status</div>
          <v-chip-group
            v-model="localFilters.status"
            selected-class="text-primary"
            class="mb-3"
            @update:model-value="emitChange"
          >
            <v-chip v-for="s in statusOptions" :key="s.value" :value="s.value" filter variant="outlined" size="small">
              {{ s.label }}
            </v-chip>
          </v-chip-group>

          <v-text-field
            v-model="localFilters.branch"
            label="Branch"
            clearable
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="emitChange"
          />
        </v-card>
      </v-menu>

      <!-- Profile menu -->
      <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-if="user"
            v-bind="menuProps"
            variant="text"
            class="text-none"
            data-testid="profile-menu-activator"
          >
            <v-avatar v-if="user.avatarUrl" size="28" class="mr-2">
              <v-img :src="user.avatarUrl" :alt="user.name" />
            </v-avatar>
            <span class="text-body-2">{{ user.name || user.login }}</span>
            <v-icon end size="small">mdi-chevron-down</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" min-width="200">
          <v-list-item :ripple="false" class="pe-none">
            <template #prepend>
              <v-avatar v-if="user?.avatarUrl" size="32" class="mr-3">
                <v-img :src="user.avatarUrl" :alt="user.name" />
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">
              {{ user?.name || user?.login }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="user?.name && user?.login">
              @{{ user.login }}
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-1" />

          <v-list-item :to="{ name: 'Settings' }" data-testid="menu-settings">
            <template #prepend>
              <v-icon>mdi-cog</v-icon>
            </template>
            <v-list-item-title>Settings</v-list-item-title>
          </v-list-item>

          <v-list-item @click="toggleTheme" data-testid="menu-theme-toggle">
            <template #prepend>
              <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </template>
            <v-list-item-title>{{ isDark ? 'Light Mode' : 'Dark Mode' }}</v-list-item-title>
          </v-list-item>

          <v-divider class="my-1" />

          <v-list-item @click="handleLogout" data-testid="menu-logout">
            <template #prepend>
              <v-icon>mdi-logout</v-icon>
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { fetchMe, logout } from '@/services/api'
import { useFilters } from '@/composables/useFilters'
import { useFullscreen } from '@/composables/useFullscreen'
import { useSyncStatus } from '@/composables/useSyncStatus'
import GitHubStatusIndicator from './GitHubStatusIndicator.vue'

const theme = useTheme()
const route = useRoute()
const router = useRouter()
const user = ref(null)
const filterMenuOpen = ref(false)

const { state: filterState, setFilter } = useFilters()
const { isFullscreen, isSupported: isFullscreenSupported, toggleFullscreen } = useFullscreen()
const syncStatus = useSyncStatus()

const isDark = computed(() => theme.global.current.value.dark)

const now = ref(new Date())
let clockTimer = null

const lastSyncLabel = computed(() => {
  const poll = syncStatus.lastDiscoveryPoll
  if (!poll) return 'Waiting for sync...'
  const pollDate = new Date(poll)
  const diffSec = Math.round((now.value - pollDate) / 1000)
  if (diffSec < 5) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  return pollDate.toLocaleTimeString()
})
const isRunsPage = computed(() => route.name === 'Runs')

const localFilters = reactive({
  repo: null,
  status: undefined,
  branch: '',
})

const repoOptions = computed(() =>
  filterState.repositories.map(r => ({ title: r, value: r }))
)

const statusOptions = [
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Cancelled', value: 'cancelled' },
]

const activeFilterCount = computed(() => {
  let count = 0
  if (localFilters.repo) count++
  if (localFilters.status) count++
  if (localFilters.branch) count++
  return count
})

function emitChange() {
  setFilter({
    repo: localFilters.repo || undefined,
    status: localFilters.status || undefined,
    branch: localFilters.branch || undefined,
  })
}

function clearFilters() {
  localFilters.repo = null
  localFilters.status = undefined
  localFilters.branch = ''
  emitChange()
}

function toggleTheme() {
  const newTheme = isDark.value ? 'githubLight' : 'githubDark'
  theme.global.name.value = newTheme
  localStorage.setItem('gitactionsview-theme', newTheme)
}

async function handleLogout() {
  await logout()
  user.value = null
  router.push({ name: 'Login' })
}

onMounted(async () => {
  try {
    user.value = await fetchMe()
  } catch {
    // Not logged in
  }
  clockTimer = setInterval(() => { now.value = new Date() }, 5000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>

<style scoped>
.app-title-link {
  text-decoration: none;
  color: inherit;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.sync-status-centered {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  white-space: nowrap;
}
</style>
