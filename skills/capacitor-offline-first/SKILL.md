---
name: capacitor-offline-first
description: Guide to building offline-first Capacitor apps with data synchronization, caching strategies, and conflict resolution. Covers Fast SQL, service workers, and network detection. Use this skill when users need their app to work without internet.
---

# Offline-First Capacitor Apps

Build apps that work seamlessly with or without internet connectivity.

## When to Use This Skill

- User needs offline support
- User asks about data sync
- User wants caching
- User needs local database
- User has connectivity issues

## Offline-First Architecture

```
┌─────────────────────────────────────────┐
│              UI Layer                    │
├─────────────────────────────────────────┤
│           Service Layer                  │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Online Mode │  │ Offline Mode    │   │
│  └──────┬──────┘  └────────┬────────┘   │
├─────────┼──────────────────┼────────────┤
│         │    Sync Manager  │            │
│         └────────┬─────────┘            │
├──────────────────┼──────────────────────┤
│  ┌───────────────┴───────────────────┐  │
│  │         Local Database            │  │
│  │   (Fast SQL / IndexedDB)          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Network Detection

### Using Capacitor Network Plugin

```bash
npm install @capacitor/network
npx cap sync
```

```typescript
import { Network } from '@capacitor/network';

// Check current status
const status = await Network.getStatus();
console.log('Connected:', status.connected);
console.log('Connection type:', status.connectionType);

// Listen for changes
Network.addListener('networkStatusChange', (status) => {
  console.log('Network status changed:', status.connected);

  if (status.connected) {
    // Back online - sync data
    syncManager.syncPendingChanges();
  } else {
    // Offline - show indicator
    showOfflineIndicator();
  }
});
```

### Network-Aware Service

```typescript
import { Network } from '@capacitor/network';

class NetworkAwareService {
  private isOnline = true;

  constructor() {
    this.init();
  }

  private async init() {
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    Network.addListener('networkStatusChange', (status) => {
      this.isOnline = status.connected;
    });
  }

  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    if (!this.isOnline) {
      // Return cached data
      return this.getCachedData(url);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      // Cache the response
      await this.cacheData(url, data);

      return data;
    } catch (error) {
      // Network error - try cache
      return this.getCachedData(url);
    }
  }
}
```

## Local Database with Fast SQL

### Installation

```bash
npm install @capgo/capacitor-fast-sql
npx cap sync
```

Before using Fast SQL in production, complete the required platform setup:

- iOS: allow localhost networking for the plugin transport.
- Android: add the localhost cleartext exception required by the plugin.
- Web: install `sql.js` if the app needs the web fallback.

Use the dedicated `sqlite-to-fast-sql` skill when you need the full platform checklist.

### Database Setup

```typescript
import { KeyValueStore } from '@capgo/capacitor-fast-sql';

class Database {
  private store: Awaited<ReturnType<typeof KeyValueStore.open>> | null = null;

  async open() {
    if (this.store) return;
    this.store = await KeyValueStore.open({
      database: 'myapp',
      store: 'data',
      encrypted: false,
    });
  }

  async set(key: string, value: any) {
    await this.open();
    await this.store!.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    await this.open();
    return this.store!.get<T>(key);
  }

  async remove(key: string) {
    await this.open();
    await this.store!.remove(key);
  }

  async keys(): Promise<string[]> {
    await this.open();
    return this.store!.keys();
  }
}
```

### Offline Data Repository

```typescript
interface Entity {
  id: string;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

class OfflineRepository<T extends Entity> {
  constructor(
    private db: Database,
    private collection: string
  ) {}

  async getAll(): Promise<T[]> {
    const keys = await this.db.keys();
    const items: T[] = [];

    for (const key of keys) {
      if (key.startsWith(`${this.collection}:`)) {
        const item = await this.db.get<T>(key);
        if (item) items.push(item);
      }
    }

    return items;
  }

  async getById(id: string): Promise<T | null> {
    return this.db.get<T>(`${this.collection}:${id}`);
  }

  async save(item: T): Promise<void> {
    item.updatedAt = Date.now();
    item.syncStatus = 'pending';
    await this.db.set(`${this.collection}:${item.id}`, item);
  }

  async delete(id: string): Promise<void> {
    // Soft delete - mark for sync
    const item = await this.getById(id);
    if (item) {
      item.syncStatus = 'pending';
      (item as any).deleted = true;
      await this.db.set(`${this.collection}:${id}`, item);
    }
  }

  async getPending(): Promise<T[]> {
    const all = await this.getAll();
    return all.filter((item) => item.syncStatus === 'pending');
  }

  async markSynced(id: string): Promise<void> {
    const item = await this.getById(id);
    if (item) {
      item.syncStatus = 'synced';
      await this.db.set(`${this.collection}:${id}`, item);
    }
  }
}
```

## Sync Manager

```typescript
import { Network } from '@capacitor/network';

class SyncManager {
  private isSyncing = false;
  private syncQueue: Array<() => Promise<void>> = [];

  constructor(private repositories: OfflineRepository<any>[]) {
    this.setupNetworkListener();
  }

