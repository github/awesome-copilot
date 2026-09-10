import { HeartFillIcon } from "@primer/octicons-react";

import styles from "./styles/ContributorsNavButton.module.css";

type ContributorsNavButtonProps = {
  href: string;
  current?: boolean;
  /** Live contributor count, injected from build-time data. */
  total?: number;
};

export function ContributorsNavButton({
  href,
  current = false,
  total = 0,
}: ContributorsNavButtonProps) {
  return (
    <a
      className={styles.trigger}
      href={href}
      aria-current={current ? "page" : undefined}
      aria-label={`Meet all ${total.toLocaleString()} contributors`}
    >
      <span className={styles.heart} aria-hidden="true">
        <HeartFillIcon size={14} />
      </span>
      <span className={styles.countLabel}>{total.toLocaleString()}</span>
    </a>
  );
}
