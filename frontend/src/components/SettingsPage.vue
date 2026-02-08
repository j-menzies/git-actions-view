<template>
  <v-container fluid class="pa-4" style="max-width: 900px">
    <h1 class="text-h5 mb-4">Settings</h1>

    <!-- Polling Intervals -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-timer-sync</v-icon>
        Polling Intervals
      </v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap ga-4 align-end">
          <v-text-field
            v-model.number="settings.discoveryPollSeconds"
            label="Discovery poll (seconds)"
            type="number"
            min="5"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 220px"
          />
          <v-text-field
            v-model.number="settings.activePollSeconds"
            label="Active run poll (seconds)"
            type="number"
            min="5"
            density="compact"
            variant="outlined"
            hide-details
            style="max-width: 220px"
          />
          <v-btn
            color="primary"
            :loading="savingSettings"
            @click="saveSettings"
          >
            Save
          </v-btn>
        </div>
        <div v-if="settingsMessage" class="text-caption mt-2" :class="settingsError ? 'text-error' : 'text-success'">
          {{ settingsMessage }}
        </div>
      </v-card-text>
    </v-card>

    <!-- Database -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-database</v-icon>
        Database
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Rebuild the cache by deleting all workflow data and re-syncing from GitHub.
          This can fix stale or incorrect data.
        </p>
        <v-btn
          color="error"
          variant="outlined"
          :loading="rebuilding"
          @click="showRebuildDialog = true"
        >
          <v-icon class="mr-1">mdi-database-refresh</v-icon>
          Rebuild Cache
        </v-btn>
        <div v-if="rebuildMessage" class="text-caption mt-2" :class="rebuildError ? 'text-error' : 'text-success'">
          {{ rebuildMessage }}
        </div>
      </v-card-text>
    </v-card>

    <!-- Repositories -->
    <v-card variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-source-repository</v-icon>
        Repositories
      </v-card-title>
      <v-card-text>
        <!-- Add Repo Form -->
        <div class="mb-4">
          <v-autocomplete
            v-if="githubReposAvailable"
            v-model="selectedRepo"
            :items="availableRepos"
            :loading="loadingGithubRepos"
            item-title="fullName"
            item-value="fullName"
            label="Add a repository"
            placeholder="Search your GitHub repositories..."
            density="compact"
            variant="outlined"
            hide-details
            clearable
            @update:model-value="onRepoSelected"
          >
            <template #no-data>
              <v-list-item v-if="loadingGithubRepos">
                <v-list-item-title>Loading repositories...</v-list-item-title>
              </v-list-item>
              <v-list-item v-else>
                <v-list-item-title>No matching repositories found</v-list-item-title>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Fallback to manual input when no GitHub token is available -->
          <div v-else class="d-flex flex-wrap ga-3 align-end">
            <v-text-field
              v-model="newRepoOwner"
              label="Owner"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="e.g. octocat"
              style="max-width: 200px"
            />
            <v-text-field
              v-model="newRepoName"
              label="Repository"
              density="compact"
              variant="outlined"
              hide-details
              placeholder="e.g. hello-world"
              style="max-width: 200px"
            />
            <v-btn
              color="primary"
              :loading="addingRepo"
              :disabled="!newRepoOwner || !newRepoName"
              @click="handleAddRepo"
            >
              <v-icon class="mr-1">mdi-plus</v-icon>
              Add
            </v-btn>
          </div>
        </div>

        <div v-if="repoMessage" class="text-caption mb-3" :class="repoError ? 'text-error' : 'text-success'">
          {{ repoMessage }}
        </div>

        <!-- Repo Table -->
        <v-table v-if="repos.length > 0" density="compact">
          <thead>
            <tr>
              <th>Repository</th>
              <th style="width: 120px">Visible</th>
              <th style="width: 80px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="repo in repos" :key="repo.id">
              <td class="text-body-2">{{ repo.owner }}/{{ repo.name }}</td>
              <td>
                <v-switch
                  :model-value="!repo.hidden"
                  density="compact"
                  hide-details
                  color="primary"
                  @update:model-value="(val) => toggleHidden(repo, !val)"
                />
              </td>
              <td>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="confirmDelete(repo)"
                >
                  <v-icon size="small">mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-body-2 text-medium-emphasis">No repositories configured.</p>
      </v-card-text>
    </v-card>

    <!-- Rebuild Confirmation Dialog -->
    <v-dialog v-model="showRebuildDialog" max-width="420">
      <v-card>
        <v-card-title>Rebuild Database Cache?</v-card-title>
        <v-card-text>
          This will delete all cached workflow data and re-sync everything from GitHub.
          This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showRebuildDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="rebuilding" @click="handleRebuild">Rebuild</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Repo Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="420">
      <v-card>
        <v-card-title>Delete Repository?</v-card-title>
        <v-card-text>
          This will remove <strong>{{ repoToDelete?.owner }}/{{ repoToDelete?.name }}</strong> and all
          its cached workflow data. This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deletingRepo" @click="handleDeleteRepo">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  fetchSettings, updateSettings,
  fetchRepos, addRepo, updateRepo, deleteRepo,
  rebuildDatabase, fetchGithubRepos,
} from '@/services/api'

