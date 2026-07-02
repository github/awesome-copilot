/**
 * Skills page functionality
 */
import {
  escapeHtml,
  fetchData,
  formatRelativeTime,
  showToast,
  downloadZipBundle,
  copyToClipboard,
  REPO_IDENTIFIER,
} from '../utils';
import { openCardDetailsModal } from '../modal';
import { initListingPage } from './listing-controller';
import {
  renderSkillsHtml,
  skillAssetKinds,
  skillSearchText,
  sortSkills,
  type RenderableSkill,
  type SkillSortOption,
} from './skills-render';

interface SkillFile {
  name: string;
  path: string;
}

interface Skill extends Omit<RenderableSkill, 'files'> {
  files: SkillFile[];
}

interface SkillsData {
  items: Skill[];
}

const SPINNER_SVG =
  '<svg class="spinner" viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 0a8 8 0 1 0 8 8h-1.5A6.5 6.5 0 1 1 8 1.5V0z"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>';
const DOWNLOAD_SVG =
  '<svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/></svg>';

let skillById = new Map<string, Skill>();

async function copyInstallCommand(skillId: string, btn: HTMLButtonElement): Promise<void> {
  const command = `gh skills install ${REPO_IDENTIFIER} ${skillId}`;
  const originalContent = btn.innerHTML;
  const success = await copyToClipboard(command);
  showToast(success ? 'Install command copied!' : 'Failed to copy', success ? 'success' : 'error');
  if (success) {
    btn.innerHTML = `${CHECK_SVG}<span>Copied!</span>`;
    setTimeout(() => {
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

/** Icon-only download button: swap only the glyph so the 32px tile keeps its shape. */
async function downloadSkill(skillId: string, btn: HTMLButtonElement): Promise<void> {
  const skill = skillById.get(skillId);
  if (!skill || !skill.files || skill.files.length === 0) {
    showToast('No files found for this skill.', 'error');
    return;
  }

  const iconOnly = btn.classList.contains('rcard-icon-btn');
  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = iconOnly ? SPINNER_SVG : `${SPINNER_SVG}<span>Preparing…</span>`;

  try {
    await downloadZipBundle(skill.id, skill.files);
    btn.innerHTML = iconOnly ? CHECK_SVG : `${CHECK_SVG}<span>Downloaded!</span>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.';
    showToast(message, 'error');
    btn.innerHTML = iconOnly ? DOWNLOAD_SVG : originalContent;
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = originalContent;
    }, 2000);
  }
}

function openSkillDetailsModal(item: Skill, trigger?: HTMLElement): void {
  const metaParts: string[] = [];
  if (item.hasAssets) {
    metaParts.push(
      `<span class="resource-tag tag-assets">${item.assetCount} asset${
        item.assetCount === 1 ? '' : 's'
      }</span>`
    );
  }

  metaParts.push(
    `<span class="resource-tag">${item.files.length} file${
      item.files.length === 1 ? '' : 's'
    }</span>`
  );

  if (item.lastUpdated) {
    metaParts.push(
      `<span class="last-updated">Updated ${escapeHtml(
        formatRelativeTime(item.lastUpdated)
      )}</span>`
    );
  }

  const fileTagParts = item.files
    .slice(0, 24)
    .map((file) => `<span class="resource-tag">${escapeHtml(file.name)}</span>`);
  if (item.files.length > 24) {
    fileTagParts.push(`<span class="resource-tag">+${item.files.length - 24} more</span>`);
  }

  const actionsHtml = `
    <button id="skill-details-install" class="btn btn-secondary" type="button" data-skill-id="${escapeHtml(
      item.id
    )}">Copy Install</button>
    <button id="skill-details-download" class="btn btn-primary" type="button" data-skill-id="${escapeHtml(
      item.id
    )}">Download</button>
    <button class="btn btn-secondary" type="button" data-open-file-path="${escapeHtml(
      item.skillFile
    )}" data-open-file-type="skill">Source</button>
  `;

  openCardDetailsModal({
    title: item.title,
    description: item.description || 'No description',
    previewIcon: '⚡',
    previewText: 'Skill files and install options',
    metaHtml: metaParts.join(''),
    tagsHtml: fileTagParts.join(''),
    actionsHtml,
    trigger,
  });
}

/** Delegated handlers for the bespoke copy/download buttons (cards + modal). */
function setupSkillActionHandlers(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const copyBtn = target.closest(
      '.copy-install-btn, #skill-details-install'
    ) as HTMLButtonElement | null;
    if (copyBtn) {
      event.stopPropagation();
      const skillId = copyBtn.dataset.skillId;
      if (skillId) copyInstallCommand(skillId, copyBtn);
      return;
    }

    const downloadBtn = target.closest(
      '.download-skill-btn, #skill-details-download'
    ) as HTMLButtonElement | null;
    if (downloadBtn) {
      event.stopPropagation();
      const skillId = downloadBtn.dataset.skillId;
      if (skillId) downloadSkill(skillId, downloadBtn);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupSkillActionHandlers();
  const data = await fetchData<SkillsData>('skills.json');
  if (data?.items) {
    skillById = new Map(data.items.map((item) => [item.id, item]));
  }
});

initListingPage<Skill>({
  dataFile: 'skills.json',
  keyOf: (item) => item.skillFile,
  search: skillSearchText,
  facetValues: (item) => ({ resource: skillAssetKinds(item) }),
  sort: (items, sort) => sortSkills(items, sort as SkillSortOption),
  render: renderSkillsHtml,
  noun: 'skill',
  openModal: openSkillDetailsModal,
});
