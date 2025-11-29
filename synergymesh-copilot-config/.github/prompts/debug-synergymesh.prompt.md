---
mode: 'agent'
description: 'Debug and fix multi-touch or networking issues in SynergyMesh'
tools: ['codebase', 'editFiles', 'runTerminal']
---

# Debug SynergyMesh Issue

Diagnose and fix issues related to multi-touch interactions or real-time networking.

## Issue Details

**Problem**: {{problemDescription}}
**Affected Area**: {{area}} (touch / networking / rendering / performance)
**Steps to Reproduce**: {{stepsToReproduce}}

## Diagnostic Steps

### For Touch Issues

1. **Check touch event binding**:
   - Verify `TouchManager` is properly initialized
   - Confirm event listeners are attached to correct elements
   - Check for event propagation issues (`stopPropagation`, `preventDefault`)

2. **Inspect touch coordinates**:
   - Log touch events to verify coordinate transformation
   - Check for offset calculations in nested containers
   - Verify touch-to-item hit detection logic

3. **Test with touch emulator**:
   - Enable `touch-emulator.js` for desktop testing
   - Compare behavior with real touch device

### For Networking Issues

1. **Check Socket.io connection**:
   ```javascript
   // Add to client for debugging
   socket.on('connect', () => console.log('Connected:', socket.id));
   socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
   socket.on('error', (error) => console.error('Socket error:', error));
   ```

2. **Verify event payload**:
   - Log outgoing events before `emit()`
   - Log incoming events in handlers
   - Check for serialization issues with complex objects

3. **Test room/broadcast logic**:
   - Verify clients join correct rooms
   - Test with multiple browser instances
   - Check server-side room management

### For Rendering Issues

1. **Check D3 data binding**:
   - Verify data key functions return unique IDs
   - Inspect enter/update/exit selections
   - Check for orphaned DOM elements

2. **Inspect CSS transforms**:
   - Verify transform calculations
   - Check for conflicting CSS rules
   - Test with CSS transitions disabled

## Common Fixes

- **Touch not responding**: Check z-index and pointer-events CSS
- **Events firing multiple times**: Remove duplicate event listeners
- **Sync lag**: Implement event batching/debouncing
- **Memory leaks**: Ensure proper disposal of managers and listeners
