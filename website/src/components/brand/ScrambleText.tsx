import { clsx } from "clsx";
import React, { useEffect, useRef } from "react";

import styles from "./styles/learning-hub-copilot-app.module.css";

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#";

type ScrambleCursor = "persist" | "fade" | "none";
type ScrambleTrigger = "view" | "hover";

type ScrambleTextProps = {
  /** Final, resolved text that also serves as the accessible label. */
  text: string;
  /** Optional class applied to the wrapper. */
  className?: string;
  /** Character pool used while decoding. */
  chars?: string;
  /** Milliseconds each character stays scrambled before it locks in. */
  msPerChar?: number;
  /** When the decode plays: once on scroll into view, or on each hover. */
  trigger?: ScrambleTrigger;
  /**
   * Green square behaviour: rest just after the last letter ("persist"), fade
   * out once the word resolves ("fade"), or never render one ("none").
   */
  cursor?: ScrambleCursor;
};
/**
 * GitHub Universe style "decode" reveal: the word starts as green random
 * glyphs, then resolves one letter at a time from left to right, the letters
 * ahead scrambling in green. An optional green square cursor can step along and
 * either rest at the end or fade out. Plays once on scroll into view or on each
 * hover, and honours prefers-reduced-motion.
 */
export function ScrambleText({
  text,
  className,
  chars = DEFAULT_CHARS,
  msPerChar = 55,
  trigger = "view",
  cursor = "persist",
}: ScrambleTextProps) {
  const charsRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const charsEl = charsRef.current;
    if (!charsEl) return;
    const cursorEl = cursor === "none" ? null : cursorRef.current;

    const spans = Array.from(
      charsEl.querySelectorAll<HTMLElement>("[data-final]"),
    );
    const randomChar = () => chars[Math.floor(Math.random() * chars.length)];
    const isSpace = (span: HTMLElement) => (span.dataset.final ?? "") === " ";
    const glyphClass = styles.scrambleGlyph;

    // Lock each character box to its final width so scrambling never reflows.
    const metrics = spans.map((span) => ({
      left: span.offsetLeft,
      top: span.offsetTop,
      width: span.offsetWidth,
      height: span.offsetHeight,
    }));
    spans.forEach((span, i) => {
      span.style.width = `${metrics[i].width}px`;
    });

    // Size the cursor and rest it just past the last glyph. On phones the
    // placeholder wraps onto two lines, so the square grows to the full line
    // height and follows the active line vertically; on wider screens it stays
    // a small square centred on the single line.
    const fontSize = parseFloat(getComputedStyle(charsEl).fontSize) || 16;
    const isNarrow =
      window.matchMedia?.("(max-width: 47.99rem)").matches ?? false;
    const side = fontSize * 0.62;
    const gap = fontSize * 0.18;
    const cursorH = isNarrow ? (metrics[0]?.height ?? fontSize) : side;
    const cursorY = (i: number) => {
      const m = metrics[i] ?? metrics[metrics.length - 1];
      return m ? charsEl.offsetTop + m.top + (m.height - cursorH) / 2 : 0;
    };
    const lastMetric = metrics[metrics.length - 1];
    const restX = (lastMetric ? lastMetric.left + lastMetric.width : 0) + gap;
    const restY = cursorY(metrics.length - 1);
    if (cursorEl) {
      cursorEl.style.width = `${side}px`;
      cursorEl.style.height = `${cursorH}px`;
      cursorEl.style.top = "0px";
      cursorEl.style.transform = `translate(${restX}px, ${restY}px)`;
      // Glide the square between letters instead of snapping, synced to the step.
      cursorEl.style.transition = `transform ${msPerChar}ms linear, opacity 150ms ease`;
    }

    const finalize = () => {
      for (const span of spans) {
        span.textContent = span.dataset.final ?? "";
        span.classList.remove(glyphClass);
      }
      if (cursorEl) {
        if (cursor === "persist") {
          // Keep the green square resting after the final character.
          cursorEl.style.transform = `translate(${restX}px, ${restY}px)`;
          cursorEl.style.opacity = "1";
        } else {
          // "fade": the square disappears once the word has resolved.
          cursorEl.style.opacity = "0";
        }
      }
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finalize();
      return;
    }

    // Only real letters get a reveal step (spaces resolve for free).
    const revealOrder = spans
      .map((span, i) => (isSpace(span) ? -1 : i))
      .filter((i) => i >= 0);

    const setScrambled = () => {
      for (const span of spans) {
        if (isSpace(span)) {
          span.textContent = " ";
          continue;
        }
        span.textContent = randomChar();
        span.classList.add(glyphClass);
      }
    };

    let raf = 0;
    let startTime = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const step = Math.floor((now - startTime) / msPerChar);

      if (step >= revealOrder.length) {
        finalize();
        return;
      }

      const revealIdx = revealOrder[step];

      spans.forEach((span, i) => {
        if (isSpace(span)) {
          span.textContent = " ";
          return;
        }
        if (i < revealIdx) {
          span.textContent = span.dataset.final ?? "";
          span.classList.remove(glyphClass);
        } else {
          if (Math.random() < 0.5) span.textContent = randomChar();
          span.classList.add(glyphClass);
        }
      });

      // Park the square at the boundary between resolved and scrambling text,
      // following the active line so it stays aligned when the phrase wraps.
      if (cursorEl) {
        cursorEl.style.transform = `translate(${metrics[revealIdx].left}px, ${cursorY(revealIdx)}px)`;
      }

      raf = requestAnimationFrame(tick);
    };

    const play = () => {
      cancelAnimationFrame(raf);
      setScrambled();
      if (cursorEl) cursorEl.style.opacity = "1";
      startTime = 0;
      raf = requestAnimationFrame(tick);
    };

    if (trigger === "hover") {
      // Rest as the finished word; decode again on every hover.
      const onEnter = () => play();
      charsEl.addEventListener("mouseenter", onEnter);
      return () => {
        charsEl.removeEventListener("mouseenter", onEnter);
        cancelAnimationFrame(raf);
      };
    }

    // trigger === "view": start scrambled so the final text never flashes,
    // then decode once when it scrolls into view.
    setScrambled();
    let played = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !played) {
            played = true;
            play();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(charsEl);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, chars, msPerChar, trigger, cursor]);

  // Group characters into non-breaking word spans (with the spaces between them
  // left as breakable boxes) so that when the phrase wraps it only ever breaks
  // between words, never mid-word. The animation still drives each character
  // span individually via the [data-final] lookup above.
  const charSpan = (ch: string, i: number) => (
    <span key={`c-${i}`} className={styles.scrambleChar} data-final={ch}>
      {ch}
    </span>
  );

  const nodes: React.ReactNode[] = [];
  let word: React.ReactNode[] = [];
  let wordStart = 0;
  const flushWord = () => {
    if (word.length) {
      nodes.push(
        <span key={`w-${wordStart}`} className={styles.scrambleWord}>
          {word}
        </span>,
      );
      word = [];
    }
  };
  Array.from(text).forEach((ch, i) => {
    if (ch === " ") {
      flushWord();
      nodes.push(charSpan(ch, i));
    } else {
      if (word.length === 0) wordStart = i;
      word.push(charSpan(ch, i));
    }
  });
  flushWord();

  return (
    <span className={clsx(styles.scrambleWrap, className)}>
      <span className={styles.scrambleSrOnly}>{text}</span>
      <span ref={charsRef} aria-hidden="true" className={styles.scrambleChars}>
        {nodes}
      </span>
      {cursor !== "none" && (
        <span
          ref={cursorRef}
          aria-hidden="true"
          className={styles.scrambleCursor}
        />
      )}
    </span>
  );
}
