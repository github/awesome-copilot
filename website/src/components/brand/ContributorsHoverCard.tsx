import styles from "./styles/ContributorsHoverCard.module.css";
import { CommunityIcon } from "./CommunityIcon";

type ContributorsHoverCardProps = {
  size?: number;
  href: string;
};

export function ContributorsHoverCard({
  size = 56,
  href,
}: ContributorsHoverCardProps) {
  return (
    <div className={styles.wrapper}>
      <a
        href={href}
        className={styles.trigger}
        aria-label="Meet the contributors"
      >
        <CommunityIcon size={size} />
      </a>
    </div>
  );
}
