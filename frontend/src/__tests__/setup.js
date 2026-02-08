// Common test setup
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Create a test-friendly vuetify instance
export function createTestVuetify() {
  return createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
    },
  })
}

// Mock ResizeObserver for jsdom (required by Vuetify components)
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
    this.elements = []
  }
  observe(el) {
    this.elements.push(el)
  }
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting }])
  }
}

if (typeof window !== 'undefined') {
  window.IntersectionObserver = MockIntersectionObserver
  window.ResizeObserver = MockResizeObserver
  // Mock visualViewport for Vuetify VOverlay/VDialog
  if (!window.visualViewport) {
    window.visualViewport = {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
  }
}
if (typeof global !== 'undefined') {
  global.ResizeObserver = MockResizeObserver
  global.IntersectionObserver = MockIntersectionObserver
}
