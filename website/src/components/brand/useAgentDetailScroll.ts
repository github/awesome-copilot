import React from "react";

import { getScrollBehavior } from "./scrollBehavior";

const MIN_HERO_READING = 464;
const TWO_COLUMN_QUERY = "(min-width: 75rem)";

type AgentDetailClasses = {
  hero: string;
  heroInner: string;
};

export function useAgentDetailHeroPin(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  classes: AgentDetailClasses,
  prefix = "dotnet",
) {
  const [pinnedHeight, setPinnedHeight] = React.useState(0);
  const { hero: heroClass, heroInner: frameClass } = classes;
  React.useEffect(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    const page = scrollHost.parentElement;
    const hero = scrollHost.getElementsByClassName(heroClass)[0];
    const frame = scrollHost.getElementsByClassName(frameClass)[0];
    const strip = scrollHost.querySelector<HTMLElement>("[data-reading-header]");
    const surface = strip?.firstElementChild;
    if (!(hero instanceof HTMLElement) || !(frame instanceof HTMLElement) ||
        !strip || !(surface instanceof HTMLElement)) return;
    let boundary: IntersectionObserver | undefined;
    let updateVisibility = () => {};
    let focusFrame = 0;
    const actions = hero.querySelector<HTMLElement>("[data-hero-actions]");
    const main = scrollHost.closest("main") ?? scrollHost.querySelector("main");

    const measure = () => {
      const scrollbar = scrollHost.offsetWidth - scrollHost.clientWidth;
      page?.style.setProperty(`--${prefix}-scrollbar`, `${scrollbar}px`);

      const heroRect = hero.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const frameStart = Math.round((frameRect.left - heroRect.left) * 100) / 100;
      const frameWidth = Math.round(frameRect.width * 100) / 100;
      page?.style.setProperty(`--${prefix}-frame-start`, `${frameStart}px`);
      page?.style.setProperty(`--${prefix}-frame-width`, `${frameWidth}px`);
      page?.style.setProperty("--reading-frame-start", `${frameStart}px`);
      page?.style.setProperty("--reading-frame-width", `${frameWidth}px`);

      const height = surface.getBoundingClientRect().height;
      const twoColumn = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const shouldPin = twoColumn && height <= 64 &&
        scrollHost.getBoundingClientRect().top + height <= 144 &&
        scrollHost.clientHeight - height >= MIN_HERO_READING;
      const pinned = shouldPin ? height : 0;

      if (page) page.dataset.heroPin = shouldPin ? "true" : "false";
      page?.style.setProperty(`--${prefix}-hero-pinned`, `${pinned}px`);
      setPinnedHeight(pinned);
      boundary?.disconnect();
      updateVisibility = () => {
        const focused = strip.contains(document.activeElement);
        const visible = shouldPin && (focused ||
          hero.getBoundingClientRect().bottom <= scrollHost.getBoundingClientRect().top + height);
        if (!visible && focused) main?.focus({ preventScroll: true });
        strip.dataset.visible = String(visible);
        strip.inert = !visible;
        strip.setAttribute("aria-hidden", String(!visible));
        hero.dataset.compact = String(visible);
        if (visible && actions?.contains(document.activeElement)) {
          const action = strip.querySelector<HTMLElement>("[data-reading-action] a, [data-reading-action] button");
          (action ?? main)?.focus({ preventScroll: true });
        }
        if (actions) actions.inert = visible;
      };
      updateVisibility();
      boundary = new IntersectionObserver(updateVisibility, {
        root: scrollHost,
        // Hand over while the remaining hero is the same height as the strip,
        // rather than showing a bare progress line before a taller title pops in.
        rootMargin: `-${height}px 0px 0px 0px`,
        threshold: 0,
      });
      boundary.observe(hero);
    };

    measure();
    // Hydrated markdown can appear after the browser's initial fragment jump.
    // Resolve it once the measured reading clearance is available.
    const initialAnchor = window.requestAnimationFrame(() => {
      scrollHost.querySelector(":target")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(hero);
    observer.observe(surface);
    observer.observe(scrollHost);
    const onFocusOut = () => {
      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => updateVisibility());
    };
    strip.addEventListener("focusout", onFocusOut);

    return () => {
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(initialAnchor);
      window.cancelAnimationFrame(focusFrame);
      strip.removeEventListener("focusout", onFocusOut);
      observer.disconnect();
      boundary?.disconnect();
    };
  }, [heroClass, frameClass, contentScrollRef, prefix]);
  return pinnedHeight;
}

