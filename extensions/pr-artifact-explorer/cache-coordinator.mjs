function trackedOperation(callback) {
  const operation = Promise.resolve().then(callback);
  return {
    operation,
    // Waiters need ordering only; the initiating maintenance request owns failures.
    barrier: operation.then(
      () => undefined,
      () => undefined,
    ),
  };
}

export class CacheMaintenanceCoordinator {
  constructor() {
    this.artifactDeletions = new Map();
    this.cacheClear = null;
  }

  inspectionBarrier(artifactId) {
    return (
      this.cacheClear?.barrier ??
      this.artifactDeletions.get(String(artifactId))?.barrier ??
      null
    );
  }

  async deleteArtifact(artifactId, callback) {
    const id = String(artifactId);
    while (true) {
      const existing = this.artifactDeletions.get(id);
      if (existing) return existing.operation;
      if (!this.cacheClear) break;
      await this.cacheClear.barrier;
    }

    const tracked = trackedOperation(callback);
    this.artifactDeletions.set(id, tracked);
    try {
      return await tracked.operation;
    } finally {
      if (this.artifactDeletions.get(id) === tracked) {
        this.artifactDeletions.delete(id);
      }
    }
  }

  async clearCache(callback) {
    if (this.cacheClear) return this.cacheClear.operation;

    const tracked = trackedOperation(async () => {
      await Promise.all(
        [...this.artifactDeletions.values()].map((entry) => entry.barrier),
      );
      return callback();
    });
    this.cacheClear = tracked;
    try {
      return await tracked.operation;
    } finally {
      if (this.cacheClear === tracked) this.cacheClear = null;
    }
  }
}
