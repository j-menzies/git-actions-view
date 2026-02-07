<template>
  <v-chip :color="chipColor" :variant="variant" size="small" :prepend-icon="chipIcon">
    {{ label }}
  </v-chip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: String,
  conclusion: String,
  variant: { type: String, default: 'tonal' },
})

const chipColor = computed(() => {
  if (props.status === 'in_progress') return 'warning'
  if (props.status === 'queued' || props.status === 'waiting') return 'secondary'
  if (!props.conclusion) return 'secondary'

  const map = {
    success: 'success',
    failure: 'error',
    cancelled: 'secondary',
    skipped: 'secondary',
    timed_out: 'error',
    action_required: 'warning',
    startup_failure: 'error',
  }
  return map[props.conclusion] || 'secondary'
})

const chipIcon = computed(() => {
  if (props.status === 'in_progress') return 'mdi-loading mdi-spin'
  if (props.status === 'queued') return 'mdi-clock-outline'
  if (props.status === 'waiting') return 'mdi-clock-outline'
  if (!props.conclusion) return 'mdi-help-circle-outline'

  const map = {
    success: 'mdi-check-circle',
    failure: 'mdi-close-circle',
    cancelled: 'mdi-cancel',
    skipped: 'mdi-skip-next-circle',
    timed_out: 'mdi-timer-off',
    action_required: 'mdi-alert-circle',
    startup_failure: 'mdi-close-circle',
  }
  return map[props.conclusion] || 'mdi-help-circle-outline'
})

const label = computed(() => {
  if (props.status === 'in_progress') return 'In Progress'
  if (props.status === 'queued') return 'Queued'
  if (props.status === 'waiting') return 'Waiting'
  if (!props.conclusion) return props.status || 'Unknown'

  const map = {
    success: 'Success',
    failure: 'Failure',
    cancelled: 'Cancelled',
    skipped: 'Skipped',
    timed_out: 'Timed Out',
    action_required: 'Action Required',
    startup_failure: 'Startup Failure',
  }
  return map[props.conclusion] || props.conclusion
})
</script>
