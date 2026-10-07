import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Reemplaza `__BUILD_ID__` en dist/sw.js por un id unico por build y `__BUILD_ASSETS__` por la lista
 * de assets con hash (precache offline).
 * Asi el nombre del cache cambia en cada deploy y nadie se olvida de
 * "bumpear CACHE" (skill §7). Si el placeholder no esta, no hace nada.
 */
function swBuildId(): Plugin {
  let outDir = "dist";
  return {
    name: "sw-build-id",
    apply: "build",
    configResolved(cfg) {
      outDir = resolve(cfg.root, cfg.build.outDir);
    },
    writeBundle() {
      const file = resolve(outDir, "sw.js");
      if (!existsSync(file)) return;
      const id = Date.now().toString(36);
      // Lista de assets del build (JS/CSS con hash) para precachear: rutas relativas al SW.
      const assetsDir = resolve(outDir, "assets");
      const assets = existsSync(assetsDir)
        ? readdirSync(assetsDir, { recursive: true, withFileTypes: false })
            .map((f) => String(f).replaceAll("\\", "/"))
            .filter((f) => /\.(js|css)$/.test(f))
            .map((f) => `./assets/${f}`)
        : [];
      writeFileSync(
        file,
        readFileSync(file, "utf8").replaceAll("__BUILD_ID__", id).replaceAll("__BUILD_ASSETS__", JSON.stringify(assets)),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv mezcla .env* con process.env (solo claves VITE_*), asi que
  // VITE_BASE funciona tanto en local (.env) como en CI (env del workflow).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    // GitHub Pages sirve bajo /<repo>/. Con './' los assets son relativos y
    // funciona en cualquier subruta (skill §2). Sobrescribible con VITE_BASE.
    base: env.VITE_BASE || "./",
    plugins: [react(), swBuildId()],
    test: {
      environment: "node",
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    },
  };
});
