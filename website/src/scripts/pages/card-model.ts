export type CardActionKind = "link" | "install" | "copy" | "download" | "share";
export type CardActionVariant = "primary" | "secondary" | "icon";

export interface CardAction {
  id: string;
  kind: CardActionKind;
  label: string;
  variant: CardActionVariant;
  href?: string;
  target?: "_blank" | "_self";
  payload?: Record<string, string>;
  ariaLabel?: string;
  stopPropagation?: boolean;
}

export interface CardInstallOption {
  id: string;
  label: string;
  href: string;
  target?: "_blank" | "_self";
}

export interface CardImage {
  src: string;
  alt: string;
}

export interface CardMetaTag {
  id: string;
  label: string;
  tone?: "default" | "info" | "success" | "warning";
}

export interface CardPopupData {
  heading?: string;
  body: string;
  metaTags?: CardMetaTag[];
  keywordTags?: string[];
  actions?: CardAction[];
  gallery?: CardImage[];
  sections?: Array<{ id: string; title: string; value: string }>;
}

export interface ListCardItem {
  id: string;
  title: string;
  description: string;
  image?: CardImage;
  metaTags: CardMetaTag[];
  keywordTags?: string[];
  actions: CardAction[];
  installOptions?: CardInstallOption[];
  popup: CardPopupData;
  searchText?: string;
  sort: {
    title: string;
    lastUpdatedEpoch?: number;
  };
}

export interface CardGridModel {
  pageType:
    | "extensions"
    | "agents"
    | "instructions"
    | "skills"
    | "hooks"
    | "workflows"
    | "plugins";
  emptyState: { title: string; description?: string };
  items: ListCardItem[];
}

