import type { PrototypePageProps } from "./pageHref";

export type AwesomeCopilotPage =
  | "agents"
  | "extensions"
  | "instructions"
  | "learning-hub-copilot-app"
  | "plugins"
  | "skills"
  | "hooks"
  | "workflows"
  | "tools";

const destinations = [
  { label: "Agents", page: "agents" },
  { label: "Instructions", page: "instructions" },
  { label: "Playbook", page: "learning-hub-copilot-app" },
  { label: "Skills", page: "skills" },
  { label: "Plugins", page: "plugins" },
  { label: "Extensions", page: "extensions" },
  { label: "Hooks", page: "hooks" },
  { label: "Workflows", page: "workflows" },
  { label: "Tools", page: "tools" },
] as const;

export function getAwesomeCopilotNavLinks(
  pageHref: PrototypePageProps["pageHref"],
  currentPage?: AwesomeCopilotPage,
) {
  return destinations.map((destination) => ({
    label: destination.label,
    href: pageHref(destination.page),
    current: destination.page === currentPage,
  }));
}