import { Heading, Text } from "@primer/react-brand";

import styles from "./styles/github-copilot-app.module.css";
import { pageHref } from "./pageHref";
import type { SearchItem } from "./searchIndex";
import { contributorsTotal as siteContributorsTotal } from "../../lib/site-data";
import {
  LearningArticleLayout,
  type TocSection,
} from "./LearningArticleLayout";

export type RecipeLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type CookbookRecipeCard = {
  id: string;
  title: string;
  description: string;
  badge?: string;
  author?: { name: string; href: string };
  tags: string[];
  links: RecipeLink[];
};

export type CookbookSection = {
  id: string;
  name: string;
  description: string;
  recipes: CookbookRecipeCard[];
};

/**
 * Cookbook index.
 *
 * The prototype hardcoded two sections ("GitHub Copilot SDK" and "Community
 * Samples"); here they are derived from `public/data/samples.json` so new
 * cookbooks appear without a code change. The article chassis owns its own
 * shell, hero and footer, so it replaces `PageShell` rather than nesting in it.
 */
export function CookbookIndex({
  sections,
  searchIndex = [],
  contributorsTotal = siteContributorsTotal,
}: {
  sections: CookbookSection[];
  searchIndex?: SearchItem[];
  contributorsTotal?: number;
}) {
  const tocSections: TocSection[] = sections.map((section) => ({
    id: section.id,
    label: section.name,
  }));

  return (
    <LearningArticleLayout
      pageHref={pageHref}
      currentPage="cookbook"
      breadcrumbLabel="Cookbook"
      heroTitle="Cookbook"
      heroSubtitle="Code samples, recipes, and hands-on examples for building with GitHub Copilot — ready to copy into your own projects and adapt."
      tocSections={tocSections}
      searchIndex={searchIndex}
      contributorsTotal={contributorsTotal}
    >
      {sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={styles.articleSection}
        >
          <Heading as="h2" size="5" className={styles.articleHeading}>
            {section.name}
          </Heading>
          <Text as="p" size="300" variant="muted">
            {section.description}
          </Text>
          {section.recipes.map((recipe) => (
            <div key={recipe.id} className={styles.promptGroup}>
              <span className={styles.promptLabel}>{recipe.title}</span>
              {recipe.badge ? (
                <Text as="p" size="300" variant="muted">
                  {recipe.badge}
                </Text>
              ) : null}
              <Text as="p" size="300" variant="muted">
                {recipe.description}
              </Text>
              {recipe.author ? (
                <Text as="p" size="300" variant="muted">
                  by{" "}
                  <a href={recipe.author.href} target="_blank" rel="noopener">
                    {recipe.author.name}
                  </a>
                </Text>
              ) : null}
              <ul className={styles.checkList}>
                {recipe.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <ul className={styles.checkList}>
                {recipe.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </LearningArticleLayout>
  );
}
