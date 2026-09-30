import {
  GitBranchIcon,
  ToolsIcon,
  WorkflowIcon,
} from "@primer/octicons-react";
import { AgentsIcon } from "./AgentsIcon";
import { ExtensionsIcon } from "./ExtensionsIcon";
import { InstructionsIcon } from "./InstructionsIcon";
import { LearningHubIcon } from "./LearningHubIcon";
import { PluginsIcon } from "./PluginsIcon";
import { SkillsIcon } from "./SkillsIcon";
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
  { label: "Agents", page: "agents", icon: AgentsIcon },
  { label: "Instructions", page: "instructions", icon: InstructionsIcon },
  { label: "Learning Hub", page: "learning-hub-copilot-app", icon: LearningHubIcon },
  { label: "Skills", page: "skills", icon: SkillsIcon },
  { label: "Plugins", page: "plugins", icon: PluginsIcon },
  { label: "Extensions", page: "extensions", icon: ExtensionsIcon },
  { label: "Hooks", page: "hooks", icon: GitBranchIcon, external: true },
  { label: "Workflows", page: "workflows", icon: WorkflowIcon, external: true },
  { label: "Tools", page: "tools", icon: ToolsIcon, external: true },
] as const;

export function getAwesomeCopilotNavLinks(
  pageHref: PrototypePageProps["pageHref"],
  currentPage?: AwesomeCopilotPage,
) {
  return destinations.map((destination) => ({
    label: destination.label,
    href: pageHref(destination.page),
    current: destination.page === currentPage,
    icon: destination.icon,
    external: "external" in destination && destination.external,
  }));
}