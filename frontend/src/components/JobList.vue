<template>
  <div class="job-list pa-2">
    <div v-if="loading" class="d-flex justify-center pa-4">
      <v-progress-circular indeterminate size="24" />
    </div>
    <div v-else-if="error" class="text-error pa-3 text-body-2">
      Failed to load jobs: {{ error }}
    </div>
    <div v-else-if="jobs.length === 0" class="text-medium-emphasis pa-3 text-body-2">
      No jobs found for this run.
    </div>
    <template v-else>
      <JobRow
        v-for="(job, index) in jobs"
        :key="job.id"
        :job="job"
        :last="index === jobs.length - 1"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchJobs } from '@/services/api'
import JobRow from './JobRow.vue'

const props = defineProps({
  runId: { type: Number, required: true },
})

const jobs = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const data = await fetchJobs(props.runId)
    jobs.value = data.jobs
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.job-list {
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-radius: 8px;
}
</style>
