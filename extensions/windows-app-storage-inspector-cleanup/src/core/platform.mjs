export const WINDOWS_ONLY_MESSAGE = "Windows App Storage Inspector & Cleanup is only available on Windows.";

export function isWindowsPlatform(platform = process.platform) {
    return platform === "win32";
}

export function createWindowsOnlyError() {
    const error = new Error(WINDOWS_ONLY_MESSAGE);
    error.code = "windows_only";
    error.statusCode = 501;
    return error;
}

export function assertWindowsPlatform(platform = process.platform) {
    if (!isWindowsPlatform(platform)) {
        throw createWindowsOnlyError();
    }
}
