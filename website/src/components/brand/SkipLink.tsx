import styles from "./styles/SkipLink.module.css";

/**
 * Keyboard-only "Skip to main content" link. Rendered as the first focusable
 * element on every page so keyboard and screen-reader users can bypass the
 * header navigation and jump straight to the page's <main> region. It stays
 * visually hidden until it receives focus, then slides into the top-left.
 */
export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
}: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a className={styles.skipLink} href={`#${targetId}`}>
      {label}
    </a>
  );
}
