import type { APIRoute } from "astro";
import agentsData from "../../public/data/agents.json";
import instructionsData from "../../public/data/instructions.json";
import skillsData from "../../public/data/skills.json";

// Base URL for absolute links (to raw GitHub content)
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/github/awesome-copilot/main";

export const GET: APIRoute = () => {
  const agents = agentsData.items;
  const instructions = instructionsData.items;
  const skills = skillsData.items;
  
  const url = (path: string) => `${GITHUB_RAW_BASE}/${path}`;

  let content = "";

  // H1 header (required)
  content += "# Awesome GitHub Copilot\n\n";

  // Summary blockquote (optional but recommended)
  content +=
    "> A community-driven collection of custom agents, instructions, and skills to enhance GitHub Copilot experiences across various domains, languages, and use cases.\n\n";

  // Add overview section
  content += "## Overview\n\n";
  content +=
    "This repository provides resources to customize and enhance GitHub Copilot:\n\n";
  content +=
    "- **Agents**: Specialized GitHub Copilot agents that integrate with MCP servers\n";
  content +=
    "- **Instructions**: Coding standards and best practices applied to specific file patterns\n";
  content +=
    "- **Skills**: Self-contained folders with instructions and bundled resources for specialized tasks\n\n";

  // Process Agents
  content += "## Agents\n\n";
  for (const agent of agents) {
    const description = (agent.description || "No description available")
      .replace(/\s+/g, " ")
      .trim();
    content += `- [${agent.title}](${url(agent.path)}): ${description}\n`;
  }
  content += "\n";

  // Process Instructions
  content += "## Instructions\n\n";
  for (const instruction of instructions) {
    const description = (instruction.description || "No description available")
      .replace(/\s+/g, " ")
      .trim();
    content += `- [${instruction.title}](${url(instruction.path)}): ${description}\n`;
  }
  content += "\n";

  // Process Skills
  content += "## Skills\n\n";
  for (const skill of skills) {
    const description = (skill.description || "No description available")
      .replace(/\s+/g, " ")
      .trim();
    content += `- [${skill.title}](${url(skill.skillFile)}): ${description}\n`;
  }
  content += "\n";

  // Add documentation links
  content += "## Documentation\n\n";
  content +=
    `- [README.md](${url("README.md")}): Main documentation and getting started guide\n`;
  content +=
    `- [CONTRIBUTING.md](${url("CONTRIBUTING.md")}): Guidelines for contributing to this repository\n`;
  content +=
    `- [CODE_OF_CONDUCT.md](${url("CODE_OF_CONDUCT.md")}): Community standards and expectations\n`;
  content += `- [SECURITY.md](${url("SECURITY.md")}): Security policies and reporting\n`;
  content +=
    `- [AGENTS.md](${url("AGENTS.md")}): Project overview and setup commands\n\n`;

  // Add repository information
  content += "## Repository\n\n";
  content += "- **GitHub**: https://github.com/github/awesome-copilot\n";
  content += "- **License**: MIT\n";
  content += "- **Website**: https://github.github.io/awesome-copilot\n";

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
