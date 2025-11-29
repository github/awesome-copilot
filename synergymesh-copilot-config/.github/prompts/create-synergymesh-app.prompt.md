---
mode: 'agent'
description: 'Create a new SynergyMesh application with proper structure and boilerplate'
tools: ['codebase', 'editFiles', 'runTerminal']
---

# Create New SynergyMesh Application

Create a new multi-touch collaborative application for the SynergyMesh framework.

## Application Requirements

**App Name**: {{appName}}
**Description**: {{description}}

## Tasks

1. **Create folder structure**:
   ```
   apps/{{appName}}/
   ├── src/
   │   └── {{appName}}_app.ts
   └── web/
       ├── index.html
       └── app.css
   ```

2. **Implement the main app class** extending `SynergyMeshApp`:
   - Import required modules from `common/src/`
   - Set up touch event handlers
   - Initialize networking if multi-user
   - Implement item creation and interaction logic

3. **Create HTML entry point** with:
   - Proper DOCTYPE and meta tags
   - Link to common CSS (`../../common/web/synergymesh.css`)
   - Link to app-specific CSS
   - Canvas or container element for items
   - Script inclusion for the bundled app

4. **Update webpack.config.js** to include the new entry point

5. **Add any necessary content files** (JSON data, images) in `web/contents/`

## Example App Structure

```typescript
import { SynergyMeshApp } from '../../common/src/synergymesh_app';
import { TouchManager } from '../../common/src/listeners/touch_manager';
import { NetworkFlickManager } from '../../common/src/listeners/network_flick_manager';

export class {{PascalCaseAppName}}App extends SynergyMeshApp {
    private touchManager: TouchManager;
    
    protected initialize(): void {
        super.initialize();
        this.setupTouchHandlers();
        this.loadContent();
    }
    
    private setupTouchHandlers(): void {
        // Touch event setup
    }
    
    private loadContent(): void {
        // Load app-specific content
    }
}

// Initialize app when DOM is ready
$(document).ready(() => {
    new {{PascalCaseAppName}}App();
});
```
