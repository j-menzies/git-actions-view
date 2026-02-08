<template>
  <v-app>
    <AppBar v-if="showAppBar" />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBar from './components/AppBar.vue'
import { provideFilters } from './composables/useFilters'

const route = useRoute()
const showAppBar = computed(() => route.name !== 'Login')

provideFilters()
</script>
