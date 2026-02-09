import { ref, onMounted, onUnmounted } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)
  const isSupported = ref(false)

  const updateFullscreenState = () => {
    isFullscreen.value = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    )
  }

  const requestFullscreen = async () => {
    const element = document.documentElement

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen()
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  }

  const toggleFullscreen = async () => {
    if (isFullscreen.value) {
      await exitFullscreen()
    } else {
      await requestFullscreen()
    }
  }

  onMounted(() => {
    // Check if fullscreen is supported
    isSupported.value = Boolean(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    )

    // Listen for fullscreen changes
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]

    events.forEach(event => {
      document.addEventListener(event, updateFullscreenState)
    })

    // Initial state
    updateFullscreenState()
  })

  onUnmounted(() => {
    // Cleanup event listeners
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]

    events.forEach(event => {
      document.removeEventListener(event, updateFullscreenState)
    })
  })

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen,
    requestFullscreen,
    exitFullscreen
  }
}