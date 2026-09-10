import { MarkGithubIcon } from "@primer/octicons-react";
import { Link } from "@primer/react-brand";

import styles from "./styles/dotnet-upgrade.module.css";

export type ResourceMetaProps = {
  /** Kicker above the panel, e.g. "Agent details". */
  kicker: string;
  /** Chip groups: models, tools, applies-to globs, … */
  groups?: { label: string; items: string[] }[];
  /** Preformatted date string (see `formatLastUpdated`). */
  lastUpdated?: string | null;
  /** GitHub blob URL for the resource's source file. */
  sourceUrl?: string;
  /** Contributed-by attribution, when the resource carries one. */
  author?: string | null;
};

/**
 * Sidebar panel listing a resource's metadata chips alongside the
 * author / last-updated / view-source affordances shared by every detail route.
 */
export function ResourceMeta({
  kicker,
  groups = [],
  lastUpdated,
  sourceUrl,
  author,
}: ResourceMetaProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  if (
    visibleGroups.length === 0 &&
    !lastUpdated &&
    !sourceUrl &&
    !author
  ) {
    return null;
  }

  return (
    <div className={styles.sidebarSection}>
      <div className={styles.sidebarSummary}>
        <span className={styles.sidebarKicker}>{kicker}</span>
      </div>
      <div className={styles.sidebarSectionBody}>
        {visibleGroups.map((group) => (
          <div key={group.label} className={styles.metaGroup}>
            <span className={styles.metaLabel}>{group.label}</span>
            <div className={styles.metaValues}>
              {group.items.map((item) => (
                <span key={item} className={styles.metaChip}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
        {author ? (
          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>Author</span>
            <div className={styles.metaValues}>
              <span className={styles.metaChip}>{author}</span>
            </div>
          </div>
        ) : null}
        {lastUpdated ? (
          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>Last updated</span>
            <div className={styles.metaValues}>
              <span className={styles.metaChip}>{lastUpdated}</span>
            </div>
          </div>
        ) : null}
        {sourceUrl ? (
          <div className={`${styles.metaGroup} ${styles.sourceMetaGroup}`}>
            <span className={styles.metaLabel}>Source</span>
            <div className={styles.metaValues}>
              <Link href={sourceUrl} size="small" className={styles.sourceLink}>
                <MarkGithubIcon size={16} />
                <span>View on GitHub</span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
