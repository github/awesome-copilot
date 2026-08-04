export class ExpiringPromiseCache {
  #entries = new Map();
  #maxEntries;
  #ttlMs;

  constructor({ maxEntries, ttlMs }) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new TypeError("maxEntries must be a positive integer.");
    }
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new TypeError("ttlMs must be a positive number.");
    }
    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
  }

  clear() {
    this.#entries.clear();
  }

  delete(key) {
    this.#entries.delete(String(key));
  }

  peek(key) {
    const normalizedKey = String(key);
    const entry = this.#entries.get(normalizedKey);
    if (!entry?.hasValue || entry.expiresAt <= Date.now()) {
      if (!entry?.promise) this.#entries.delete(normalizedKey);
      return undefined;
    }
    this.#touch(normalizedKey, entry);
    return entry.value;
  }

  set(key, value) {
    const normalizedKey = String(key);
    const entry = {
      expiresAt: Date.now() + this.#ttlMs,
      forceRefresh: false,
      hasValue: true,
      promise: null,
      value,
    };
    this.#entries.set(normalizedKey, entry);
    this.#touch(normalizedKey, entry);
    this.#enforceLimit();
    return value;
  }

  async get(key, loader, { force = false } = {}) {
    if (typeof loader !== "function") throw new TypeError("loader must be a function.");
    const normalizedKey = String(key);
    const now = Date.now();
    let entry = this.#entries.get(normalizedKey);
    if (!force && entry?.hasValue && entry.expiresAt > now) {
      this.#touch(normalizedKey, entry);
      return entry.value;
    }
    if (entry?.promise && (!force || entry.forceRefresh)) return entry.promise;

    this.#prune(now);
    if (force) entry = null;
    entry ??= {
      expiresAt: 0,
      forceRefresh: false,
      hasValue: false,
      promise: null,
      value: undefined,
    };
    const promise = Promise.resolve()
      .then(loader)
      .then(
        (value) => {
          if (
            this.#entries.get(normalizedKey) === entry &&
            entry.promise === promise
          ) {
            entry.expiresAt = Date.now() + this.#ttlMs;
            entry.forceRefresh = false;
            entry.hasValue = true;
            entry.promise = null;
            entry.value = value;
            this.#touch(normalizedKey, entry);
            this.#enforceLimit();
          }
          return value;
        },
        (error) => {
          if (
            this.#entries.get(normalizedKey) === entry &&
            entry.promise === promise
          ) {
            entry.forceRefresh = false;
            entry.promise = null;
            if (!entry.hasValue || entry.expiresAt <= Date.now()) {
              this.#entries.delete(normalizedKey);
            }
          }
          throw error;
        },
      );
    entry.forceRefresh = force;
    entry.promise = promise;
    this.#entries.set(normalizedKey, entry);
    this.#enforceLimit();
    return promise;
  }

  #touch(key, entry) {
    this.#entries.delete(key);
    this.#entries.set(key, entry);
  }

  #prune(now) {
    for (const [key, entry] of this.#entries) {
      if (!entry.promise && (!entry.hasValue || entry.expiresAt <= now)) {
        this.#entries.delete(key);
      }
    }
  }

  #enforceLimit() {
    while (this.#entries.size > this.#maxEntries) {
      const candidate = [...this.#entries].find(([, entry]) => !entry.promise);
      if (!candidate) return;
      this.#entries.delete(candidate[0]);
    }
  }
}
