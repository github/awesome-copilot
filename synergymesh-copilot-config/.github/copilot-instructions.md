# SynergyMesh Copilot Instructions

> These instructions guide GitHub Copilot when working with the SynergyMesh project - a TypeScript library for web-based multi-user natural user interface applications.

## Project Overview

SynergyMesh is a library supporting:
- Multi-touch gesture support for collaborative surfaces
- Real-time networking via Socket.io
- Web-based multi-user applications

### Technology Stack
- **Language**: TypeScript (compiled with Webpack)
- **Runtime**: Node.js + Browser
- **Networking**: Socket.io (client & server)
- **Frontend**: D3.js (v3.5), jQuery
- **Server**: Express.js
- **Build**: Webpack + ts-loader

## Project Structure

```
synergymesh/
├── apps/                    # Application implementations
│   ├── mysteries/          # Collaborative mystery-solving app
│   ├── prototype/          # Prototype testing app
│   └── teacher_controls/   # Teacher control interface
├── common/                  # Shared library code
│   ├── src/
│   │   ├── constants/      # Shared constants
│   │   ├── items/          # UI item definitions
│   │   ├── listeners/      # Touch & network event handlers
│   │   └── utils/          # Utility functions
│   └── web/                # Shared CSS and scripts
├── server/                  # Socket.io server
│   └── src/
│       └── services/       # Server services
└── config.json             # Application configuration
```

## Core Development Guidelines

### TypeScript Standards

- Target TypeScript 2.7+ with ES2015 module output
- Use strict null checks and explicit type annotations
- Prefer interfaces over type aliases for object shapes
- Use discriminated unions for event types

### Naming Conventions

- **Files**: Use snake_case (e.g., `touch_manager.ts`, `network_flick_manager.ts`)
- **Classes**: Use PascalCase (e.g., `FlickManager`, `NetworkingService`)
- **Variables/Functions**: Use camelCase
- **Constants**: Use UPPER_SNAKE_CASE for module-level constants

### Multi-Touch Event Handling

When working with touch events:
- Use the `TouchManager` class from `common/src/listeners/touch_manager.ts`
- Handle touch start, move, and end events consistently
- Implement gesture recognition through the `FlickManager`
- Support both touch and mouse fallback for development

```typescript
// Example touch handler pattern
class TouchHandler {
    private touchManager: TouchManager;

    initialize(element: HTMLElement): void {
        this.touchManager = new TouchManager(element);
        this.touchManager.onFlick((direction, velocity) => {
            this.handleFlick(direction, velocity);
        });
    }
}
```

### Socket.io Networking

When implementing real-time features:
- Use event names from `common/src/constants/common_network_events.ts`
- Follow the existing networking patterns in `common/src/utils/networking.ts`
- Implement proper connection state handling
- Use rooms for multi-table scenarios

```typescript
// Server-side event emission pattern
socket.to(roomId).emit(NetworkEvents.ITEM_MOVED, {
    itemId: item.id,
    position: { x, y },
    timestamp: Date.now()
});

// Client-side event handling pattern
socket.on(NetworkEvents.ITEM_MOVED, (data) => {
    this.updateItemPosition(data.itemId, data.position);
});
```

### D3.js Integration

For visual elements and data binding:
- Use D3 v3.5 API (note: significantly different from v4+)
- Leverage D3 for SVG manipulation and data-driven updates
- Use enter/update/exit pattern for dynamic content

```typescript
// D3 v3 pattern for updating items
const items = d3.select('#container')
    .selectAll('.item')
    .data(itemData, d => d.id);

items.enter()
    .append('div')
    .attr('class', 'item')
    .style('transform', d => `translate(${d.x}px, ${d.y}px)`);

items.exit().remove();
```

## Application Development

### Creating New Apps

When creating a new application:
1. Create folder structure under `apps/[app-name]/`
2. Implement app class extending `SynergyMeshApp`
3. Create HTML entry point in `web/index.html`
4. Add webpack entry in `webpack.config.js`

```typescript
// App class template
import { SynergyMeshApp } from '../../common/src/synergymesh_app';

export class MyApp extends SynergyMeshApp {
    protected initialize(): void {
        super.initialize();
        // App-specific initialization
    }

    protected onItemCreated(item: Item): void {
        // Handle new item creation
    }
}
```

### Configuration

- Use `config.json` for application settings
- Access configuration via `common/src/utils/config.ts`
- Support query string overrides for runtime configuration

## Server Development

### Adding New Services

- Place services in `server/src/services/`
- Follow the pattern in `networking_service.ts`
- Register services in `server/src/server.ts`

### Event Handling

- Define new events in `common/src/constants/common_network_events.ts`
- Keep client and server event handlers synchronized
- Implement proper error handling and reconnection logic

## Testing & Development

### Local Development

```bash
# Install dependencies
npm run install:dev

# Start webpack dev server (client)
npm run start:site:dev

# Start Socket.io server (separate terminal)
npm run start:networking:dev
```

### Browser Testing

- Test with touch-emulator.js for multi-touch simulation
- Use Chrome DevTools device mode for touch event testing
- Test across multiple browser instances for networking

## Code Quality

- Add JSDoc comments to public APIs
- Keep functions small and focused
- Extract reusable logic into utilities
- Handle edge cases for touch and network events
- Clean up event listeners on component disposal

## Security Considerations

- Validate all incoming socket messages
- Sanitize user-provided content names
- Implement rate limiting for network events
- Use secure WebSocket connections (WSS) in production
