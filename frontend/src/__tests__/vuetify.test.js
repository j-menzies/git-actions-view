import { describe, it, expect } from 'vitest'
import vuetify from '@/plugins/vuetify'

describe('vuetify plugin', () => {
  it('creates a vuetify instance', () => {
    expect(vuetify).toBeDefined()
  })

  it('has githubLight theme', () => {
    const themes = vuetify.theme.themes.value
    expect(themes.githubLight).toBeDefined()
    expect(themes.githubLight.dark).toBe(false)
  })

  it('has githubDark theme', () => {
    const themes = vuetify.theme.themes.value
    expect(themes.githubDark).toBeDefined()
    expect(themes.githubDark.dark).toBe(true)
  })

  it('uses githubLight as default theme', () => {
    expect(vuetify.theme.global.name.value).toBe('githubLight')
  })

  it('githubLight has correct primary color', () => {
    const colors = vuetify.theme.themes.value.githubLight.colors
    expect(colors.primary).toBe('#0969da')
  })

  it('githubLight has correct success color', () => {
    const colors = vuetify.theme.themes.value.githubLight.colors
    expect(colors.success).toBe('#1a7f37')
  })

  it('githubLight has correct error color', () => {
    const colors = vuetify.theme.themes.value.githubLight.colors
    expect(colors.error).toBe('#cf222e')
  })

  it('githubLight has correct warning color', () => {
    const colors = vuetify.theme.themes.value.githubLight.colors
    expect(colors.warning).toBe('#bf8700')
  })

  it('githubDark has correct primary color', () => {
    const colors = vuetify.theme.themes.value.githubDark.colors
    expect(colors.primary).toBe('#58a6ff')
  })

  it('githubDark has correct background', () => {
    const colors = vuetify.theme.themes.value.githubDark.colors
    expect(colors.background).toBe('#0d1117')
  })

  it('uses mdi icon set', () => {
    expect(vuetify.icons.defaultSet).toBe('mdi')
  })
})
