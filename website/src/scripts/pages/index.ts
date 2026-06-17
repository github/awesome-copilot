/**
 * Homepage functionality
 */
import { fetchData, getBasePath } from "../utils";

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

interface SearchItem {
  type: string;
  id: string;
  title: string;
  description: string;
  path: string;
  lastUpdated?: string;
  searchText?: string;
}

const TYPE_TO_PAGE: Record<string, string> = {
  agent: "agents",
  instruction: "instructions",
  skill: "skills",
  hook: "hooks",
  workflow: "workflows",
  plugin: "plugins",
  tool: "tools",
  extension: "extensions",
};

const TYPE_ICON: Record<string, string> = {
  agent: "robot",
  instruction: "document",
  skill: "lightning",
  hook: "hook",
  workflow: "workflow",
  plugin: "plug",
  tool: "wrench",
  extension: "plug",
};

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

    // Populate hero stats
    populateStats(manifest.counts);
  }

  initHeroSearch();
  initRevealAnimations();
  initSpotlightCards();
}

function populateStats(counts: Manifest["counts"]): void {
  const statValues = {
    agents: counts.agents ?? 0,
    instructions: counts.instructions ?? 0,
    skills: counts.skills ?? 0,
    hooks: counts.hooks ?? 0,
    workflows: counts.workflows ?? 0,
    plugins: counts.plugins ?? 0,
    extensions: counts.extensions ?? 0,
    tools: counts.tools ?? 0,
    total:
      (counts.agents ?? 0) +
      (counts.instructions ?? 0) +
      (counts.skills ?? 0) +
      (counts.hooks ?? 0) +
      (counts.workflows ?? 0) +
      (counts.plugins ?? 0) +
      (counts.extensions ?? 0) +
      (counts.tools ?? 0),
  };

  document.querySelectorAll('.hero-stat-value[data-stat]').forEach((el) => {
    const key = el.getAttribute('data-stat') as keyof typeof statValues;
    if (!key || !(key in statValues)) return;
    const target = statValues[key];
    animateCount(el, target, { duration: 1200 });
  });
}

function animateCount(
  el: Element,
  target: number,
  options: { duration?: number; suffix?: string } = {}
): void {
  const { duration = 1200, suffix = '+' } = options;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || target === 0) {
    el.textContent = target > 0 ? `${target.toLocaleString()}${suffix}` : target.toLocaleString();
    return;
  }

  const start = performance.now();
  const format = (n: number) => `${Math.round(n).toLocaleString()}${suffix}`;

  function step(now: number): void {
    const progress = Math.min((now - start) / duration, 1);
    // easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = target * eased;
    el.textContent = format(current);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function initRevealAnimations(): void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.setProperty('--reveal-index', String(i % 6));
    observer.observe(el);
  });
}

function initSpotlightCards(): void {
  // Only enable spotlight follow when fine pointer is available.
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!hasFinePointer) return;

  document.querySelectorAll('.card--spotlight, .glass-card--spotlight').forEach((card) => {
    const htmlCard = card as HTMLElement;
    htmlCard.addEventListener('pointermove', (e) => {
      const rect = htmlCard.getBoundingClientRect();
      htmlCard.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
      htmlCard.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
    });
  });
}

function initHeroSearch(): void {
  const input = document.getElementById("hero-search-input") as HTMLInputElement | null;
  const resultsContainer = document.getElementById("hero-search-results");
  if (!input || !resultsContainer) return;

  let index: SearchItem[] = [];
  let activeIndex = -1;

  fetchData<SearchItem[]>("search-index.json").then((data) => {
    if (data) index = data;
  });

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text: string, query: string): string {
    if (!query) return escapeHtml(text);
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    return escapeHtml(text).replace(regex, "<mark>$1</mark>");
  }

  function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderResults(query: string): void {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || index.length === 0) {
      resultsContainer.classList.add("hidden");
      resultsContainer.innerHTML = "";
      activeIndex = -1;
      return;
    }

    const matches = index
      .filter((item) => {
        const haystack = `${item.title} ${item.description} ${item.searchText ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 5);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="search-result-empty">
          <div class="search-result-empty-title">No results found</div>
          <div class="search-result-empty-hint">Try a different keyword or browse the categories below.</div>
        </div>`;
      resultsContainer.classList.remove("hidden");
      activeIndex = -1;
      return;
    }

    resultsContainer.innerHTML = matches
      .map((item, i) => {
        const icon = TYPE_ICON[item.type] || "document";
        const page = TYPE_TO_PAGE[item.type] || item.type;
        const basePath = getBasePath();
        const href = `${basePath}${page}/?file=${encodeURIComponent(item.path)}`;
        return `
          <a href="${escapeHtml(href)}" class="search-result" data-index="${i}" data-path="${escapeHtml(item.path)}" data-type="${escapeHtml(item.type)}">
            <span class="search-result-type" data-icon="${icon}" aria-hidden="true"></span>
            <span class="search-result-content">
              <span class="search-result-title">${highlight(item.title, query)}</span>
              <span class="search-result-description">${highlight(item.description, query)}</span>
            </span>
          </a>`;
      })
      .join("");

    resultsContainer.classList.remove("hidden");
    activeIndex = -1;

    resultsContainer.querySelectorAll(".search-result").forEach((el) => {
      el.addEventListener("click", (e) => {
        const target = el as HTMLElement;
        const path = target.dataset.path;
        const type = target.dataset.type;
        if (!path || !type) return;
        e.preventDefault();
        window.location.hash = `#file=${encodeURIComponent(path)}`;
        resultsContainer.classList.add("hidden");
        input.value = "";
      });
    });
  }

  function updateActive(direction: number): void {
    const items = Array.from(resultsContainer.querySelectorAll(".search-result"));
    if (items.length === 0) return;
    activeIndex = (activeIndex + direction + items.length) % items.length;
    items.forEach((item, i) => {
      item.classList.toggle("active", i === activeIndex);
      if (i === activeIndex) item.scrollIntoView({ block: "nearest" });
    });
  }

  input.addEventListener("input", () => renderResults(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      resultsContainer.classList.add("hidden");
      activeIndex = -1;
      input.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      updateActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateActive(-1);
    } else if (e.key === "Enter") {
      const items = resultsContainer.querySelectorAll(".search-result");
      const selected = items[activeIndex] as HTMLElement | undefined;
      const path = selected?.dataset.path;
      if (path) {
        window.location.hash = `#file=${encodeURIComponent(path)}`;
        resultsContainer.classList.add("hidden");
        input.value = "";
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target as Node) && !resultsContainer.contains(e.target as Node)) {
      resultsContainer.classList.add("hidden");
      activeIndex = -1;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
      e.preventDefault();
      input.focus();
    }
  });
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initHomepage);
