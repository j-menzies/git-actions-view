<template>
  <div class="job-row d-flex align-center py-2 px-3" :class="{ 'job-row--border': !last }">
    <StatusChip :status="job.status" :conclusion="job.conclusion" class="mr-3" />

    <span class="job-name text-body-2 font-weight-medium flex-grow-1">{{ job.name }}</span>

    <span v-if="job.duration" class="text-body-2 text-medium-emphasis mx-3">
      <v-icon size="small" class="mr-1">mdi-timer-outline</v-icon>
      {{ job.duration }}
    </span>

    <span v-if="job.runnerName" class="text-body-2 text-medium-emphasis mx-3">
      <v-icon size="small" class="mr-1">mdi-server</v-icon>
      {{ job.runnerName }}
    </span>

    <v-btn
      v-if="job.htmlUrl"
      :href="job.htmlUrl"
      target="_blank"
      icon
      size="x-small"
      variant="text"
    >
      <v-icon size="small">mdi-open-in-new</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import StatusChip from './StatusChip.vue'

defineProps({
  job: Object,
  last: Boolean,
})
</script>

<style scoped>
.job-row--border {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