export function useAgentDetailProgress(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  setShowBackToTop: React.Dispatch<React.SetStateAction<boolean>>,
  setHeroBurst: React.Dispatch<React.SetStateAction<boolean>>,
  prefix = "dotnet",
) {
  const burstRef = React.useRef(false);

  React.useEffect(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    const page = scrollHost.parentElement;
    const content = scrollHost.querySelector<HTMLElement>("[data-reading-content]");
    if (!content) throw new Error("Reading progress requires an article marked data-reading-content.");

    const update = () => {
      const internalScroll = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const rootRect = scrollHost.getBoundingClientRect();
      const regionTop = rootRect.top + window.scrollY;
      const scrollTop = internalScroll
        ? scrollHost.scrollTop
        : Math.max(0, window.scrollY - regionTop);
      const viewportHeight = internalScroll ? rootRect.height : window.innerHeight;
      const contentBottom = content.getBoundingClientRect().bottom;
      const endOffset = internalScroll
        ? contentBottom - rootRect.top + scrollHost.scrollTop
        : contentBottom + window.scrollY - regionTop;
      const finish = Math.max(0, endOffset - viewportHeight);

      const progress = finish > 0 ? Math.min(1, scrollTop / finish) : 1;
      const eased = Math.max(progress > 0 ? Math.pow(progress, 0.5) : 0, 0.055);
      page?.style.setProperty(`--${prefix}-progress`, String(eased));
      setShowBackToTop(scrollTop > 200);

      const reached = scrollTop > 0 && progress >= 1;
      if (reached !== burstRef.current) {
        burstRef.current = reached;
        setHeroBurst(reached);
      }
    };

    update();
    scrollHost.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => {
      scrollHost.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [contentScrollRef, setHeroBurst, setShowBackToTop, prefix]);

  return React.useCallback(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    if (window.matchMedia(TWO_COLUMN_QUERY).matches) {
      scrollHost.scrollTo({ top: 0, behavior: getScrollBehavior() });
    } else {
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    }
    const heading = scrollHost.querySelector("h1");
    heading?.setAttribute("tabindex", "-1");
    heading?.focus({ preventScroll: true });
  }, [contentScrollRef]);
}

export function useReadingScrollSpy(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  toc: { id: string }[],
  pinnedHeight: number,
  setActiveSection: React.Dispatch<React.SetStateAction<string>>,
) {
  React.useEffect(() => {
    const scroller = contentScrollRef.current;
    if (!scroller || !toc.length) return;
    let observer: IntersectionObserver;
    const build = () => {
      observer?.disconnect();
      const internal = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const viewport = internal ? scroller.clientHeight : window.innerHeight;
      const firstSection = document.getElementById(toc[0].id);
      const anchorGap = firstSection
        ? parseFloat(getComputedStyle(firstSection).scrollMarginTop) || 0
        : 0;
      const readingInset = pinnedHeight + anchorGap;
      const visible = new Set<Element>();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });
        const readingTop = (internal ? scroller.getBoundingClientRect().top : 0) + readingInset;
        const first = [...visible].filter(
          // scrollTop is rounded to CSS pixels; ignore a fractional trailing edge.
          (element) => element.getBoundingClientRect().bottom > readingTop + 1,
        ).sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )[0];
        if (first) setActiveSection(first.id);
      }, {
        root: internal ? scroller : null,
        rootMargin: `-${readingInset}px 0px -${Math.round(Math.max(0, viewport - readingInset) * 0.65)}px 0px`,
        threshold: 0,
      });
      toc.forEach(({ id }) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      });
    };
    build();
    window.addEventListener("resize", build);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", build);
    };
  }, [contentScrollRef, toc, pinnedHeight, setActiveSection]);
}
