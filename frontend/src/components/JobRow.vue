<template>
  <div class="job-row d-flex align-center py-2 px-3" :class="{ 'job-row--border': !last }">
    <StatusChip :status="job.status" :conclusion="job.conclusion" class="mr-3" />

    <span class="job-name text-body-2 font-weight-medium flex-grow-1">{{ job.name }}</span>

    <v-tooltip text="Elapsed time" location="top">
      <template #activator="{ props: tip }">
        <span v-if="job.duration" v-bind="tip" class="text-body-2 text-medium-emphasis mx-3">
          <v-icon size="small" class="mr-1">mdi-timer-outline</v-icon>
          {{ job.duration }}
        </span>
      </template>
    </v-tooltip>

    <v-tooltip text="Billable minutes" location="top">
      <template #activator="{ props: tip }">
        <span v-if="job.billableMinutes != null" v-bind="tip" class="text-body-2 text-medium-emphasis mx-3">
          <v-icon size="small" class="mr-1">mdi-cash-multiple</v-icon>
          <template v-if="job.runnerOs === 'self-hosted'">self-hosted</template>
          <template v-else>
            {{ job.billableMinutes }} min
            <span v-if="job.runnerOs" class="text-caption">({{ runnerLabel }})</span>
          </template>
        </span>
      </template>
    </v-tooltip>

    <v-tooltip text="Runner" location="top">
      <template #activator="{ props: tip }">
        <span v-if="job.runnerName" v-bind="tip" class="text-body-2 text-medium-emphasis mx-3">
          <v-icon size="small" class="mr-1">mdi-server</v-icon>
          {{ job.runnerName }}
        </span>
      </template>
    </v-tooltip>

    <v-tooltip text="View on GitHub" location="top">
      <template #activator="{ props: tip }">
        <v-btn
          v-if="job.htmlUrl"
          v-bind="tip"
          :href="job.htmlUrl"
          target="_blank"
          icon
          size="x-small"
          variant="text"
        >
          <v-icon size="small">mdi-open-in-new</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  job: Object,
  last: Boolean,
})

const runnerLabels = { linux: 'Linux 1x', windows: 'Windows 2x', macos: 'macOS 10x', 'self-hosted': 'Self-hosted' }
const runnerLabel = computed(() => runnerLabels[props.job.runnerOs] || props.job.runnerOs)
</script>

<style scoped>
.job-row--border {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
