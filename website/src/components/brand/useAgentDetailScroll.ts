import React from "react";

const MIN_HERO_READING = 464;
const TWO_COLUMN_QUERY = "(min-width: 75rem)";

type AgentDetailClasses = {
  hero: string;
  heroInner: string;
  heroContent: string;
};

export function useAgentDetailHeroPin(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  classes: AgentDetailClasses,
) {
  React.useEffect(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    const page = scrollHost.parentElement;

    const measure = () => {
      const scrollbar = scrollHost.offsetWidth - scrollHost.clientWidth;
      page?.style.setProperty("--dotnet-scrollbar", `${scrollbar}px`);

      const hero = page?.getElementsByClassName(classes.hero)[0];
      const frame = page?.getElementsByClassName(classes.heroInner)[0];
      const content = page?.getElementsByClassName(classes.heroContent)[0];
      if (!(hero instanceof HTMLElement) || !(frame instanceof HTMLElement)) {
        return;
      }

      const heroRect = hero.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const frameStart = Math.round((frameRect.left - heroRect.left) * 100) / 100;
      const frameWidth = Math.round(frameRect.width * 100) / 100;
      page?.style.setProperty("--dotnet-frame-start", `${frameStart}px`);
      page?.style.setProperty("--dotnet-frame-width", `${frameWidth}px`);

      if (!(content instanceof HTMLElement)) return;
      const contentRect = content.getBoundingClientRect();
      const crumbBand = Math.round((contentRect.top - heroRect.top) * 100) / 100;
      const contentBand = Math.round((heroRect.bottom - contentRect.top) * 100) / 100;
      const twoColumn = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const shouldPin = twoColumn && scrollHost.clientHeight - contentBand >= MIN_HERO_READING;
      const pinnedHeight = shouldPin ? contentBand : 0;

      if (page) page.dataset.heroPin = shouldPin ? "true" : "false";
      page?.style.setProperty("--dotnet-hero-crumb", `${shouldPin ? crumbBand : 0}px`);
      page?.style.setProperty("--dotnet-hero-pinned", `${pinnedHeight}px`);
    };

    measure();
    window.addEventListener("resize", measure);
    const hero = page?.getElementsByClassName(classes.hero)[0];
    const observer =
      hero instanceof HTMLElement && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : undefined;
    if (hero instanceof HTMLElement) observer?.observe(hero);

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [classes, contentScrollRef]);
}

export function useAgentDetailProgress(
  contentScrollRef: React.RefObject<HTMLDivElement | null>,
  lastSectionId: string,
  setShowBackToTop: React.Dispatch<React.SetStateAction<boolean>>,
  setHeroBurst: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const burstRef = React.useRef(false);

  React.useEffect(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    const page = scrollHost.parentElement;
    let lastHeading: HTMLElement | null = null;

    const update = () => {
      if (!lastHeading) {
        const section = document.getElementById(lastSectionId);
        lastHeading = (section?.querySelector("h2") as HTMLElement | null) ?? section;
      }

      const internalScroll = window.matchMedia(TWO_COLUMN_QUERY).matches;
      const rootRect = scrollHost.getBoundingClientRect();
      const regionTop = rootRect.top + window.scrollY;
      const scrollTop = internalScroll
        ? scrollHost.scrollTop
        : Math.max(0, window.scrollY - regionTop);
      const viewportHeight = internalScroll ? rootRect.height : window.innerHeight;
      let finish = internalScroll
        ? scrollHost.scrollHeight - scrollHost.clientHeight
        : Math.max(1, scrollHost.scrollHeight - viewportHeight);

      if (lastHeading) {
        const headingOffset = internalScroll
          ? lastHeading.getBoundingClientRect().top - rootRect.top + scrollHost.scrollTop
          : lastHeading.getBoundingClientRect().top + window.scrollY - regionTop;
        finish = Math.max(1, headingOffset - viewportHeight * 0.6);
      }

      const progress = finish > 0 ? Math.min(1, scrollTop / finish) : 0;
      const eased = Math.max(progress > 0 ? Math.pow(progress, 0.5) : 0, 0.055);
      page?.style.setProperty("--dotnet-progress", String(eased));
      setShowBackToTop(scrollTop > 200);

      const reached = progress >= 1;
      if (reached !== burstRef.current) {
        burstRef.current = reached;
        setHeroBurst(reached);
      }
    };

    update();
    scrollHost.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scrollHost.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [contentScrollRef, lastSectionId, setHeroBurst, setShowBackToTop]);

  return React.useCallback(() => {
    const scrollHost = contentScrollRef.current;
    if (!scrollHost) return;
    if (window.matchMedia(TWO_COLUMN_QUERY).matches) {
      scrollHost.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [contentScrollRef]);
}
