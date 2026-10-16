const README_NAMES = ["README.md", "readme.md", "Readme.md"];
const MAX_README_BYTES = 512 * 1024;

/**
 * Fetch documentation only from GitHub's raw-content host. Follow the listing's
 * revision rather than silently showing documentation for a different release.
 */
export async function fetchExternalPluginReadme(
  source,
  { fetchImpl = fetch, warn = console.warn } = {},
) {
  if (source?.source !== "github") return null;
  const { repo, path: pluginPath = "", sha, ref } = source;
  const revision = sha || ref || "HEAD";
  const folder = pluginPath === "/" ? "" : pluginPath;
  try {
    if (
      typeof repo !== "string" ||
      !/^[A-Za-z0-9_-][A-Za-z0-9._-]*\/[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(repo) ||
      typeof revision !== "string" ||
      !revision.trim() ||
      revision.split("/").some((part) => part === "." || part === "..") ||
      /[\x00-\x1f\x7f]/.test(revision) ||
      typeof folder !== "string" ||
      folder.includes("//") ||
      folder.endsWith("/") ||
      folder.split("/").some((part) => part === "." || part === "..") ||
      /[\\?#]/.test(folder) ||
      folder.startsWith("/")
    ) {
      throw new Error("Invalid GitHub source for external plugin README");
    }

    const locator = encodeURIComponent(revision);
    const roots = folder ? [folder, ""] : [""];
    for (const root of roots) {
      for (const name of README_NAMES) {
        const file = [...(root ? root.split("/") : []), name]
          .map(encodeURIComponent).join("/");
        const rawUrl = `https://raw.githubusercontent.com/${repo}/${locator}/${file}`;
        const response = await fetchImpl(rawUrl, {
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        });
        if (response.status === 404) {
          await response.body?.cancel();
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`HTTP ${response.status} for ${rawUrl}`);
        }
        if (Number(response.headers.get("content-length")) > MAX_README_BYTES) {
          await response.body?.cancel();
          throw new Error(`README exceeds ${MAX_README_BYTES} bytes: ${rawUrl}`);
        }
        const chunks = [];
        let bytes = 0;
        if (response.body) {
          for await (const chunk of response.body) {
            bytes += chunk.byteLength;
            if (bytes > MAX_README_BYTES) {
              throw new Error(`README exceeds ${MAX_README_BYTES} bytes: ${rawUrl}`);
            }
            chunks.push(chunk);
          }
        }
        const markdown = Buffer.concat(chunks).toString("utf8");
        if (!markdown.trim()) throw new Error(`Empty README: ${rawUrl}`);
        return {
          markdown,
          sourceUrl: `https://github.com/${repo}/blob/${locator}/${file}`,
          rawUrl,
        };
      }
    }
    warn(`[external-plugin-readme] No Markdown README found for ${repo} at ${revision}${folder ? ` (${folder})` : ""}`);
  } catch (error) {
    warn(`[external-plugin-readme] Could not load ${repo} at ${revision}: ${error.message}`);
  }
  return null;
}

export async function loadExternalPluginReadmes(plugins) {
  const external = plugins.filter((plugin) => plugin.external);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, external.length) }, async () => {
    while (next < external.length) {
      const plugin = external[next++];
      plugin.readme = await fetchExternalPluginReadme(plugin.source);
    }
  }));
}
