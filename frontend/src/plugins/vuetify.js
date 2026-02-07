import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const githubLight = {
  dark: false,
  colors: {
    primary: '#0969da',
    secondary: '#656d76',
    success: '#1a7f37',
    error: '#cf222e',
    warning: '#bf8700',
    info: '#0969da',
    background: '#ffffff',
    surface: '#f6f8fa',
    'surface-variant': '#ffffff',
    'on-surface': '#1f2328',
    'on-background': '#1f2328',
  },
}

const githubDark = {
  dark: true,
  colors: {
    primary: '#58a6ff',
    secondary: '#8b949e',
    success: '#3fb950',
    error: '#f85149',
    warning: '#d29922',
    info: '#58a6ff',
    background: '#0d1117',
    surface: '#161b22',
    'surface-variant': '#21262d',
    'on-surface': '#c9d1d9',
    'on-background': '#c9d1d9',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'githubLight',
    themes: {
      githubLight,
      githubDark,
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
