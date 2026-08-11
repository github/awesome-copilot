import { execFile } from "node:child_process";

const COMMAND_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 1_048_576;

const COMMANDS = {
    "docker-images": [
        {
            id: "docker-image-prune",
            label: "Remove dangling images",
            command: "docker image prune --force",
            shell: "PowerShell",
            description: "Removes untagged image layers that are not referenced by a container.",
            requiresElevation: false,
            requiresConfirmation: true,
            executable: "docker.exe",
            arguments: ["image", "prune", "--force"],
        },
        {
            id: "docker-image-prune-all",
            label: "Remove unused images",
            command: "docker image prune --all --force",
            shell: "PowerShell",
            description: "Removes images not referenced by any container. Review the image list first.",
            requiresElevation: false,
            requiresConfirmation: true,
            executable: "docker.exe",
            arguments: ["image", "prune", "--all", "--force"],
        },
        {
            id: "docker-system-df",
            label: "Review all reclaimable Docker data",
            command: "docker system df",
            shell: "PowerShell",
            description: "Reports reclaimable images, containers, local volumes, and build cache without deleting anything.",
            requiresElevation: false,
            requiresConfirmation: false,
            executable: "docker.exe",
            arguments: ["system", "df"],
        },
    ],
    "npm-cache": [
        {
            id: "npm-cache-verify",
            label: "Verify npm cache",
            command: "npm cache verify",
            shell: "Command Prompt",
            description: "Checks npm cache integrity offline and removes invalid cache content when npm identifies it.",
            requiresElevation: false,
            requiresConfirmation: false,
            executable: "cmd.exe",
            arguments: ["/d", "/s", "/c", "npm.cmd cache verify"],
        },
        {
            id: "npm-cache-clean",
            label: "Clear npm cache",
            command: "npm cache clean --force",
            shell: "Command Prompt",
            description: "Removes cached package data to reclaim disk space. Future package installs download required data again.",
            requiresElevation: false,
            requiresConfirmation: true,
            executable: "cmd.exe",
            arguments: ["/d", "/s", "/c", "npm.cmd cache clean --force"],
        },
    ],
    "uv-cache": [
        {
            id: "uv-cache-dir",
            label: "Show uv cache location",
            command: "uv cache dir",
            shell: "PowerShell",
            description: "Reports the cache directory currently configured for uv without modifying it.",
            requiresElevation: false,
            requiresConfirmation: false,
            executable: "uv.exe",
            arguments: ["cache", "dir"],
        },
        {
            id: "uv-cache-prune",
            label: "Prune unused uv cache entries",
            command: "uv cache prune",
            shell: "PowerShell",
            description: "Removes unused cache entries and centralized project environments that uv can recreate when needed.",
            requiresElevation: false,
            requiresConfirmation: true,
            executable: "uv.exe",
            arguments: ["cache", "prune"],
        },
        {
            id: "uv-cache-clean",
            label: "Clear all uv cache entries",
            command: "uv cache clean",
            shell: "PowerShell",
            description: "Clears all uv cache entries. Future dependency operations rebuild required cache data.",
            requiresElevation: false,
            requiresConfirmation: true,
            executable: "uv.exe",
            arguments: ["cache", "clean"],
        },
    ],
};

function getCommand(analyzerId, commandId) {
    const command = COMMANDS[analyzerId]?.find((item) => item.id === commandId);
    if (!command) {
        const error = new Error(`Unknown analyzer command: ${commandId}`);
        error.code = "analyzer_command_unknown";
        throw error;
    }
    return command;
}

export function getAnalyzerCommands(analyzerId) {
    return (COMMANDS[analyzerId] ?? []).map((command) => {
        const {
            executable,
            arguments: args,
            ...displayCommand
        } = command;
        return displayCommand;
    });
}

function getOutput(error) {
    return String(error?.stdout || error?.stderr || error?.message || "The command failed.");
}

function createProcessError(error, stdout, stderr) {
    const commandError = new Error(`Command failed: ${getOutput({
        stdout,
        stderr,
        message: error?.message,
    })}`);
    commandError.code = error?.code === "ETIMEDOUT"
        ? "analyzer_command_timeout"
        : "analyzer_command_failed";
    return commandError;
}

