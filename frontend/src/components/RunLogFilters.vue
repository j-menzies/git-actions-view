<template>
  <v-card variant="flat" class="mb-4 pa-3">
    <div class="d-flex flex-wrap align-center ga-3">
      <v-select
        v-model="filters.repo"
        :items="repoOptions"
        label="Repository"
        clearable
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 260px"
        @update:model-value="emitChange"
      />

      <v-chip-group
        v-model="filters.status"
        selected-class="text-primary"
        @update:model-value="emitChange"
      >
        <v-chip v-for="s in statusOptions" :key="s.value" :value="s.value" filter variant="outlined" size="small">
          {{ s.label }}
        </v-chip>
      </v-chip-group>

      <v-text-field
        v-model="filters.branch"
        label="Branch"
        clearable
        density="compact"
        variant="outlined"
        hide-details
        style="max-width: 180px"
        @update:model-value="emitChange"
      />
    </div>
  </v-card>
</template>

<script setup>
import { reactive } from 'vue'

const props = defineProps({
  repositories: { type: Array, default: () => [] },
})

const emit = defineEmits(['change'])

const filters = reactive({
  repo: null,
  status: undefined,
  branch: '',
})

const repoOptions = props.repositories.map(r => ({ title: r, value: r }))

const statusOptions = [
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Cancelled', value: 'cancelled' },
]

function emitChange() {
  emit('change', {
    repo: filters.repo || undefined,
    status: filters.status || undefined,
    branch: filters.branch || undefined,
  })
}
</script>
