# Fullscreen Feature for Git Actions Viewer

This document describes the new fullscreen functionality added to the Git Actions Viewer application.

## Overview

The fullscreen feature allows users to expand the application to use the entire browser window, providing a better viewing experience for monitoring workflow runs and logs. This is particularly useful when:

- Monitoring multiple workflow runs simultaneously
- Examining detailed log outputs
- Working with the application for extended periods
- Using the application on presentation screens or secondary monitors

## Features

### 🖥️ Fullscreen Toggle Button
- Located in the app bar (top navigation)
- Only visible when fullscreen is supported by the browser
- Shows different icons based on current state:
  - `mdi-fullscreen` when not in fullscreen mode
  - `mdi-fullscreen-exit` when in fullscreen mode

### ⌨️ Keyboard Shortcuts
- **F11**: Toggle fullscreen (standard browser shortcut)
- **Ctrl+Shift+F** (Windows/Linux) or **Cmd+Shift+F** (macOS): Custom toggle shortcut
- **Escape**: Exit fullscreen (browser default)

### 🔧 Browser Compatibility
The feature supports all modern browsers with automatic fallback for different vendor prefixes:
- Standard API (`requestFullscreen`, `exitFullscreen`)
- WebKit browsers (`webkitRequestFullscreen`, `webkitExitFullscreen`)
- Firefox (`mozRequestFullScreen`, `mozCancelFullScreen`)
- Internet Explorer/Edge (`msRequestFullscreen`, `msExitFullscreen`)

## Implementation Details

### Files Added/Modified

1. **`src/composables/useFullscreen.js`** - New Vue composable that handles all fullscreen logic
2. **`src/components/AppBar.vue`** - Modified to include fullscreen toggle button
3. **`src/App.vue`** - Modified to add keyboard shortcut handlers
4. **`src/__tests__/useFullscreen.test.js`** - New test file for fullscreen functionality
5. **`src/__tests__/AppBar.test.js`** - Updated to test fullscreen button integration

### API Structure

The `useFullscreen` composable provides:

```javascript
const {
  isFullscreen,      // Reactive ref - true when in fullscreen
  isSupported,       // Reactive ref - true when fullscreen is supported
  toggleFullscreen,  // Function to toggle fullscreen state
  requestFullscreen, // Function to enter fullscreen
  exitFullscreen     // Function to exit fullscreen
} = useFullscreen()
```

### Event Handling

The composable automatically:
- Listens for browser fullscreen state changes
- Updates reactive state when fullscreen mode changes
- Handles cross-browser compatibility
- Cleans up event listeners on component unmount

## User Experience

### Visual Feedback
- The app bar button shows appropriate tooltips ("Enter Fullscreen" / "Exit Fullscreen")
- Icon changes reflect current state
- Button is only shown when fullscreen is supported

### Accessibility
- Proper ARIA attributes and tooltips
- Keyboard navigation support
- Standard browser keyboard shortcuts respected

### Error Handling
- Graceful fallbacks for unsupported browsers
- Console logging for debugging
- Silent error handling to prevent user disruption

## Testing

### Unit Tests
The feature includes comprehensive unit tests covering:
- Fullscreen detection and support checking
- State management and updates
- Browser compatibility methods
- Event listener management
- Integration with AppBar component

### Manual Testing
To test the feature:

1. Start the development server: `npm run dev`
2. Open the application in a browser
3. Look for the fullscreen icon in the app bar (after login)
4. Click the button or use keyboard shortcuts to test functionality
5. Verify the icon changes and state updates correctly

### Cross-Browser Testing
Test across different browsers to ensure compatibility:
- Chrome/Chromium (WebKit)
- Firefox (Mozilla)
- Safari (WebKit)
- Edge (Chromium)

## Usage Instructions

### For End Users

1. **Using the Button**:
   - Log into the Git Actions Viewer
   - Look for the fullscreen icon (⛶) in the top app bar
   - Click to toggle fullscreen mode

2. **Using Keyboard Shortcuts**:
   - Press `F11` to toggle fullscreen
   - Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) to toggle
   - Press `Escape` to exit fullscreen

3. **When to Use Fullscreen**:
   - Viewing multiple workflow runs
   - Examining detailed logs
   - Presenting or demonstrating workflows
   - Extended monitoring sessions

### For Developers

To extend or modify the fullscreen functionality:

1. **Composable Pattern**: The `useFullscreen` composable can be reused in other components
2. **State Management**: All fullscreen state is reactive and automatically synced
3. **Event Cleanup**: Event listeners are automatically cleaned up
4. **Error Handling**: Errors are caught and logged but don't break the UI

## Browser Support

| Browser | Support | API Used |
|---------|---------|----------|
| Chrome 71+ | ✅ | Standard API |
| Firefox 64+ | ✅ | Standard API |
| Safari 16.4+ | ✅ | WebKit API |
| Edge 79+ | ✅ | Standard API |
| IE 11 | ⚠️ | MS API (legacy) |

## Troubleshooting

### Common Issues

**Button not visible**: 
- Check if browser supports fullscreen API
- Ensure user is logged in (button only shows on authenticated pages)

**Fullscreen not working**:
- Try different keyboard shortcuts
- Check browser permissions
- Verify browser supports the feature

**State not updating**:
- Check browser console for errors
- Verify event listeners are properly attached
- Test with browser dev tools

### Debugging

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'fullscreen')
```

This will log fullscreen events and state changes to the console.

## Future Enhancements

Potential improvements for future versions:

1. **Remember Preference**: Store user's fullscreen preference
2. **Auto-fullscreen**: Option to automatically enter fullscreen on specific pages
3. **Kiosk Mode**: Enhanced fullscreen mode for dedicated monitoring displays
4. **Picture-in-Picture**: Support for PiP mode for logs or specific runs
5. **Multi-monitor**: Better support for multi-monitor setups

## Security Considerations

- Fullscreen API requires user interaction (cannot be triggered programmatically without user action)
- No sensitive data is exposed through the fullscreen implementation
- All fullscreen state is client-side only
- Standard browser security policies apply

---

*This feature enhances the Git Actions Viewer with modern browser capabilities while maintaining compatibility and accessibility standards.*