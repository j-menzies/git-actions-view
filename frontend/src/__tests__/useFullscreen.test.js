import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFullscreen } from '@/composables/useFullscreen'

// Create a simple test setup that just calls the composable
function setupUseFullscreen() {
  // Mock document for this test
  const mockElement = {
    requestFullscreen: vi.fn().mockResolvedValue(),
    webkitRequestFullscreen: vi.fn().mockResolvedValue(),
  }

  const mockDocument = {
    fullscreenElement: null,
    fullscreenEnabled: true,
    exitFullscreen: vi.fn().mockResolvedValue(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    documentElement: mockElement,
  }

  // Mock the global document
  vi.stubGlobal('document', mockDocument)

  return { mockElement, mockDocument }
}

describe('useFullscreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should provide fullscreen functionality', () => {
    setupUseFullscreen()
    const result = useFullscreen()
    
    expect(result).toHaveProperty('isFullscreen')
    expect(result).toHaveProperty('isSupported')
    expect(result).toHaveProperty('toggleFullscreen')
    expect(result).toHaveProperty('requestFullscreen')
    expect(result).toHaveProperty('exitFullscreen')
  })

  it('should detect when fullscreen is supported', () => {
    setupUseFullscreen()
    const { isSupported } = useFullscreen()
    expect(isSupported.value).toBe(true)
  })

  it('should detect when fullscreen is not supported', () => {
    const { mockDocument } = setupUseFullscreen()
    mockDocument.fullscreenEnabled = false
    mockDocument.webkitFullscreenEnabled = undefined
    
    const { isSupported } = useFullscreen()
    expect(isSupported.value).toBe(false)
  })

  it('should call requestFullscreen when toggling from non-fullscreen', async () => {
    const { mockElement } = setupUseFullscreen()
    const { toggleFullscreen } = useFullscreen()
    
    await toggleFullscreen()
    expect(mockElement.requestFullscreen).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const { mockElement } = setupUseFullscreen()
    mockElement.requestFullscreen.mockRejectedValue(new Error('Test error'))
    
    const { toggleFullscreen } = useFullscreen()
    
    // Should not throw
    await expect(toggleFullscreen()).resolves.toBeUndefined()
  })
})