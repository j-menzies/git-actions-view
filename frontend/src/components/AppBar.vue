<template>
  <v-app-bar flat border>
    <v-app-bar-title>
      <router-link :to="{ name: 'Runs' }" class="app-title-link">
        <v-icon class="mr-1">mdi-github</v-icon>
        GitActionsView
      </router-link>
    </v-app-bar-title>

    <template #append>
      <v-btn icon :to="{ name: 'Settings' }">
        <v-icon>mdi-cog</v-icon>
      </v-btn>

      <v-btn icon @click="toggleTheme">
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <template v-if="user">
        <v-avatar v-if="user.avatarUrl" size="28" class="mx-2">
          <v-img :src="user.avatarUrl" :alt="user.name" />
        </v-avatar>
        <span class="text-body-2 mr-2">{{ user.name || user.login }}</span>
        <v-btn variant="text" size="small" @click="handleLogout">Logout</v-btn>
      </template>
    </template>
  </v-app-bar>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTheme } from 'vuetify'
import { fetchMe, logout } from '@/services/api'
import { useRouter } from 'vue-router'

const theme = useTheme()
const router = useRouter()
const user = ref(null)

const isDark = computed(() => theme.global.current.value.dark)

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
