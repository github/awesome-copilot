import { SITE } from "../config/site";
import { copyToClipboard } from "./utils";

export interface ShareModalData {
  title: string;
  description: string;
  url: string;
  badge?: string;
}

let currentTrigger: HTMLElement | null = null;
let listenersReady = false;

function normalizeShareUrl(url: string): string {
  if (URL.canParse(url)) return url;
  return new URL(url, SITE.url).toString();
}

function buildShareText(title: string): string {
  return `${title} · ${SITE.title}`;
}

function buildShareLinks(url: string, title: string): Record<string, string> {
  const shareUrl = encodeURIComponent(url);
  const shareText = encodeURIComponent(buildShareText(title));

  return {
    x: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  };
}

function ensureShareModalListeners(dialog: HTMLDialogElement): void {
  if (listenersReady) return;
  listenersReady = true;

  const closeBtn = document.getElementById("share-modal-close");
  const copyBtn = document.getElementById(
    "share-modal-copy"
  ) as HTMLButtonElement | null;

  closeBtn?.addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    const trigger = currentTrigger;
    currentTrigger = null;
    if (trigger) requestAnimationFrame(() => trigger.focus());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) dialog.close();
  });

  copyBtn?.addEventListener("click", async () => {
    const shareUrl = copyBtn.dataset.shareUrl;
    if (!shareUrl) return;

    const originalLabel = copyBtn.querySelector("span")?.textContent ?? "Copy link";
    const success = await copyToClipboard(shareUrl);
    const label = copyBtn.querySelector("span");
    if (label) label.textContent = success ? "Copied" : "Failed";

    window.setTimeout(() => {
      if (label) label.textContent = originalLabel;
    }, 1600);
  });
}

export function openShareModal(
  payload: ShareModalData,
  trigger?: HTMLElement
): boolean {
  const dialog = document.getElementById("share-modal") as HTMLDialogElement | null;
  const title = document.getElementById("share-modal-title");
  const description = document.getElementById("share-modal-desc");
  const copyBtn = document.getElementById(
    "share-modal-copy"
  ) as HTMLButtonElement | null;
  const xLink = document.getElementById("share-modal-x") as HTMLAnchorElement | null;
  const whatsappLink = document.getElementById(
    "share-modal-whatsapp"
  ) as HTMLAnchorElement | null;
  const linkedinLink = document.getElementById(
    "share-modal-linkedin"
  ) as HTMLAnchorElement | null;

  if (
    !dialog ||
    !title ||
    !description ||
    !copyBtn ||
    !xLink ||
    !whatsappLink ||
    !linkedinLink
  ) {
    return false;
  }

  const shareUrl = normalizeShareUrl(payload.url);
  const links = buildShareLinks(shareUrl, payload.title);

  currentTrigger = trigger ?? (document.activeElement as HTMLElement | null);
  ensureShareModalListeners(dialog);

  title.textContent = `Share ${payload.title}`;
  description.textContent = "Share this page on your preferred network or copy the canonical link.";

  xLink.href = links.x;
  whatsappLink.href = links.whatsapp;
  linkedinLink.href = links.linkedin;
  copyBtn.dataset.shareUrl = shareUrl;

  dialog.showModal();
  requestAnimationFrame(() => {
    (document.getElementById("share-modal-close") as HTMLButtonElement | null)?.focus();
  });

  return true;
}
