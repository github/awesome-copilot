/**
 * Extension detail page image gallery.
 * Switches the main preview image when a thumbnail is selected.
 */
function initExtensionGallery(): void {
  const mainImage = document.getElementById(
    "extension-gallery-image"
  ) as HTMLImageElement | null;
  const thumbs = document.querySelectorAll<HTMLButtonElement>(
    ".extension-gallery-thumb"
  );

  if (!mainImage || thumbs.length === 0) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const url = thumb.dataset.galleryUrl;
      if (!url) return;

      mainImage.src = url;

      thumbs.forEach((other) => {
        const isActive = other === thumb;
        other.classList.toggle("active", isActive);
        if (isActive) {
          other.setAttribute("aria-current", "true");
        } else {
          other.removeAttribute("aria-current");
        }
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initExtensionGallery, {
    once: true,
  });
} else {
  initExtensionGallery();
}
