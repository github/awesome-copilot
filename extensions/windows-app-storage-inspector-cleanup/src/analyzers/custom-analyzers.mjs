import { analyzeDockerImages } from "./docker-images.mjs";
import { analyzeMicrosoftScout } from "./microsoft-scout.mjs";
import { analyzeNpmCache } from "./npm-cache.mjs";
import { analyzeUvCache } from "./uv-cache.mjs";
import { analyzeVsCodeInsiders } from "./vscode-insiders.mjs";

export const CUSTOM_ANALYZERS = [
    {
        id: "vscode-insiders",
        name: "VS Code Insiders",
        description: "Inspect accumulated application versions and identify inactive installations.",
        analyze: analyzeVsCodeInsiders,
    },
    {
        id: "microsoft-scout",
        name: "Microsoft Scout",
        description: "Separate installed application files from user data and regenerable caches.",
        analyze: analyzeMicrosoftScout,
    },
    {
        id: "docker-images",
        name: "Docker images",
        description: "Inspect Docker image usage and managed storage without directly deleting Docker data files.",
        analyze: analyzeDockerImages,
    },
    {
        id: "npm-cache",
        name: "npm cache",
        description: "Inspect npm-managed package cache storage and use supported npm maintenance commands.",
        analyze: analyzeNpmCache,
    },
    {
        id: "uv-cache",
        name: "uv cache",
        description: "Inspect uv-managed Python package cache storage and use supported uv cache commands.",
        analyze: analyzeUvCache,
    },
];

export function listCustomAnalyzers() {
    return CUSTOM_ANALYZERS.map(({ id, name, description }) => ({ id, name, description }));
}

export async function runCustomAnalyzer(id, result) {
    const analyzer = CUSTOM_ANALYZERS.find((item) => item.id === id);
    if (!analyzer) {
        const error = new Error(`Unknown custom analyzer: ${id}`);
        error.code = "analyzer_unknown";
        throw error;
    }
    const analysis = await analyzer.analyze(result);
    return { ...analysis, id: analyzer.id, name: analyzer.name };
}
