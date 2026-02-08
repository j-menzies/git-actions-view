<template>
  <v-app-bar flat border>
    <v-app-bar-title>
      <router-link :to="{ name: 'Runs' }" class="app-title-link">
        <v-icon class="mr-1">mdi-github</v-icon>
        GitActionsView
      </router-link>
    </v-app-bar-title>

    <template #append>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { fetchMe, logout } from '@/services/api'
import { useFilters } from '@/composables/useFilters'

const theme = useTheme()
const route = useRoute()
const router = useRouter()
const user = ref(null)
const filterMenuOpen = ref(false)

const { state: filterState, setFilter } = useFilters()

const isDark = computed(() => theme.global.current.value.dark)
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
</style>
