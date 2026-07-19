import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import pagefindResources from "./src/integrations/pagefind-resources";

// Learning Hub course content mirrored from external workshop repos is authored
// in GitHub admonition syntax (`> [!NOTE]`). This remark plugin rewrites those
// callouts into Starlight aside directives before Starlight renders them, so the
// same syntax used in the source repos and on github.com also produces styled
// callouts here. The mapping targets Starlight's aside types (note / tip / caution).
const githubAdmonitionMapping = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "note",
  WARNING: "caution",
  CAUTION: "caution",
};

const site = "https://awesome-copilot.github.com/";
const siteDescription =
  "Community-contributed agents, instructions, and skills to enhance your GitHub Copilot experience";
// Social preview image used for all Open Graph / Twitter cards (e.g. LinkedIn, which is
// Open Graph-driven). socialImageWidth/Height MUST match the actual pixels of social-image.png.
// If a page ever overrides og:image, also override og:image:width/height and twitter:image
// (Head.astro derives og:image:secure_url from twitter:image first).
const socialImageUrl = new URL("/images/social-image.png", site).toString();
const socialImageWidth = "2400";
const socialImageHeight = "1260";

// https://astro.build/config
export default defineConfig({
  site,
  base: "/",
  output: "static",
  markdown: {
    remarkPlugins: [
      [remarkGithubAdmonitionsToDirectives, { mapping: githubAdmonitionMapping }],
    ],
  },
  integrations: [
    starlight({
      title: "Awesome GitHub Copilot",
      favicon: "/images/favicon.svg",
      description: siteDescription,
      social: [],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: socialImageUrl,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: socialImageWidth,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: socialImageHeight,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: siteDescription,
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: socialImageUrl,
          },
        },
      ],
      customCss: [
        "./src/styles/starlight-overrides.css",
        "./src/styles/global.css",
      ],
      // English is served at the site root (no locale prefix), preserving all
      // existing URLs. Additional locales are served under a locale prefix
      // (e.g. /es-es/…) and fall back to the English page when a translation
      // does not yet exist. These keys match the locale directory names used by
      // mirrored Learning Hub course content (website/src/content/docs/<locale>/…).
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        "es-es": { label: "Español", lang: "es-ES" },
        "ja-jp": { label: "日本語", lang: "ja-JP" },
        "ko-kr": { label: "한국어", lang: "ko-KR" },
        "pt-br": { label: "Português (Brasil)", lang: "pt-BR" },
        "zh-cn": { label: "简体中文", lang: "zh-CN" },
      },
      editLink: {
        baseUrl:
          "https://github.com/github/awesome-copilot/edit/staged/website/",
      },
      sidebar: [
        {
          label: "Fundamentals",
          items: [
            "learning-hub/github-copilot-app",
            "learning-hub/working-with-canvas-extensions",
            "learning-hub/using-automations-in-copilot-app",
            "learning-hub/what-are-agents-skills-instructions",
            "learning-hub/agents-and-subagents",
            "learning-hub/understanding-copilot-context",
            "learning-hub/copilot-configuration-basics",
            "learning-hub/defining-custom-instructions",
            "learning-hub/creating-effective-skills",
            "learning-hub/building-custom-agents",
            "learning-hub/understanding-mcp-servers",
            "learning-hub/automating-with-hooks",
            "learning-hub/agentic-workflows",
            "learning-hub/using-copilot-coding-agent",
            "learning-hub/installing-and-using-plugins",
            "learning-hub/before-after-customization-examples",
          ],
        },
        {
          label: "Reference",
          items: ["learning-hub/github-copilot-terminology-glossary"],
        },
        {
          label: "Copilot CLI for Beginners",
          items: [
            {
              label: "Overview",
              link: "/learning-hub/cli-for-beginners/",
            },
            "learning-hub/cli-for-beginners/00-quick-start",
            "learning-hub/cli-for-beginners/01-setup-and-first-steps",
            "learning-hub/cli-for-beginners/02-context-and-conversations",
            "learning-hub/cli-for-beginners/03-development-workflows",
            "learning-hub/cli-for-beginners/04-agents-and-custom-instructions",
            "learning-hub/cli-for-beginners/05-skills",
            "learning-hub/cli-for-beginners/06-mcp-servers",
            "learning-hub/cli-for-beginners/07-putting-it-all-together",
          ],
        },
        {
          label: "Hands-on",
          items: [
            {
              label: "Cookbook",
              link: "/learning-hub/cookbook/",
            },
          ],
        },
        {
          label: "Browse Resources",
          items: [
            { label: "Home", link: "/" },
            { label: "Agents", link: "/agents/" },
            { label: "Instructions", link: "/instructions/" },
            { label: "Skills", link: "/skills/" },
            { label: "Canvas Extensions", link: "/extensions/" },
            { label: "Plugins", link: "/plugins/" },
            { label: "Contributors", link: "/contributors/" },
          ],
        },
      ],
      disable404Route: true,
      // pagefind: true is required so Starlight renders the search UI.
      // Our pagefindResources() integration overwrites the index after build.
      pagefind: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      components: {
        Head: "./src/components/Head.astro",
        Footer: "./src/components/Footer.astro",
        Search: "./src/components/Search.astro",
        LanguageSelect: "./src/components/LanguageSelect.astro",
      },
    }),
    sitemap(),
    pagefindResources(),
  ],
  redirects: {
    "/samples/": "/learning-hub/cookbook/",
  },
  build: {
    assets: "assets",
  },
  trailingSlash: "always",
  vite: {
    build: {
      // Production sourcemaps trigger a known warning in the expressive-code Vite plugin.
      // The docs site does not need emitted JS sourcemaps for its validation build.
      sourcemap: false,
      // Starlight ships large syntax-highlighting chunks that are expected for this site.
      // Raise the threshold so Vite only warns on materially larger regressions.
      chunkSizeWarningLimit: 900,
    },
    css: {
      devSourcemap: true,
    },
  },
});
