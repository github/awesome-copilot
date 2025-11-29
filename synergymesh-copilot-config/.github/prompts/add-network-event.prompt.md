---
mode: 'agent'
description: 'Add a new Socket.io network event to SynergyMesh'
tools: ['codebase', 'editFiles']
---

# Add Network Event to SynergyMesh

Add a new real-time network event for multi-user synchronization.

## Event Details

**Event Name**: {{eventName}}
**Direction**: {{direction}} (client-to-server / server-to-client / bidirectional)
**Description**: {{description}}

## Implementation Steps

1. **Add event constant** to `common/src/constants/common_network_events.ts`:
   ```typescript
   export const {{EVENT_NAME}} = '{{eventName}}';
   ```

2. **Define event payload interface** (if not exists):
   ```typescript
   export interface {{EventName}}Payload {
       // Define payload structure
   }
   ```

3. **Implement server-side handler** in `server/src/services/networking_service.ts`:
   ```typescript
   socket.on(NetworkEvents.{{EVENT_NAME}}, (data: {{EventName}}Payload) => {
       // Validate incoming data
       // Process event
       // Broadcast to other clients if needed
       socket.to(roomId).emit(NetworkEvents.{{EVENT_NAME}}, processedData);
   });
   ```

4. **Implement client-side handler** in the relevant app or common networking utility:
   ```typescript
   socket.on(NetworkEvents.{{EVENT_NAME}}, (data: {{EventName}}Payload) => {
       // Handle incoming event
       this.on{{EventName}}Received(data);
   });
   
   // Emit event to server
   public emit{{EventName}}(data: {{EventName}}Payload): void {
       socket.emit(NetworkEvents.{{EVENT_NAME}}, data);
   }
   ```

5. **Add error handling** for network failures and invalid payloads

6. **Update documentation** if this is a core API event
