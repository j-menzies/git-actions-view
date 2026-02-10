import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useFullscreen } from '@/composables/useFullscreen'

// Mount a wrapper component so onMounted fires
function mountWithFullscreen() {
  let result
  const Wrapper = defineComponent({
    setup() {
      result = useFullscreen()
      return {}
    },
    template: '<div />',
  })
  const wrapper = mount(Wrapper)
  return { wrapper, result }
}

describe('useFullscreen', () => {
  let origRequestFullscreen

  beforeEach(() => {
    vi.clearAllMocks()
    // Patch fullscreen properties onto the real jsdom document/element
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, writable: true, configurable: true })
    Object.defineProperty(document, 'fullscreenElement', { value: null, writable: true, configurable: true })
    document.exitFullscreen = vi.fn().mockResolvedValue()
    origRequestFullscreen = document.documentElement.requestFullscreen
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue()
  })

  afterEach(() => {
    delete document.fullscreenEnabled
    delete document.fullscreenElement
    delete document.exitFullscreen
    document.documentElement.requestFullscreen = origRequestFullscreen
  })

  it('should provide fullscreen functionality', () => {
    const { result } = mountWithFullscreen()

    expect(result).toHaveProperty('isFullscreen')
    expect(result).toHaveProperty('isSupported')
    expect(result).toHaveProperty('toggleFullscreen')
    expect(result).toHaveProperty('requestFullscreen')
    expect(result).toHaveProperty('exitFullscreen')
  })

  it('should detect when fullscreen is supported', () => {
    const { result } = mountWithFullscreen()
    expect(result.isSupported.value).toBe(true)
  })

  it('should detect when fullscreen is not supported', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, writable: true, configurable: true })

    const { result } = mountWithFullscreen()
    expect(result.isSupported.value).toBe(false)
  })

  it('should call requestFullscreen when toggling from non-fullscreen', async () => {
    const { result } = mountWithFullscreen()

    await result.toggleFullscreen()
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('Test error'))

    const { result } = mountWithFullscreen()

    // Should not throw
    await expect(result.toggleFullscreen()).resolves.toBeUndefined()
  })
})