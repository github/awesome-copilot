---
mode: 'agent'
description: 'Implement a new touch gesture for SynergyMesh items'
tools: ['codebase', 'editFiles']
---

# Implement Touch Gesture

Add a new touch gesture for interactive items in SynergyMesh.

## Gesture Details

**Gesture Name**: {{gestureName}}
**Type**: {{gestureType}} (tap / long-press / pinch / rotate / swipe / custom)
**Target**: {{target}} (items / canvas / specific element)

## Implementation Steps

1. **Create gesture recognizer class** in `common/src/listeners/`:
   ```typescript
   export class {{GestureName}}Manager {
       private element: HTMLElement;
       private threshold: number;
       private callbacks: Map<string, Function[]>;
       
       constructor(element: HTMLElement, options?: {{GestureName}}Options) {
           this.element = element;
           this.threshold = options?.threshold || DEFAULT_THRESHOLD;
           this.callbacks = new Map();
           this.bindEvents();
       }
       
       private bindEvents(): void {
           this.element.addEventListener('touchstart', this.onTouchStart.bind(this));
           this.element.addEventListener('touchmove', this.onTouchMove.bind(this));
           this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
       }
       
       public on{{GestureName}}(callback: (data: {{GestureName}}Data) => void): void {
           // Register callback
       }
       
       public dispose(): void {
           // Clean up event listeners
       }
   }
   ```

2. **Define gesture data interface**:
   ```typescript
   export interface {{GestureName}}Data {
       target: HTMLElement;
       startPosition: { x: number; y: number };
       endPosition: { x: number; y: number };
       duration: number;
       // Add gesture-specific data
   }
   ```

3. **Integrate with TouchManager** if this is a common gesture:
   - Add detection logic to existing touch flow
   - Emit gesture events through the manager

4. **Add network synchronization** if the gesture should be replicated:
   - Define network event in `common_network_events.ts`
   - Implement server relay in networking service
   - Handle remote gesture events on clients

5. **Update app classes** to use the new gesture:
   ```typescript
   private setupGestures(): void {
       this.{{gestureName}}Manager = new {{GestureName}}Manager(this.container);
       this.{{gestureName}}Manager.on{{GestureName}}((data) => {
           this.handle{{GestureName}}(data);
       });
   }
   ```

6. **Add touch emulator support** for desktop testing
