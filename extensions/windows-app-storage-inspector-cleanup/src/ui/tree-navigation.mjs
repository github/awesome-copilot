export function normalizePath(value) {
    return String(value ?? "")
        .replaceAll("/", "\\")
        .replace(/\\+$/, "")
        .toLowerCase();
}

export function containsPath(parentPath, targetPath) {
    const parent = normalizePath(parentPath);
    const target = normalizePath(targetPath);
    return parent === "" || target === parent || target.startsWith(`${parent}\\`);
}

export function getParentPath(value) {
    const path = String(value ?? "").replaceAll("/", "\\").replace(/\\+$/, "");
    const separatorIndex = path.lastIndexOf("\\");
    if (separatorIndex < 0) {
        return path;
    }
    return separatorIndex === 2 ? path.slice(0, separatorIndex + 1) : path.slice(0, separatorIndex);
}

export function findTreeStackForPath(tree, targetPath) {
    if (!tree || !normalizePath(targetPath)) {
        return [];
    }

    const stack = [tree];
    let node = tree;
    while (true) {
        const child = node.children?.find((item) => !item.aggregate && containsPath(item.path, targetPath));
        if (!child) {
            return stack;
        }
        stack.push(child);
        node = child;
    }
}
