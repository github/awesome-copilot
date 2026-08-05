// Per-canvas-instance state shared between the HTTP UI and the agent actions.

const instances = new Map();

const DEFAULT_OPTIONS = {
    method: "auto",
    backup: "sibling",
    dryRun: false,
    recursive: true,
};

export function getInstance(instanceId) {
    let instance = instances.get(instanceId);
    if (!instance) {
        instance = {
            id: instanceId,
            files: new Map(),
            options: { ...DEFAULT_OPTIONS },
            revision: 0,
            busy: false,
            lastRun: null,
        };
        instances.set(instanceId, instance);
    }
    return instance;
}

export function dropInstance(instanceId) {
    instances.delete(instanceId);
}

export function touch(instance) {
    instance.revision += 1;
    return instance.revision;
}

export function upsertFile(instance, entry) {
    const existing = instance.files.get(entry.path);
    instance.files.set(entry.path, { ...existing, ...entry });
    touch(instance);
    return instance.files.get(entry.path);
}

export function removeFiles(instance, paths) {
    for (const item of paths) instance.files.delete(item);
    touch(instance);
}

export function snapshot(instance) {
    return {
        instanceId: instance.id,
        revision: instance.revision,
        busy: instance.busy,
        options: instance.options,
        lastRun: instance.lastRun,
        files: [...instance.files.values()],
    };
}

export function setOptions(instance, options = {}) {
    for (const key of Object.keys(DEFAULT_OPTIONS)) {
        if (options[key] !== undefined) instance.options[key] = options[key];
    }
    touch(instance);
    return instance.options;
}