function runProcess(command) {
    let childProcess;
    const promise = new Promise((resolve, reject) => {
        try {
            childProcess = execFile(command.executable, command.arguments, {
                windowsHide: true,
                timeout: COMMAND_TIMEOUT_MS,
                maxBuffer: MAX_OUTPUT_BYTES,
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(createProcessError(error, stdout, stderr));
                    return;
                }
                resolve({ stdout, stderr });
            });
        } catch (error) {
            reject(createProcessError(error));
        }
    });
    return {
        promise,
        cancel() {
            if (!childProcess || childProcess.killed) {
                return Promise.resolve();
            }
            if (process.platform === "win32" && Number.isInteger(childProcess.pid)) {
                return new Promise((resolve, reject) => {
                    execFile(
                        "taskkill.exe",
                        ["/pid", String(childProcess.pid), "/t", "/f"],
                        { windowsHide: true, timeout: 10_000 },
                        (error, stdout, stderr) => {
                            if (error) {
                                reject(commandError(
                                    "analyzer_command_cancellation_failed",
                                    String(stderr || stdout || error.message).trim(),
                                ));
                                return;
                            }
                            resolve();
                        },
                    );
                });
            }
            childProcess.kill();
            return Promise.resolve();
        },
    };
}

function normalizeExecution(execution) {
    return execution && typeof execution.promise?.then === "function"
        ? execution
        : { promise: execution };
}

function commandError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

export function createAnalyzerCommandRunner({ executeProcess = runProcess } = {}) {
    let activeCommand;
    let activeExecution;

    return {
        getActiveCommand() {
            return activeCommand;
        },

        cancel() {
            if (!activeCommand) {
                return { status: "idle" };
            }
            if (!activeExecution || typeof activeExecution.cancel !== "function") {
                throw commandError(
                    "analyzer_command_cancellation_unavailable",
                    "The active analyzer command cannot be cancelled",
                );
            }
            activeExecution.cancelRequested = true;
            activeExecution.cancelPromise = Promise.resolve(activeExecution.cancel()).catch((error) => {
                activeExecution.cancelError = error;
            });
            return {
                status: "cancelling",
                commandId: activeCommand.commandId,
            };
        },

        async execute(analyzerId, commandId, confirmed = false) {
            const command = getCommand(analyzerId, commandId);
            if (command.requiresConfirmation && confirmed !== true) {
                throw commandError(
                    "analyzer_command_confirmation_required",
                    "Explicit confirmation is required before running this cleanup command",
                );
            }
            if (activeCommand) {
                throw commandError(
                    "analyzer_command_running",
                    `Wait for the active analyzer command to finish: ${activeCommand.command}`,
                );
            }

            const startedAt = new Date();
            activeCommand = Object.freeze({
                analyzerId,
                commandId: command.id,
                command: command.command,
                startedAt: startedAt.toISOString(),
            });
            try {
                activeExecution = normalizeExecution(executeProcess(command));
                const result = await activeExecution.promise;
                if (activeExecution.cancelRequested) {
                    await activeExecution.cancelPromise;
                    if (activeExecution.cancelError) {
                        throw activeExecution.cancelError;
                    }
                    throw commandError("analyzer_command_cancelled", "Analyzer command was cancelled");
                }
                return {
                    commandId: command.id,
                    command: command.command,
                    status: "completed",
                    startedAt: activeCommand.startedAt,
                    completedAt: new Date().toISOString(),
                    output: String(result.stdout || result.stderr || ""),
                };
            } catch (error) {
                if (activeExecution?.cancelRequested) {
                    await activeExecution.cancelPromise;
                    if (activeExecution.cancelError) {
                        throw activeExecution.cancelError;
                    }
                    throw commandError("analyzer_command_cancelled", "Analyzer command was cancelled");
                }
                throw error;
            } finally {
                activeCommand = undefined;
                activeExecution = undefined;
            }
        },
    };
}

const analyzerCommandRunner = createAnalyzerCommandRunner();

export async function executeAnalyzerCommand(analyzerId, commandId, confirmed = false) {
    return analyzerCommandRunner.execute(analyzerId, commandId, confirmed);
}

export function cancelAnalyzerCommand() {
    return analyzerCommandRunner.cancel();
}
