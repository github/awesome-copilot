/**
 * Homepage functionality
 */
import { fetchData } from "../utils";

interface Manifest {
  counts: {
    agents: number;
    instructions: number;
    skills: number;
    hooks: number;
    workflows: number;
    plugins: number;
    extensions: number;
    tools: number;
  };
}

export async function initHomepage(): Promise<void> {
  // Load manifest for stats
  const manifest = await fetchData<Manifest>("manifest.json");
  if (manifest && manifest.counts) {
    // Populate counts in cards
    const countKeys = [
      "agents",
      "instructions",
      "skills",
      "hooks",
      "workflows",
      "plugins",
      "extensions",
      "tools",
    ] as const;
    countKeys.forEach((key) => {
      const countEl = document.querySelector(
        `.card-count[data-count="${key}"]`
      );
      if (countEl && manifest.counts[key] !== undefined) {
        countEl.textContent = manifest.counts[key].toString();
      }
    });
  }
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initHomepage);
