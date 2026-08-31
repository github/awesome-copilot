import type { PrototypePageProps } from "./pageHref";

export type AwesomeCopilotPage =
  | "agents"
  | "extensions"
  | "instructions"
  | "plugins"
  | "skills";

const destinations = [
  { label: "Agents", page: "agents" },
  { label: "Instructions", page: "instructions" },
  { label: "Learning Hub", page: "learning-hub-copilot-app" },
  { label: "Skills", page: "skills" },
  { label: "Plugins", page: "plugins" },
  { label: "Extensions", page: "extensions" },
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