// --- Settings ---
const settings = reactive({ discoveryPollSeconds: 60, activePollSeconds: 10 })
const savingSettings = ref(false)
const settingsMessage = ref('')
const settingsError = ref(false)

async function loadSettings() {
  try {
    const data = await fetchSettings()
    settings.discoveryPollSeconds = data.discoveryPollSeconds
    settings.activePollSeconds = data.activePollSeconds
  } catch {
    // Use defaults
  }
}

async function saveSettings() {
  savingSettings.value = true
  settingsMessage.value = ''
  try {
    await updateSettings({
      discoveryPollSeconds: settings.discoveryPollSeconds,
      activePollSeconds: settings.activePollSeconds,
    })
    settingsMessage.value = 'Settings saved. Polling restarted.'
    settingsError.value = false
  } catch (err) {
    settingsMessage.value = err.message
    settingsError.value = true
  } finally {
    savingSettings.value = false
  }
}

// --- Database ---
const showRebuildDialog = ref(false)
const rebuilding = ref(false)
const rebuildMessage = ref('')
const rebuildError = ref(false)

async function handleRebuild() {
  rebuilding.value = true
  rebuildMessage.value = ''
  try {
    await rebuildDatabase()
    rebuildMessage.value = 'Cache cleared. Re-sync started.'
    rebuildError.value = false
    showRebuildDialog.value = false
  } catch (err) {
    rebuildMessage.value = err.message
    rebuildError.value = true
  } finally {
    rebuilding.value = false
  }
}

// --- Repos ---
const repos = ref([])
const newRepoOwner = ref('')
const newRepoName = ref('')
const addingRepo = ref(false)
const repoMessage = ref('')
const repoError = ref(false)
const showDeleteDialog = ref(false)
const repoToDelete = ref(null)
const deletingRepo = ref(false)
const selectedRepo = ref(null)
const githubRepos = ref([])
const loadingGithubRepos = ref(false)
const githubReposAvailable = ref(false)

const availableRepos = computed(() => {
  const configuredSet = new Set(repos.value.map(r => `${r.owner}/${r.name}`))
  return githubRepos.value.filter(r => !configuredSet.has(r.fullName))
})

async function loadRepos() {
  try {
    const data = await fetchRepos()
    repos.value = data.repos
  } catch {
    // Ignore
  }
}

async function loadGithubRepos() {
  loadingGithubRepos.value = true
  try {
    const data = await fetchGithubRepos()
    githubRepos.value = data.repos
    githubReposAvailable.value = true
  } catch {
    // No token available or API error — fall back to manual input
    githubReposAvailable.value = false
  } finally {
    loadingGithubRepos.value = false
  }
}

async function onRepoSelected(fullName) {
  if (!fullName) return
  const [owner, name] = fullName.split('/')
  addingRepo.value = true
  repoMessage.value = ''
  try {
    await addRepo(owner, name)
    repoMessage.value = `Added ${fullName}. Sync started.`
    repoError.value = false
    selectedRepo.value = null
    await loadRepos()
  } catch (err) {
    repoMessage.value = err.message
    repoError.value = true
  } finally {
    addingRepo.value = false
  }
}

async function handleAddRepo() {
  addingRepo.value = true
  repoMessage.value = ''
  try {
    await addRepo(newRepoOwner.value.trim(), newRepoName.value.trim())
    repoMessage.value = `Added ${newRepoOwner.value}/${newRepoName.value}. Sync started.`
    repoError.value = false
    newRepoOwner.value = ''
    newRepoName.value = ''
    await loadRepos()
  } catch (err) {
    repoMessage.value = err.message
    repoError.value = true
  } finally {
    addingRepo.value = false
  }
}

async function toggleHidden(repo, hidden) {
  try {
    await updateRepo(repo.id, { hidden })
    repo.hidden = hidden ? 1 : 0
  } catch {
    // Revert on error
  }
}

function confirmDelete(repo) {
  repoToDelete.value = repo
  showDeleteDialog.value = true
}

async function handleDeleteRepo() {
  if (!repoToDelete.value) return
  deletingRepo.value = true
  try {
    await deleteRepo(repoToDelete.value.id)
    showDeleteDialog.value = false
    repoToDelete.value = null
    await loadRepos()
    repoMessage.value = 'Repository deleted.'
    repoError.value = false
  } catch (err) {
    repoMessage.value = err.message
    repoError.value = true
  } finally {
    deletingRepo.value = false
  }
}

// --- Lifecycle ---
onMounted(() => {
  loadSettings()
  loadRepos()
  loadGithubRepos()
})
</script>
