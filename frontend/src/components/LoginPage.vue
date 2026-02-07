<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6" elevation="2">
          <div class="text-center mb-6">
            <v-icon size="48" color="primary">mdi-github</v-icon>
            <h2 class="text-h5 mt-2">GitActionsView</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Sign in to view your GitHub Actions
            </p>
          </div>

          <div v-if="loading" class="text-center">
            <v-progress-circular indeterminate />
          </div>

          <template v-else>
            <v-btn
              v-if="hasOAuth"
              block
              color="primary"
              size="large"
              href="/auth/github"
              class="mb-4"
              prepend-icon="mdi-github"
            >
              Sign in with GitHub
            </v-btn>

            <template v-if="hasOAuth && hasBasic">
              <v-divider class="my-4" />
              <p class="text-center text-body-2 text-medium-emphasis mb-4">or sign in with credentials</p>
            </template>

            <v-form v-if="hasBasic" @submit.prevent="handleBasicLogin">
              <v-text-field
                v-model="username"
                label="Username"
                variant="outlined"
                density="compact"
                class="mb-2"
                :error-messages="loginError ? ' ' : ''"
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                variant="outlined"
                density="compact"
                class="mb-3"
                :error-messages="loginError || ''"
              />
              <v-btn
                block
                color="primary"
                variant="outlined"
                type="submit"
                :loading="loggingIn"
              >
                Sign In
              </v-btn>
            </v-form>

            <p v-if="!hasOAuth && !hasBasic" class="text-center text-body-2 text-medium-emphasis">
              No authentication configured. <a href="/#/runs">Continue as guest</a>
            </p>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchConfig, loginBasic } from '@/services/api'

const router = useRouter()
const loading = ref(true)
const hasOAuth = ref(false)
const hasBasic = ref(false)
const username = ref('')
const password = ref('')
const loginError = ref('')
const loggingIn = ref(false)

onMounted(async () => {
  try {
    const config = await fetchConfig()
    hasOAuth.value = config.authMechanisms.includes('OAUTH2')
    hasBasic.value = config.authMechanisms.includes('BASIC_AUTH')
    if (!config.authRequired) {
      router.replace({ name: 'Runs' })
    }
  } catch {
    // Fallback
  } finally {
    loading.value = false
  }
})

async function handleBasicLogin() {
  loginError.value = ''
  loggingIn.value = true
  try {
    await loginBasic(username.value, password.value)
    router.push({ name: 'Runs' })
  } catch (err) {
    loginError.value = err.message || 'Login failed'
  } finally {
    loggingIn.value = false
  }
}
</script>
