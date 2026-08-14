import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, XIcon } from "@primer/octicons-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Heading, ThemeProvider, useTheme } from "@primer/react-brand";

import styles from "./styles/VideoCarousel.module.css";

export type Video = {
  id: string;
  title: string;
  meta: string;
};

const PER_PAGE = 3;

/** Modal YouTube player with a portal, focus trap, scroll lock, and Escape close. */
function VideoDialog({ video, onClose }: { video: Video; onClose: () => void }) {
  const { colorMode } = useTheme();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <ThemeProvider colorMode={colorMode}>
      <div className={styles.backdrop} onMouseDown={onClose}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={styles.dialog}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className={styles.dialogHeader}>
            <Heading as="h2" size="6" id={titleId} className={styles.dialogTitle}>
              {video.title}
            </Heading>
            <button
              ref={closeRef}
              type="button"
              className={styles.closeButton}
              aria-label="Close video"
              onClick={onClose}
            >
              <XIcon size={16} />
            </button>
          </header>
          <div className={styles.videoFrame}>
            <iframe
              src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}

export function VideoCarousel({ videos }: { videos: Video[] }) {
  const [page, setPage] = useState(0);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const pageCount = Math.ceil(videos.length / PER_PAGE);
  const changePage = (direction: 1 | -1) => {
    setPage((current) => (current + direction + pageCount) % pageCount);
  };
  const visibleVideos = videos.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div className={styles.carousel}>
      <div className={styles.header}>
        <p className={styles.headerLabel}>
          {videos.length} {videos.length === 1 ? "video" : "videos"} in this
          series
        </p>
        {pageCount > 1 ? (
          <div className={styles.nav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Previous videos"
              onClick={() => changePage(-1)}
            >
              <ArrowLeftIcon size={20} />
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Next videos"
              onClick={() => changePage(1)}
            >
              <ArrowRightIcon size={20} />
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.track} key={page}>
        {visibleVideos.map((video) => (
          <button
            key={video.id}
            type="button"
            className={styles.card}
            onClick={() => setActiveVideo(video)}
            aria-label={`Play video: ${video.title}`}
          >
            <span className={styles.thumb}>
              <img
                className={styles.thumbImage}
                src={`https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`}
                onError={(event) => {
                  event.currentTarget.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                }}
                alt=""
                loading="lazy"
                width={1280}
                height={720}
              />
              <span className={styles.playBadge} aria-hidden="true">
                <PlayIcon size={24} />
              </span>
            </span>
            <span className={styles.cardMeta}>{video.meta}</span>
            <span className={styles.cardTitle}>{video.title}</span>
          </button>
        ))}
      </div>

      {activeVideo ? (
        <VideoDialog video={activeVideo} onClose={() => setActiveVideo(null)} />
      ) : null}
    </div>
  );
}
