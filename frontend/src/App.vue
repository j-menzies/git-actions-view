<template>
  <v-app>
    <AppBar v-if="showAppBar" />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppBar from './components/AppBar.vue'
import { provideFilters } from './composables/useFilters'
import { useFullscreen } from './composables/useFullscreen'
import { provideSyncStatus } from './composables/useSyncStatus'

const route = useRoute()
const showAppBar = computed(() => route.name !== 'Login')
const { toggleFullscreen } = useFullscreen()
const { connect: connectSSE, disconnect: disconnectSSE } = provideSyncStatus()

// Keyboard shortcut for fullscreen (F11 or Ctrl/Cmd + Shift + F)
const handleKeydown = (event) => {
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFullscreen()
  } else if (event.key === 'f' && event.shiftKey && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    toggleFullscreen()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  connectSSE()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  disconnectSSE()
})

provideFilters()
</script>