  private setupNetworkListener() {
    Network.addListener('networkStatusChange', async (status) => {
      if (status.connected) {
        await this.syncAll();
      }
    });
  }

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      for (const repo of this.repositories) {
        await this.syncRepository(repo);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncRepository(repo: OfflineRepository<any>) {
    const pending = await repo.getPending();

    for (const item of pending) {
      try {
        if ((item as any).deleted) {
          await this.deleteRemote(item);
        } else {
          await this.syncToRemote(item);
        }
        await repo.markSynced(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        // Keep as pending for retry
      }
    }

    // Pull remote changes
    await this.pullRemoteChanges(repo);
  }

  private async syncToRemote(item: any) {
    await fetch(`/api/${item.collection}/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  }

  private async deleteRemote(item: any) {
    await fetch(`/api/${item.collection}/${item.id}`, {
      method: 'DELETE',
    });
  }

  private async pullRemoteChanges(repo: OfflineRepository<any>) {
    const lastSync = await this.getLastSyncTime(repo);
    const response = await fetch(
      `/api/${repo.collection}?since=${lastSync}`
    );
    const remoteItems = await response.json();

    for (const remoteItem of remoteItems) {
      const localItem = await repo.getById(remoteItem.id);

      if (!localItem) {
        // New item from server
        await repo.save({ ...remoteItem, syncStatus: 'synced' });
      } else if (localItem.syncStatus === 'synced') {
        // No local changes - update from server
        await repo.save({ ...remoteItem, syncStatus: 'synced' });
      } else {
        // Conflict - local has pending changes
        await this.resolveConflict(localItem, remoteItem, repo);
      }
    }

    await this.setLastSyncTime(repo, Date.now());
  }

  private async resolveConflict(
    local: any,
    remote: any,
    repo: OfflineRepository<any>
  ) {
    // Last-write-wins strategy
    if (local.updatedAt > remote.updatedAt) {
      // Keep local, re-sync to server
      local.syncStatus = 'pending';
      await repo.save(local);
    } else {
      // Server wins
      await repo.save({ ...remote, syncStatus: 'synced' });
    }
  }
}
```

## Service Worker Caching

### Register Service Worker

```typescript
// src/main.ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### Service Worker with Workbox

```typescript
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      {
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    ],
  })
);

// Cache fonts
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'font-cache',
  })
);
```

## Optimistic UI Updates

```typescript
class TodoService {
  constructor(
    private repo: OfflineRepository<Todo>,
    private syncManager: SyncManager
  ) {}

  async addTodo(text: string): Promise<Todo> {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      updatedAt: Date.now(),
      syncStatus: 'pending',
    };

    // Save locally immediately
    await this.repo.save(todo);

    // Trigger sync in background
    this.syncManager.syncAll().catch(console.error);

    return todo;
  }

  async toggleComplete(id: string): Promise<Todo> {
    const todo = await this.repo.getById(id);
    if (!todo) throw new Error('Todo not found');

    todo.completed = !todo.completed;
    await this.repo.save(todo);

    this.syncManager.syncAll().catch(console.error);

    return todo;
  }
}
```

## Queue Failed Requests

```typescript
class RequestQueue {
  private queue: QueuedRequest[] = [];

  constructor(private storage: Database) {
    this.loadQueue();
  }

  private async loadQueue() {
    this.queue = await this.storage.get<QueuedRequest[]>('requestQueue') || [];
  }

  private async saveQueue() {
    await this.storage.set('requestQueue', this.queue);
  }

  async enqueue(request: QueuedRequest) {
    this.queue.push(request);
    await this.saveQueue();
  }

  async processQueue() {
    const status = await Network.getStatus();
    if (!status.connected) return;

    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        this.queue.shift();
        await this.saveQueue();
      } catch (error) {
        // Stop processing on failure
        break;
      }
    }
  }
}
```

## Best Practices

### 1. Show Sync Status

```tsx
function SyncIndicator() {
  const { isOnline, pendingChanges, isSyncing } = useSyncStatus();

  if (!isOnline) {
    return <Badge color="warning">Offline</Badge>;
  }

  if (isSyncing) {
    return <Badge color="info">Syncing...</Badge>;
  }

  if (pendingChanges > 0) {
    return <Badge color="warning">{pendingChanges} pending</Badge>;
  }

  return <Badge color="success">Synced</Badge>;
}
```

### 2. Handle Conflicts Gracefully

```typescript
async function handleConflict(local: Todo, remote: Todo): Promise<Todo> {
  // Option 1: Last write wins
  return local.updatedAt > remote.updatedAt ? local : remote;

  // Option 2: Merge changes
  return {
    ...remote,
    ...local,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };

  // Option 3: Ask user
  const choice = await showConflictDialog(local, remote);
  return choice === 'local' ? local : remote;
}
```

### 3. Validate Before Sync

```typescript
function validateTodo(todo: Todo): boolean {
  if (!todo.id || !todo.text) return false;
  if (todo.text.length > 500) return false;
  return true;
}

async function syncTodo(todo: Todo) {
  if (!validateTodo(todo)) {
    throw new Error('Invalid todo');
  }
  // Proceed with sync
}
```

## Resources

- Capacitor Network: https://capacitorjs.com/docs/apis/network
- Workbox: https://developer.chrome.com/docs/workbox
- IndexedDB: https://developer.mozilla.org/docs/Web/API/IndexedDB_API
- Offline First Manifesto: http://offlinefirst.org
