/** Visual accent categories used by badges and cards. */
export type Accent = 'purple' | 'blue' | 'neutral' | 'green' | 'yellow' | 'danger';

/** A single navigation link. */
export interface NavItem {
  label: string;
  href: string;
}

/** Homepage resource card (landing section). */
export interface ResourceCard {
  title: string;
  description: string;
  icon: string;
  accent: Accent;
  href: string;
  /** Section label for CTA text (e.g. "Skills" when title is "Skills (350)"). */
  label?: string;
}

/** Generic result item for catalog pages. */
export interface ResultItem {
  id: string;
  title: string;
  label: string;
  description: string;
  tags: string[];
  accent?: Accent;
  detail?: string;
  model?: string;
  tools?: string[];
  handoffs?: string[];
  applyTo?: string;
  scope?: string;
  version?: string;
  author?: string;
  license?: string;
  platforms?: string[];
  allowedTools?: string[];
  category?: string;
  resourceFiles?: ResourceFile[];
  skillSections?: SkillSection[];
  event?: string;
  trigger?: string;
  actions?: string[];
  matcher?: string;
  config?: string;
  timeout?: string;
  items?: number;
  contains?: string[];
  installCommand?: string;
  featured?: boolean;
}

/** A file bundled with a skill or resource. */
export interface ResourceFile {
  path: string;
  type: 'skill' | 'script' | 'template' | 'reference' | 'asset' | 'eval' | 'attribution';
  description: string;
}

/** A section of a skill or instruction markdown body. */
export interface SkillSection {
  title: string;
  body: string;
}

/** Tool catalog card (no file modal, copyable config). */
export interface ToolCard {
  title: string;
  badge: string;
  description: string;
  tags: string[];
  config: string;
}

/** A numbered step in a docs article or guide. */
export interface DocStep {
  title: string;
  body: string;
}
