<template>
  <v-card class="run-card mb-2" variant="outlined" @click="expanded = !expanded">
    <div class="d-flex align-center pa-3">
      <StatusChip :status="run.status" :conclusion="run.conclusion" class="mr-3" />

      <div class="flex-grow-1 d-flex flex-wrap align-center ga-2">
        <a
          :href="repoUrl"
          target="_blank"
          class="text-body-2 font-weight-bold text-decoration-none run-link"
          @click.stop
        >
          {{ run.ownerName }}/{{ run.repoName }}
        </a>
        <span class="text-body-2 text-medium-emphasis">
          {{ run.workflowName }}
        </span>
        <v-chip size="x-small" variant="outlined" class="font-weight-medium">
          #{{ run.runNumber }}
        </v-chip>
      </div>

      <div class="d-flex align-center ga-3 flex-shrink-0">
        <a
          v-if="run.branch"
          :href="branchUrl"
          target="_blank"
          class="text-decoration-none"
          @click.stop
        >
          <v-chip size="x-small" variant="tonal" color="primary" prepend-icon="mdi-source-branch" class="run-link-chip">
            {{ run.branch }}
          </v-chip>
        </a>

        <a
          v-if="run.event && run.pullRequestUrl"
          :href="run.pullRequestUrl"
          target="_blank"
          class="text-decoration-none"
          @click.stop
        >
          <v-chip size="x-small" variant="tonal" prepend-icon="mdi-source-pull" class="run-link-chip">
            {{ run.event }}
          </v-chip>
        </a>
        <v-chip v-else-if="run.event" size="x-small" variant="tonal" prepend-icon="mdi-lightning-bolt">
          {{ run.event }}
        </v-chip>

        <!-- Actor with link (only for real users) -->
        <a
          v-if="run.actorLogin && isActorUser"
          :href="actorUrl"
          target="_blank"
          class="d-flex align-center ga-1 text-decoration-none run-link"
          @click.stop
        >
          <v-avatar v-if="run.actorAvatarUrl" size="20">
            <v-img :src="run.actorAvatarUrl" :alt="run.actorLogin" />
          </v-avatar>
          <span class="text-body-2 text-medium-emphasis">{{ run.actorLogin }}</span>
        </a>
        <!-- Actor without link (bots, orgs) -->
        <span
          v-else-if="run.actorLogin"
          class="d-flex align-center ga-1"
        >
          <v-avatar v-if="run.actorAvatarUrl" size="20">
            <v-img :src="run.actorAvatarUrl" :alt="run.actorLogin" />
          </v-avatar>
          <span class="text-body-2 text-medium-emphasis">{{ run.actorLogin }}</span>
        </span>
        <!-- Avatar only, no login -->
        <template v-else>
          <v-avatar v-if="run.actorAvatarUrl" size="20">
            <v-img :src="run.actorAvatarUrl" :alt="run.actorLogin" />
          </v-avatar>
        </template>

        <v-tooltip text="Elapsed time" location="top">
          <template #activator="{ props: tip }">
            <span v-if="run.duration" v-bind="tip" class="text-body-2 text-medium-emphasis">
              <v-icon size="small">mdi-timer-outline</v-icon>
              {{ run.duration }}
            </span>
          </template>
        </v-tooltip>

        <v-tooltip text="Total billable minutes" location="top">
          <template #activator="{ props: tip }">
            <span v-if="run.totalBillableMinutes > 0" v-bind="tip" class="text-body-2 text-medium-emphasis">
              <v-icon size="small">mdi-cash-multiple</v-icon>
              {{ run.totalBillableMinutes }} min
            </span>
          </template>
        </v-tooltip>

        <span class="text-body-2 text-medium-emphasis">
          {{ relativeTime }}
        </span>

        <span v-if="jobBadge" class="text-body-2" :class="jobBadgeColor">
          {{ jobBadge }}
        </span>

        <v-tooltip text="View on GitHub" location="top">
          <template #activator="{ props: tip }">
            <v-btn
              v-bind="tip"
              :href="run.htmlUrl"
              target="_blank"
              icon
              size="x-small"
              variant="text"
              @click.stop
            >
              <v-icon size="small">mdi-open-in-new</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </div>
    </div>

    <v-expand-transition>
      <div v-if="expanded">
        <v-divider />
        <JobList :run-id="run.id" />
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatusChip from './StatusChip.vue'
import JobList from './JobList.vue'

const props = defineProps({
  run: { type: Object, required: true },
})

const expanded = ref(false)

const repoUrl = computed(() =>
  `https://github.com/${props.run.ownerName}/${props.run.repoName}`
)

const branchUrl = computed(() =>
  `https://github.com/${props.run.ownerName}/${props.run.repoName}/tree/${props.run.branch}`
)

const actorUrl = computed(() =>
  `https://github.com/${props.run.actorLogin}`
)

const isActorUser = computed(() =>
  !props.run.actorType || props.run.actorType === 'User'
)

const relativeTime = computed(() => {
  const now = new Date()
  const created = new Date(props.run.createdAt)
  const diffMs = now - created
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
})

const jobBadge = computed(() => {
  const s = props.run.jobSummary
  if (!s || s.total === 0) return null
  if (s.failure > 0) return `${s.success}/${s.total}`
  return `${s.success}/${s.total}`
})

const jobBadgeColor = computed(() => {
  const s = props.run.jobSummary
  if (!s) return ''
  if (s.failure > 0) return 'text-error'
  if (s.success === s.total) return 'text-success'
  return 'text-medium-emphasis'
})
</script>

<style scoped>
.run-card {
  cursor: pointer;
  transition: background-color 0.15s;
}
.run-card:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
.run-link {
  color: inherit;
}
.run-link:hover {
  text-decoration: underline !important;
}
.run-link-chip:hover {
  opacity: 0.85;
}
</style>
