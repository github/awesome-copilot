import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const FILE_ATTRIBUTE_OFFLINE = 0x00001000;
const FILE_ATTRIBUTE_RECALL_ON_OPEN = 0x00040000;
const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS = 0x00400000;

const ATTRIBUTE_SCRIPT = `
$ErrorActionPreference = 'Stop'
while ($line = [Console]::In.ReadLine()) {
    try {
        $request = $line | ConvertFrom-Json
        $attributes = [int][System.IO.File]::GetAttributes([string]$request.path)
        [Console]::Out.WriteLine((ConvertTo-Json -Compress -InputObject @{
            id = [string]$request.id
            attributes = $attributes
        }))
    }
    catch {
        [Console]::Out.WriteLine((ConvertTo-Json -Compress -InputObject @{
            id = [string]$request.id
            error = $_.Exception.Message
        }))
    }
    [Console]::Out.Flush()
}
`;

function normalizePath(filePath) {
    return filePath.replaceAll("/", "\\").toLowerCase();
}

function isCloudOnly(attributes) {
    return (
        (attributes & FILE_ATTRIBUTE_OFFLINE) !== 0 ||
        (attributes & FILE_ATTRIBUTE_RECALL_ON_OPEN) !== 0 ||
        (attributes & FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS) !== 0
    );
}

export class CloudFileAttributeReader {
    #roots;
    #process;
    #reader;
    #pending = new Map();
    #sequence = 0;
    #error;

    constructor() {
        this.#roots = [
            process.env.OneDrive,
            process.env.OneDriveCommercial,
            process.env.OneDriveConsumer,
        ]
            .filter(Boolean)
            .map(normalizePath);
    }

    isPotentialCloudPath(filePath) {
        const normalized = normalizePath(filePath);
        return (
            this.#roots.some(
                (root) => normalized === root || normalized.startsWith(`${root}\\`),
            ) ||
            normalized.includes("\\onedrive - ") ||
            normalized.includes("\\onedrive\\")
        );
    }

    async read(filePath) {
        if (process.platform !== "win32" || !this.isPotentialCloudPath(filePath)) {
            return { cloudOnly: false };
        }

        if (this.#error) {
            throw this.#error;
        }
        this.#ensureProcess();

        const id = `${Date.now()}-${this.#sequence++}`;
        const result = new Promise((resolve, reject) => {
            this.#pending.set(id, { resolve, reject });
        });
        this.#process.stdin.write(`${JSON.stringify({ id, path: filePath })}\n`);
        return result;
    }

    async close() {
        this.#reader?.close();
        this.#process?.stdin.end();
        if (this.#process && this.#process.exitCode === null) {
            await new Promise((resolve) => this.#process.once("close", resolve));
        }
    }

    #ensureProcess() {
        if (this.#process) {
            return;
        }

        const encodedScript = Buffer.from(ATTRIBUTE_SCRIPT, "utf16le").toString("base64");
        this.#process = spawn(
            "powershell.exe",
            ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript],
            { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
        );
        this.#reader = createInterface({ input: this.#process.stdout });
        this.#reader.on("line", (line) => {
            let response;
            try {
                response = JSON.parse(line);
            } catch {
                this.#fail(new Error("OneDrive attribute reader returned invalid data"));
                return;
            }

            const request = this.#pending.get(response.id);
            if (!request) {
                return;
            }
            this.#pending.delete(response.id);
            if (response.error) {
                request.reject(new Error(response.error));
            } else {
                request.resolve({ cloudOnly: isCloudOnly(response.attributes) });
            }
        });
        this.#process.on("error", (error) => this.#fail(error));
        this.#process.on("close", (code) => {
            if (code !== 0 && !this.#error) {
                this.#fail(new Error(`OneDrive attribute reader exited with code ${code}`));
            }
        });
    }

    #fail(error) {
        this.#error = error;
        for (const request of this.#pending.values()) {
            request.reject(error);
        }
        this.#pending.clear();
    }
}
