import React, { useEffect, useRef, useState } from "react";
import styles from "./styles/TypingText.module.css";

type TypingTextProps = {
  /** The full string to type out. */
  text: string;
  /** Class applied to the animated (aria-hidden) span. */
  className?: string;
  /** Per-character delay in milliseconds. */
  speedMs?: number;
  /** Render a blinking block caret that trails the text while it types and
   *  disappears once the line is complete. */
  caret?: boolean;
  /** Class applied to the trailing caret span (only used when `caret`). */
  caretClassName?: string;
};

/**
 * Terminal-style typewriter that reveals `text` one character at a time,
 * starting when the element scrolls into view. An optional blinking block
 * caret can trail the text while it types (see `caret`); otherwise the cursor
 * is expected to be a sibling element. The full string is always exposed to
 * assistive tech through a visually hidden copy, and reduced-motion users see
 * it immediately.
 */
export function TypingText({
  text,
  className,
  speedMs = 55,
  caret = false,
  caretClassName,
}: TypingTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const done = count >= text.length;

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setCount(text.length);
      setStarted(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => {
    if (!started || done) return;
    const id = window.setTimeout(() => setCount((c) => c + 1), speedMs);
    return () => window.clearTimeout(id);
  }, [started, count, done, speedMs]);

  return (
    <span ref={ref}>
      <span className={styles.visuallyHidden}>{text}</span>
      <span aria-hidden="true" className={className}>
        {text.slice(0, count)}
      </span>
      {caret && started && !done ? (
        <span aria-hidden="true" className={caretClassName} />
      ) : null}
    </span>
  );
}
