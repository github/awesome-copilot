import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ARTIFACTS_DIR = join(__dirname, "artifacts");
const STATE_FILE = join(ARTIFACTS_DIR, "state.json");
const REPO_ROOT_FALLBACK = join(__dirname, "..", "..", "..");

const SECTION_TEMPLATE = [
    { id: "design-system", name: "Design System", icon: "🎨" },
    { id: "hero", name: "Hero", icon: "🏠" },
    { id: "nav", name: "Navigation", icon: "🧭" },
    { id: "about", name: "About", icon: "👤" },
    { id: "talks", name: "Conference Talks", icon: "🎤" },
    { id: "videos", name: "Videos", icon: "🎥" },
    { id: "contact", name: "Contact", icon: "📬" },
];

const VALID_STATUS = new Set(["Not Started", "In Progress", "Built", "Review", "Approved", "Needs Changes"]);
const VALID_CHANGE_TYPES = new Set(["file_modified", "file_added", "file_deleted", "status_change", "commit", "milestone", "ai_request"]);
const STATUS_ORDER = ["Not Started", "In Progress", "Built", "Review", "Approved", "Needs Changes"];
const SECTION_FIELD_SUGGESTIONS = {
    "design-system": [
        { field: "palette", prompt: "What are your core brand colors (base, accent, muted, success, warning)?" },
        { field: "typography", prompt: "What fonts and weights should headings/body/code use?" },
        { field: "spacing-scale", prompt: "What spacing scale should components follow?" },
        { field: "radius", prompt: "What border radius values should be standard?" },
        { field: "motion", prompt: "What motion durations/easing should be standard?" },
        { field: "component-rules", prompt: "What visual rules should cards, buttons, and inputs follow?" },
    ],
    hero: [
        { field: "headline", prompt: "What should your hero headline say?" },
        { field: "subheadline", prompt: "What supporting subheadline should appear below it?" },
        { field: "cta-primary", prompt: "Primary CTA button link (full URL)?" },
        { field: "cta-secondary", prompt: "Secondary CTA button link (full URL)?" },
    ],
    nav: [
        { field: "links", prompt: "Which nav links should appear and in what order?" },
        { field: "style", prompt: "How should nav styling behave on scroll?" },
    ],
    about: [
        { field: "bio", prompt: "What short bio should appear?" },
        { field: "stats", prompt: "Which key stats should be shown?" },
    ],
    talks: [
        { field: "featured", prompt: "Which featured talk should be highlighted first?" },
        { field: "list", prompt: "Which talks should be listed and how?" },
    ],
    videos: [
        { field: "featured", prompt: "Which featured video should be highlighted first?" },
        { field: "grid", prompt: "What metadata should each video card show?" },
    ],
    contact: [
        { field: "intro", prompt: "What contact intro copy should be displayed?" },
        { field: "links", prompt: "Which social/contact links should be shown?" },
    ],
};

const SECTION_DEFAULT_CONTENT = {
    "design-system": {
        palette: "[Sample: List your core brand colors — base, accent, and muted]",
        typography: "[Sample: Name the fonts for headings, body, and code]",
    },
    hero: {
        headline: "[Sample: Write a short headline that says who you are]",
        subheadline: "[Sample: Add one sentence on what you do and who you help]",
        "cta-primary": "[Sample: Add the link your main button should point to]",
    },
    nav: {
        links: "[Sample: List your nav links in order, e.g. Home, About, Work, Contact]",
    },
    about: {
        bio: "[Sample: Write two or three sentences about your background and focus]",
    },
    talks: {
        featured: "[Sample: Name a talk — title, event, and year]",
    },
    videos: {
        featured: "[Sample: Add a link to a video you want to feature]",
    },
    contact: {
        intro: "[Sample: Write a short line inviting people to reach out]",
        links: "[Sample: List your social or contact links]",
        email: "[Sample: Add the email address to display]",
    },
};

const DEFAULT_TEMPLATE_PACK = "personal-site-classic";
const TEMPLATE_PACKS = {
    "personal-site-classic": {
        label: "Personal Site (Classic)",
        defaultContent: SECTION_DEFAULT_CONTENT,
        sections: SECTION_TEMPLATE,
        fieldSuggestions: SECTION_FIELD_SUGGESTIONS,
        sectionSchemas: {
            hero: {
                headline: { type: "text", required: true, maxLength: 120 },
                subheadline: { type: "text", required: true, maxLength: 220 },
                "cta-primary": { type: "url", required: true },
                "cta-secondary": { type: "url", required: false },
            },
            about: {
                bio: { type: "text", required: true, maxLength: 1600 },
            },
            talks: {
                featured: { type: "text", required: true, maxLength: 1200 },
            },
            videos: {
                featured: { type: "url", required: false },
            },
            contact: {
                intro: { type: "text", required: true, maxLength: 400 },
                links: { type: "text", required: true, maxLength: 1200 },
                email: { type: "email", required: false },
            },
        },
    },
    "developer-portfolio": {
        label: "Developer Portfolio",
        defaultContent: {
            hero: {
                headline: "[Sample: Write a headline describing the kind of engineer you are]",
                subheadline: "[Sample: Add one line on what you build and your focus]",
                "cta-primary": "[Sample: Add the link your main button should point to]",
            },
            projects: {
                featured: "[Sample: Describe a project — what it does, the stack, and the impact]",
            },
            skills: {
                core: "[Sample: List your core technical skills]",
                tooling: "[Sample: List the tools and platforms you use]",
            },
            experience: {
                summary: "[Sample: Summarize your recent role, company, and key wins]",
            },
            writing: {
                featured: "[Sample: Add an article title and where it was published]",
            },
            contact: {
                intro: "[Sample: Write a short line about how to reach you]",
                email: "[Sample: Add the email address to display]",
            },
        },
        sections: [
            { id: "hero", name: "Hero", icon: "🏠" },
            { id: "projects", name: "Projects", icon: "🧪" },
            { id: "skills", name: "Skills", icon: "🛠️" },
            { id: "experience", name: "Experience", icon: "💼" },
            { id: "writing", name: "Writing", icon: "✍️" },
            { id: "contact", name: "Contact", icon: "📬" },
        ],
        fieldSuggestions: {
            hero: [
                { field: "headline", prompt: "What should your hero headline say?" },
                { field: "subheadline", prompt: "What short positioning line should appear below it?" },
                { field: "cta-primary", prompt: "Primary CTA button link (full URL)?" },
            ],
            projects: [
                { field: "featured", prompt: "Which project should be featured first?" },
                { field: "list", prompt: "Which additional projects should be listed?" },
            ],
            skills: [
                { field: "core", prompt: "What are your core technical skills?" },
                { field: "tooling", prompt: "What tools/platforms should be highlighted?" },
            ],
            experience: [
                { field: "summary", prompt: "How should your recent experience be summarized?" },
            ],
            writing: [
                { field: "featured", prompt: "Any featured article/post to highlight?" },
            ],
            contact: [
                { field: "intro", prompt: "What contact intro copy should be displayed?" },
                { field: "email", prompt: "What contact email should be shown?" },
            ],
        },
        sectionSchemas: {
            hero: {
                headline: { type: "text", required: true, maxLength: 120 },
                subheadline: { type: "text", required: true, maxLength: 220 },
                "cta-primary": { type: "url", required: true },
            },
            projects: {
                featured: { type: "text", required: true, maxLength: 900 },
            },
            contact: {
                intro: { type: "text", required: true, maxLength: 300 },
                email: { type: "email", required: false },
            },
        },
    },
    "speaker-site": {
        label: "Speaker Site",
        defaultContent: {
            hero: {
                headline: "[Sample: Write a headline describing your speaking focus]",
                positioning: "[Sample: Add a sentence on the value you bring to audiences]",
            },
            talks: {
                featured: "[Sample: Name your signature keynote and its core idea]",
                catalog: "[Sample: List your talks with a one-line description each]",
            },
            workshops: {
                offerings: "[Sample: Describe the workshops you offer]",
            },
            videos: {
                featured: "[Sample: Add a link to a talk video to feature]",
            },
            testimonials: {
                quotes: "[Sample: Add an audience or client quote with attribution]",
            },
            contact: {
                intro: "[Sample: Write a short line for booking inquiries]",
                email: "[Sample: Add the booking email to display]",
            },
        },
        sections: [
            { id: "hero", name: "Hero", icon: "🏠" },
            { id: "talks", name: "Talks", icon: "🎤" },
            { id: "workshops", name: "Workshops", icon: "🧑‍🏫" },
            { id: "videos", name: "Videos", icon: "🎥" },
            { id: "testimonials", name: "Testimonials", icon: "💬" },
            { id: "contact", name: "Contact", icon: "📬" },
        ],
        fieldSuggestions: {
            hero: [
                { field: "headline", prompt: "What should your speaker headline say?" },
                { field: "positioning", prompt: "How should your expertise be positioned?" },
            ],
            talks: [
                { field: "featured", prompt: "Which keynote/talk should be featured?" },
                { field: "catalog", prompt: "What talks should be included in your catalog?" },
            ],
            workshops: [
                { field: "offerings", prompt: "Which workshops do you offer?" },
            ],
            videos: [
                { field: "featured", prompt: "Which featured video should be highlighted first?" },
            ],
            testimonials: [
                { field: "quotes", prompt: "Which audience/client quotes should be highlighted?" },
            ],
            contact: [
                { field: "intro", prompt: "What booking/contact intro should be shown?" },
                { field: "email", prompt: "What booking email should be shown?" },
            ],
        },
        sectionSchemas: {
            hero: {
                headline: { type: "text", required: true, maxLength: 120 },
            },
            talks: {
                featured: { type: "text", required: true, maxLength: 1000 },
            },
            contact: {
                intro: { type: "text", required: true, maxLength: 300 },
                email: { type: "email", required: true },
            },
        },
    },
    "founder-site": {
        label: "Founder Site",
        defaultContent: {
            hero: {
                headline: "[Sample: Write your product's one-line value proposition]",
                "cta-primary": "[Sample: Add the link your main button should point to]",
            },
            product: {
                "value-prop": "[Sample: Describe what the product does and why it's better]",
            },
            story: {
                "founder-story": "[Sample: Share why you started the company and your mission]",
            },
            press: {
                highlights: "[Sample: List notable press mentions, awards, or milestones]",
            },
            contact: {
                intro: "[Sample: Write a short line for partnership or press inquiries]",
                email: "[Sample: Add the email address to display]",
            },
        },
        sections: [
            { id: "hero", name: "Hero", icon: "🚀" },
            { id: "product", name: "Product", icon: "📦" },
            { id: "story", name: "Story", icon: "📖" },
            { id: "press", name: "Press", icon: "📰" },
            { id: "contact", name: "Contact", icon: "📬" },
        ],
        fieldSuggestions: {
            hero: [
                { field: "headline", prompt: "What should the company/product headline be?" },
                { field: "cta-primary", prompt: "Primary CTA button link (full URL)?" },
            ],
            product: [
                { field: "value-prop", prompt: "What is the primary product value proposition?" },
            ],
            story: [
                { field: "founder-story", prompt: "How should the founder story be told?" },
            ],
            press: [
                { field: "highlights", prompt: "Which press mentions should be included?" },
            ],
            contact: [
                { field: "intro", prompt: "What investor/customer contact intro should be shown?" },
                { field: "email", prompt: "What contact email should be shown?" },
            ],
        },
        sectionSchemas: {
            hero: {
                headline: { type: "text", required: true, maxLength: 120 },
                "cta-primary": { type: "url", required: true },
            },
            contact: {
                email: { type: "email", required: true },
            },
        },
    },
    "designer-site": {
        label: "Designer Site",
        defaultContent: {
            hero: {
                headline: "[Sample: Write a headline describing your design focus]",
                subheadline: "[Sample: Add a sentence on how you help brands or products]",
            },
            work: {
                featured: "[Sample: Describe a featured project — brief, your role, outcome]",
            },
            "case-studies": {
                list: "[Sample: List case studies with problem, approach, and result]",
            },
            process: {
                steps: "[Sample: Outline your design process in a few steps]",
            },
            about: {
                bio: "[Sample: Write a short bio about your design background]",
            },
            contact: {
                email: "[Sample: Add the email address to display]",
            },
        },
        sections: [
            { id: "hero", name: "Hero", icon: "🎨" },
            { id: "work", name: "Work", icon: "🖼️" },
            { id: "case-studies", name: "Case Studies", icon: "📚" },
            { id: "process", name: "Process", icon: "🧭" },
            { id: "about", name: "About", icon: "👤" },
            { id: "contact", name: "Contact", icon: "📬" },
        ],
        fieldSuggestions: {
            hero: [
                { field: "headline", prompt: "What should your design headline say?" },
                { field: "subheadline", prompt: "What supporting statement should be shown?" },
            ],
            work: [
                { field: "featured", prompt: "What featured visual/project should be shown first?" },
            ],
            "case-studies": [
                { field: "list", prompt: "Which case studies should be included?" },
            ],
            process: [
                { field: "steps", prompt: "How should your design process be presented?" },
            ],
            about: [
                { field: "bio", prompt: "What short bio should appear?" },
            ],
            contact: [
                { field: "email", prompt: "What contact email should be shown?" },
            ],
        },
        sectionSchemas: {
            hero: {
                headline: { type: "text", required: true, maxLength: 120 },
            },
            contact: {
                email: { type: "email", required: true },
            },
        },
    },
};
const TEMPLATE_PACK_OPTIONS = Object.entries(TEMPLATE_PACKS).map(([id, pack]) => ({ id, label: pack.label }));

let stateCache = null;
let stateLoaded = false;
const servers = new Map();
let workspacePath = undefined;

function nowIso() {
    return new Date().toISOString();
}

function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeString(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function readBranchFromGit() {
    if (process.env.COPILOT_WORKSPACE_BRANCH) {
        return process.env.COPILOT_WORKSPACE_BRANCH;
    }
    const candidates = [workspacePath, process.cwd(), REPO_ROOT_FALLBACK].filter((value, index, all) => value && all.indexOf(value) === index);
    for (const cwd of candidates) {
        try {
            const branch = execSync("git --no-pager rev-parse --abbrev-ref HEAD", { cwd, stdio: ["ignore", "pipe", "ignore"], timeout: 2000, maxBuffer: 1024 * 1024 })
                .toString()
                .trim();
            if (branch) {
                return branch;
            }
        } catch {}
    }
    return "unknown";
}

function captureWorkingDirectory(ctx) {
    if (!workspacePath && ctx?.session?.workingDirectory) {
        workspacePath = ctx.session.workingDirectory;
    }
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function getTemplatePackOrThrow(packId) {
    const id = safeString(packId, DEFAULT_TEMPLATE_PACK);
    const pack = TEMPLATE_PACKS[id];
    if (!pack) {
        throw new CanvasError("unknown_template_pack", `Unknown template pack: ${id}`);
    }
    return { id, pack };
}

function getFieldSuggestionsForSection(sectionId) {
    if (!stateCache?.fieldSuggestions || typeof stateCache.fieldSuggestions !== "object") {
        return [];
    }
    return Array.isArray(stateCache.fieldSuggestions[sectionId]) ? stateCache.fieldSuggestions[sectionId] : [];
}

function getFieldSchemaForSection(sectionId, field) {
    if (!stateCache?.sectionSchemas || typeof stateCache.sectionSchemas !== "object") {
        return null;
    }
    const sectionSchema = stateCache.sectionSchemas[sectionId];
    if (!sectionSchema || typeof sectionSchema !== "object") {
        return null;
    }
    const fieldSchema = sectionSchema[field];
    if (!fieldSchema || typeof fieldSchema !== "object") {
        return null;
    }
    return fieldSchema;
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function validateFieldValue(sectionId, field, value, mark = "draft") {
    const schema = getFieldSchemaForSection(sectionId, field);
    if (!schema) {
        return;
    }
    const text = safeString(value, "");
    const trimmed = text.trim();
    const required = Boolean(schema.required);
    if (required && mark === "final" && !trimmed) {
        throw new CanvasError("required_field_missing", `"${field}" is required for ${sectionId}.`);
    }
    if (!trimmed) {
        return;
    }
    if (isSamplePlaceholder(trimmed)) {
        return;
    }
    const maxLength = Number.isInteger(schema.maxLength) ? schema.maxLength : null;
    if (maxLength && text.length > maxLength) {
        throw new CanvasError("max_length_exceeded", `"${field}" exceeds max length (${maxLength}).`);
    }
    const type = safeString(schema.type, "text");
    if (type === "url" && !isValidUrl(trimmed)) {
        throw new CanvasError("invalid_url", `"${field}" must be a valid http/https URL.`);
    }
    if (type === "email" && !isValidEmail(trimmed)) {
        throw new CanvasError("invalid_email", `"${field}" must be a valid email address.`);
    }
}

function applyTemplatePack(packId, author = "agent") {
    const { id, pack } = getTemplatePackOrThrow(packId);
    const ts = nowIso();
    stateCache.templatePackId = id;
    stateCache.fieldSuggestions = cloneJson(pack.fieldSuggestions || {});
    stateCache.sectionSchemas = cloneJson(pack.sectionSchemas || {});
    stateCache.sections = (pack.sections || []).map((section) => ({
        ...section,
        status: "Not Started",
        notes: [],
        content: cloneJson(pack.defaultContent?.[section.id] || {}),
        filesChanged: [],
        lastModified: ts,
    }));
    stateCache.changeLog = [];
    stateCache.contentProposals = [];
    stateCache.milestones = [];
    stateCache.lastUpdated = ts;
    addChange({
        type: "status_change",
        summary: `Template pack applied: ${pack.label}.`,
        timestamp: ts,
    });
    addNote(
        stateCache.sections[0]?.id || "hero",
        `Applied template pack "${pack.label}".`,
        author === "human" ? "human" : "agent",
    );
    return { templatePackId: id, label: pack.label, sections: stateCache.sections };
}

function createInitialState() {
    const ts = nowIso();
    const { id, pack } = getTemplatePackOrThrow(DEFAULT_TEMPLATE_PACK);
    return {
        sections: pack.sections.map((section) => ({
            ...section,
            status: "Not Started",
            notes: [],
            content: cloneJson(pack.defaultContent?.[section.id] || {}),
            filesChanged: [],
            lastModified: ts,
        })),
        templatePackId: id,
        fieldSuggestions: cloneJson(pack.fieldSuggestions || {}),
        sectionSchemas: cloneJson(pack.sectionSchemas || {}),
        changeLog: [],
        contentProposals: [],
        milestones: [],
        theme: { style: "dark", palette: "#050A14/#2F80ED" },
        branch: readBranchFromGit(),
        lastUpdated: ts,
    };
}

let persistQueue = Promise.resolve();
function persistState() {
    if (!stateCache) {
        return persistQueue;
    }
    // Snapshot synchronously and serialize writes so concurrent mutations
    // persist in call order — a slow earlier write can't clobber a newer one.
    const snapshot = JSON.stringify(stateCache, null, 2);
    persistQueue = persistQueue
        .catch(() => {})
        .then(async () => {
            await mkdir(ARTIFACTS_DIR, { recursive: true });
            await writeFile(STATE_FILE, snapshot, "utf8");
        });
    return persistQueue;
}

function normalizeState(raw) {
    if (!raw || typeof raw !== "object") {
        return createInitialState();
    }
    const fallback = createInitialState();
    const templatePackId = safeString(raw.templatePackId, fallback.templatePackId);
    const normalizedTemplatePackId = TEMPLATE_PACKS[templatePackId] ? templatePackId : fallback.templatePackId;
    return {
        sections: Array.isArray(raw.sections) ? raw.sections : fallback.sections,
        templatePackId: normalizedTemplatePackId,
        fieldSuggestions: raw.fieldSuggestions && typeof raw.fieldSuggestions === "object" ? raw.fieldSuggestions : fallback.fieldSuggestions,
        sectionSchemas: raw.sectionSchemas && typeof raw.sectionSchemas === "object" ? raw.sectionSchemas : fallback.sectionSchemas,
        changeLog: Array.isArray(raw.changeLog) ? raw.changeLog : [],
        contentProposals: Array.isArray(raw.contentProposals) ? raw.contentProposals : [],
        milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
        theme: raw.theme && typeof raw.theme === "object" ? raw.theme : fallback.theme,
        branch: safeString(raw.branch, fallback.branch),
        lastUpdated: safeString(raw.lastUpdated, fallback.lastUpdated),
    };
}

async function loadState() {
    if (stateLoaded) {
        return stateCache;
    }
    try {
        const content = await readFile(STATE_FILE, "utf8");
        stateCache = normalizeState(JSON.parse(content));
    } catch {
        stateCache = createInitialState();
        await persistState();
    }
    stateLoaded = true;
    return stateCache;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function findSectionOrThrow(sectionId) {
    const section = stateCache.sections.find((item) => item.id === sectionId);
    if (!section) {
        throw new CanvasError("section_not_found", `Unknown section: ${sectionId}`);
    }
    return section;
}

function addChange(change) {
    const timestamp = safeString(change.timestamp, nowIso());
    const entry = {
        id: uid("change"),
        type: change.type,
        path: typeof change.path === "string" ? change.path : undefined,
        summary: safeString(change.summary, ""),
        timestamp,
        sectionId: typeof change.sectionId === "string" ? change.sectionId : undefined,
    };
    stateCache.changeLog.unshift(entry);
    stateCache.lastUpdated = timestamp;
    return entry;
}

function addNote(sectionId, text, author) {
    const section = findSectionOrThrow(sectionId);
    const note = {
        text: safeString(text),
        author: author === "human" ? "human" : "agent",
        timestamp: nowIso(),
    };
    section.notes.push(note);
    section.lastModified = note.timestamp;
    stateCache.lastUpdated = note.timestamp;
    return note;
}

function updateSectionStatus(sectionId, status, message, author = "agent") {
    if (!VALID_STATUS.has(status)) {
        throw new CanvasError("invalid_status", `Unsupported status: ${status}`);
    }
    const section = findSectionOrThrow(sectionId);
    section.status = status;
    section.lastModified = nowIso();
    stateCache.lastUpdated = section.lastModified;
    addChange({
        type: "status_change",
        summary: `${section.name} moved to ${status}`,
        timestamp: section.lastModified,
        sectionId,
    });
    if (message) {
        addNote(sectionId, message, author);
    }
    return section;
}

function appendFileChange(sectionId, filePath) {
    if (!filePath) {
        return;
    }
    const section = stateCache.sections.find((item) => item.id === sectionId);
    if (!section) {
        return;
    }
    if (!section.filesChanged.includes(filePath)) {
        section.filesChanged.push(filePath);
    }
}

function markMilestone(title, description, sectionsAffected) {
    const milestone = {
        id: uid("milestone"),
        title: safeString(title),
        description: safeString(description),
        sectionsAffected: Array.isArray(sectionsAffected) ? sectionsAffected.filter((value) => typeof value === "string") : [],
        timestamp: nowIso(),
    };
    stateCache.milestones.unshift(milestone);
    addChange({
        type: "milestone",
        summary: `${milestone.title}: ${milestone.description}`,
        timestamp: milestone.timestamp,
    });
    return milestone;
}

const UNSAFE_FIELD_NAMES = new Set(["__proto__", "prototype", "constructor"]);
function isUnsafeFieldName(name) {
    return UNSAFE_FIELD_NAMES.has(name);
}

function upsertSectionContent(sectionId, field, value, mark = "draft", author = "agent") {
    const section = findSectionOrThrow(sectionId);
    const normalizedField = safeString(field).trim();
    if (!normalizedField) {
        throw new CanvasError("invalid_field", "Field name is required.");
    }
    if (isUnsafeFieldName(normalizedField)) {
        throw new CanvasError("invalid_field", `Field name "${normalizedField}" is not allowed.`);
    }
    const normalizedValue = safeString(value, "");
    validateFieldValue(section.id, normalizedField, normalizedValue, mark);
    const current = safeString(section.content[normalizedField], "");
    section.content[normalizedField] = normalizedValue;
    section.lastModified = nowIso();
    stateCache.lastUpdated = section.lastModified;
    addChange({
        type: "file_modified",
        summary: `Content updated for ${section.name}.${normalizedField} (${mark}).`,
        timestamp: section.lastModified,
        sectionId: section.id,
    });
    if (author === "human") {
        addNote(sectionId, `Updated field "${normalizedField}" (${mark}).`, "human");
    }
    return { section, field: normalizedField, current, value: normalizedValue };
}

function isSamplePlaceholder(value) {
    return /^\[sample:/i.test(safeString(value).trim());
}

function deleteSectionContent(sectionId, field, author = "agent") {
    const section = findSectionOrThrow(sectionId);
    const normalizedField = safeString(field).trim();
    if (!normalizedField) {
        throw new CanvasError("invalid_field", "Field name is required.");
    }
    if (!section.content || !Object.prototype.hasOwnProperty.call(section.content, normalizedField)) {
        return { section, field: normalizedField, removed: false };
    }
    delete section.content[normalizedField];
    section.lastModified = nowIso();
    stateCache.lastUpdated = section.lastModified;
    addChange({
        type: "file_modified",
        summary: `Field removed from ${section.name}.${normalizedField}.`,
        timestamp: section.lastModified,
        sectionId: section.id,
    });
    if (author === "human") {
        addNote(sectionId, `Removed field "${normalizedField}".`, "human");
    }
    return { section, field: normalizedField, removed: true };
}

function getSectionGuide(sectionId) {
    const section = findSectionOrThrow(sectionId);
    const templates = getFieldSuggestionsForSection(section.id);
    const missingFields = templates
        .map((item) => item.field)
        .filter((field) => {
            const value = section.content?.[field];
            return !safeString(value).trim() || isSamplePlaceholder(value);
        });
    return {
        sectionId: section.id,
        sectionName: section.name,
        suggestedFields: templates,
        fieldSchemas: stateCache.sectionSchemas?.[section.id] || {},
        missingFields,
        nextSuggestedQuestion: templates.find((item) => missingFields.includes(item.field))?.prompt ?? null,
    };
}

function detectSectionIdFromPrompt(prompt) {
    const normalized = prompt.toLowerCase();
    if (normalized.includes("design system") || normalized.includes("design-system")) return "design-system";
    if (normalized.includes("hero")) return "hero";
    if (normalized.includes("navigation") || normalized.includes(" nav ")) return "nav";
    if (normalized.includes("about")) return "about";
    if (normalized.includes("talk")) return "talks";
    if (normalized.includes("video")) return "videos";
    if (normalized.includes("contact")) return "contact";
    return null;
}

const INTERACTIVE_FILL_CONTEXT = [
    "When users ask to fill Site Studio section content interactively:",
    "1) Call get_dashboard first.",
    "2) Call get_section_guide for the target section.",
    "3) Ask exactly one focused follow-up question at a time.",
    "4) After each answer, call upsert_section_content (or bulk) to persist draft values immediately.",
    "5) Reflect what was saved and ask the next guide question until the section is complete.",
    "6) Offer moving the section status to Review when core fields are filled.",
].join("\n");

const AI_GENERATION_CONTEXT = [
    "When the user asks to AI-generate Site Studio content (or clicks the canvas '✨ Generate with AI' button):",
    "1) Call list_ai_requests to see which sections requested generation and to read existing board content as grounding context.",
    "2) For each requested section, draft each suggested/missing field GROUNDED in information already provided in other sections — do not invent unrelated facts; if there is too little context, ask one clarifying question first.",
    "3) Persist drafts with upsert_section_content (mark='draft'), or use propose_content when the change should be human-reviewed before applying.",
    "4) Call resolve_ai_request for each section when done so the canvas clears its request badge.",
    "5) Briefly summarize what you generated and invite the user to review or move the section to Review.",
].join("\n");

function listDiffLines(before, after) {
    const oldLines = String(before ?? "").split("\n");
    const newLines = String(after ?? "").split("\n");
    const max = Math.max(oldLines.length, newLines.length);
    const result = [];
    for (let i = 0; i < max; i += 1) {
        const oldLine = oldLines[i] ?? "";
        const newLine = newLines[i] ?? "";
        if (oldLine !== newLine) {
            if (oldLine) {
                result.push(`- ${oldLine}`);
            }
            if (newLine) {
                result.push(`+ ${newLine}`);
            }
        }
    }
    return result.join("\n");
}

function sendJson(res, code, payload) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}

const MAX_BODY_BYTES = 1024 * 1024;

async function readBodyJson(req) {
    const chunks = [];
    let received = 0;
    for await (const chunk of req) {
        received += chunk.length;
        if (received > MAX_BODY_BYTES) {
            req.destroy();
            throw new CanvasError("payload_too_large", "Request body exceeds the maximum allowed size.");
        }
        chunks.push(chunk);
    }
    if (!chunks.length) {
        return {};
    }
    const body = Buffer.concat(chunks).toString("utf8");
    if (!body.trim()) {
        return {};
    }
    try {
        return JSON.parse(body);
    } catch {
        throw new CanvasError("invalid_json", "Request body must be valid JSON.");
    }
}

function publishSse(event, payload) {
    const serialized = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const entry of servers.values()) {
        for (const client of entry.clients) {
            try {
                client.write(serialized);
            } catch {
                entry.clients.delete(client);
            }
        }
    }
}

async function mutateState(mutator) {
    await loadState();
    const result = await mutator(stateCache);
    await persistState();
    publishSse("state_update", stateCache);
    return result;
}

function renderHtml(instanceId) {
    return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Site Studio</title>
  <style>
    :root {
      --bg:#050A14;--bg2:#0d1117;--bg3:#161b22;
      --border:#30363d;--text:#e6edf3;--muted:#8b949e;
      --accent:#2F80ED;--accent-bg:rgba(47,128,237,.18);
      --green:rgba(39,174,96,.28);--yellow:rgba(242,201,76,.25);
      --purple:rgba(155,81,224,.3);--red:rgba(235,87,87,.3);--blue:rgba(47,128,237,.3);
    }
    [data-theme=light]{
      --bg:#fff;--bg2:#f6f8fa;--bg3:#eaeef2;
      --border:#d0d7de;--text:#1f2328;--muted:#656d76;
      --accent:#0969da;--accent-bg:rgba(9,105,218,.1);
      --green:rgba(31,136,61,.18);--yellow:rgba(154,83,0,.15);
      --purple:rgba(130,80,223,.2);--red:rgba(207,34,46,.2);--blue:rgba(9,105,218,.2);
    }
    *{box-sizing:border-box;}
    body{margin:0;padding:12px;background:var(--bg);color:var(--text);font:14px/20px var(--font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);transition:background .15s,color .15s;}
    .shell{border:1px solid var(--border);border-radius:10px;overflow:hidden;}
    .header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--accent-bg);}
    .header-left{display:flex;align-items:center;gap:8px;}
    .title{margin:0;font-size:15px;font-weight:600;}
    .meta{color:var(--muted);font-size:12px;}
    .header-actions{display:flex;align-items:center;gap:6px;}
    .tabs{display:flex;border-bottom:1px solid var(--border);}
    .tab{flex:1;background:transparent;color:var(--text);border:0;border-right:1px solid var(--border);padding:10px;cursor:pointer;font-size:13px;}
    .tab:last-child{border-right:0;}
    .tab.active{background:var(--accent-bg);font-weight:600;}
    .panel{display:none;padding:12px;max-height:calc(100vh - 170px);overflow:auto;}
    .panel.active{display:block;}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:8px;}
    .column{border:1px solid var(--border);border-radius:8px;padding:8px;background:var(--bg2);}
    .column h3{margin:0 0 6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);}
    .card{border:1px solid var(--border);border-radius:8px;background:var(--bg);padding:8px;margin-bottom:8px;}
    .card:last-child{margin-bottom:0;}
    .status-pill{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;}
    .s-Not-Started{background:rgba(139,148,158,.25);}
    .s-In-Progress{background:var(--blue);}
    .s-Built{background:var(--purple);}
    .s-Review{background:var(--yellow);}
    .s-Approved{background:var(--green);}
    .s-Needs-Changes{background:var(--red);}
    .notes{margin-top:8px;display:grid;gap:4px;}
    .note{border-radius:6px;padding:6px;font-size:12px;}
    .note.agent{background:var(--blue);}
    .note.human{background:var(--green);}
    .actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center;}
    button,select,input,textarea{background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:6px;font-size:13px;}
    button{padding:4px 8px;cursor:pointer;}
    button:hover{background:var(--bg3);}
    button.danger{color:#f85149;}
    button.danger:hover{background:rgba(248,81,73,.12);}
    button.primary{background:var(--accent);color:#fff;border-color:transparent;}
    button.primary:hover{opacity:.88;}
    select{padding:3px 6px;width:100%;margin-top:6px;}
    textarea,input{width:100%;padding:6px;}
    .section-content{border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg2);}
    .section-content h3{margin:0 0 8px;font-size:14px;}
    .field-row{margin-top:8px;display:grid;gap:6px;}
    .field-row .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px;}
    .add-field{border:1px dashed var(--border);border-radius:8px;padding:10px;margin-top:14px;background:transparent;}
    .add-field-title{font-weight:600;font-size:13px;}
    .add-field-help{font-size:12px;color:var(--muted);margin:2px 0 6px;line-height:1.45;}
    .feed-item{border-bottom:1px solid var(--border);padding:8px 0;}
    .feed-item:last-child{border-bottom:0;}
    .mono{font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;}
    .diff{white-space:pre-wrap;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px;margin-top:6px;font-family:var(--font-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;}
    .guide-hint{margin-top:8px;padding:6px 8px;background:var(--accent-bg);border-left:3px solid var(--accent);border-radius:0 6px 6px 0;font-size:12px;color:var(--muted);}
    .ai-row{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;}
    button.ai-btn{background:var(--accent-bg);border-color:var(--accent);color:var(--accent);font-weight:600;}
    button.ai-btn:hover{background:var(--accent);color:#fff;}
    .ai-badge{font-size:11px;padding:2px 8px;border-radius:999px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent);}
    .ai-tip-wrap{position:relative;display:inline-flex;align-items:center;gap:5px;}
    .ai-info{color:var(--muted);font-size:12px;cursor:help;line-height:1;}
    .ai-tip-bubble{visibility:hidden;opacity:0;position:absolute;bottom:calc(100% + 8px);left:0;width:250px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.45;font-weight:400;text-align:left;box-shadow:0 6px 20px rgba(0,0,0,.28);z-index:60;transition:opacity .12s ease;pointer-events:none;}
    .ai-tip-wrap:hover .ai-tip-bubble,.ai-tip-wrap:focus-within .ai-tip-bubble{visibility:visible;opacity:1;}
    /* Content tab — redesigned */
    .content-intro{font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.5;}
    .sec-card{border:1px solid var(--border);border-radius:10px;margin-bottom:16px;background:var(--bg2);overflow:hidden;}
    .sec-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;background:var(--bg3);border-bottom:1px solid var(--border);}
    .sec-card-head .sec-title{font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:7px;}
    .sec-card-body{padding:14px;display:grid;gap:14px;}
    .sec-fields{display:grid;gap:10px;}
    .fld{border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--bg);}
    .fld-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:flex;align-items:center;gap:6px;margin-bottom:6px;}
    .fld-label .req{color:#f85149;font-weight:700;}
    .fld-meta{font-size:10px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:1px 7px;text-transform:none;letter-spacing:0;}
    .fld textarea{width:100%;padding:7px;resize:vertical;}
    .fld textarea.is-sample{color:var(--muted);font-style:italic;}
    .fld-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:8px;}
    .btn-compact{width:auto;padding:5px 14px;}
    .btn-compact.ghost{background:transparent;border:1px solid var(--border);color:var(--muted);}
    .btn-compact.ghost:hover{border-color:var(--muted);color:var(--text);}
    .empty-fields{font-size:12px;color:var(--muted);padding:12px;border:1px dashed var(--border);border-radius:8px;text-align:center;}
    .ai-assist{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--accent);border-radius:8px;background:var(--accent-bg);flex-wrap:wrap;}
    .ai-assist .ai-label{font-weight:600;font-size:13px;color:var(--accent);display:inline-flex;align-items:center;gap:6px;}
    .ai-assist .ai-state{font-size:11px;color:var(--muted);margin-left:auto;}
    .switch{position:relative;display:inline-block;width:38px;height:21px;flex:none;}
    .switch input{position:absolute;opacity:0;width:0;height:0;}
    .switch .track{position:absolute;inset:0;background:var(--border);border-radius:999px;transition:.18s;cursor:pointer;}
    .switch .track::before{content:"";position:absolute;height:15px;width:15px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.18s;}
    .switch input:checked + .track{background:var(--accent);}
    .switch input:checked + .track::before{transform:translateX(17px);}
    .switch input:focus-visible + .track{box-shadow:0 0 0 3px var(--accent-bg);}
    details.addfld{border:1px dashed var(--border);border-radius:8px;background:transparent;}
    details.addfld > summary{cursor:pointer;list-style:none;padding:9px 12px;font-weight:600;font-size:13px;color:var(--accent);display:inline-flex;align-items:center;gap:6px;}
    details.addfld > summary::-webkit-details-marker{display:none;}
    details.addfld > summary::marker{content:"";}
    details.addfld[open] > summary{border-bottom:1px dashed var(--border);}
    .addfld-inner{padding:12px;display:grid;gap:10px;}
    .addfld-inner .hint{font-size:12px;color:var(--muted);margin:0;line-height:1.45;}
    .addfld-inner .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px;}
    .addfld-actions{display:flex;gap:8px;}
    .addfld-actions button{width:auto;}
    .sec-head-right{display:inline-flex;align-items:center;gap:8px;}
    .sec-remove{width:auto;background:transparent;border:1px solid var(--border);color:var(--muted);font-size:11px;padding:3px 9px;}
    .sec-remove:hover{border-color:#f85149;color:#f85149;}
    details.addsec{border:1px dashed var(--border);border-radius:10px;background:transparent;margin-top:4px;}
    details.addsec > summary{cursor:pointer;list-style:none;padding:11px 14px;font-weight:600;font-size:13px;color:var(--accent);display:inline-flex;align-items:center;gap:6px;}
    details.addsec > summary::-webkit-details-marker{display:none;}
    details.addsec > summary::marker{content:"";}
    details.addsec[open] > summary{border-bottom:1px dashed var(--border);}
    .addsec-inner{padding:14px;display:grid;gap:10px;}
    .addsec-inner .hint{font-size:12px;color:var(--muted);margin:0;line-height:1.45;}
    .addsec-row{display:flex;gap:10px;align-items:flex-end;}
    .addsec-row .grow{flex:1;}
    .addsec-row .icon-col{width:80px;flex:none;}
    .addsec-row input{width:100%;}
    .addsec-inner .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px;}
    .addsec-actions{display:flex;}
    .addsec-actions button{width:auto;}
    .milestone-item{border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg2);}
    .milestone-item h4{margin:0 0 4px;font-size:13px;}
    .new-section-form summary{cursor:pointer;padding:6px 0;font-size:13px;color:var(--accent);list-style:none;}
    .new-section-form summary::-webkit-details-marker{display:none;}
    .new-section-form summary::before{content:"+ ";}
    .new-section-inputs{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
    .new-section-inputs input{flex:1;min-width:120px;}
    .new-section-inputs .icon-input{max-width:70px;flex:none;}
    .progress-toolbar{display:flex;justify-content:flex-end;margin-bottom:8px;}
    .toolbar{display:flex;justify-content:flex-end;margin-bottom:10px;}
    hr.sep{border:none;border-top:1px solid var(--border);margin:12px 0;}
    .overall{margin:0 0 14px;}
    .overall-top{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:5px;}
    .overall .bar{height:7px;border-radius:999px;background:var(--border);overflow:hidden;}
    .overall .bar-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .25s;}
    .fill-chip{font-size:11px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:1px 8px;}
    .fill-chip.complete{color:var(--accent);border-color:var(--accent);}
    .fld-status{margin-left:auto;font-size:11px;color:var(--muted);min-height:13px;font-weight:400;text-transform:none;letter-spacing:0;}
    .fld-status.dirty{color:#d29922;}
    .fld textarea.dirty{border-color:#d29922;}
    .ready-row{display:flex;justify-content:flex-end;}
    .ready-btn{width:auto;background:var(--accent);color:#fff;}
    .toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(12px);background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:9px 16px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:50;max-width:80%;}
    .toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
    .toast.ok{border-color:var(--accent);}
    .toast.error{border-color:#f85149;}
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div class="header-left">
        <h1 class="title">🎨 Site Studio</h1>
        <div class="meta" id="meta">Loading…</div>
      </div>
      <div class="header-actions">
        <button id="theme-btn" title="Toggle light/dark theme" onclick="toggleTheme()">☀️</button>
        <button class="danger" onclick="confirmReset()" title="Reset all sections to blank">↺ Reset</button>
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="progress">📋 Progress</button>
      <button class="tab" data-tab="content">📝 Content</button>
      <button class="tab" data-tab="changes">🔄 Changes</button>
    </div>
    <section id="progress" class="panel active"></section>
    <section id="content" class="panel"></section>
    <section id="changes" class="panel"></section>
  </div>
<script>
  const STATUS_ORDER = ${JSON.stringify(STATUS_ORDER)};
  const TEMPLATE_PACKS = ${JSON.stringify(TEMPLATE_PACK_OPTIONS)};
  let state = null;
  const instanceId = ${JSON.stringify(instanceId)};
  let openNoteEditorSectionId = null;

  // ── Theme ──────────────────────────────────────────────────────────────────
  (function initTheme() {
    const saved = localStorage.getItem('scc-theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
  })();

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('scc-theme', next);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  }

  // ── Utilities ───────────────────────────────────────────────────────────────
  const byId = id => document.getElementById(id);
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const isSampleVal = v => /^\\[sample:/i.test(String(v ?? '').trim());
  const fieldIsFilled = v => { const s = String(v ?? '').trim(); return s !== '' && !isSampleVal(s); };

  let toastTimer = null;
  function showToast(message, kind) {
    let el = byId('scc-toast');
    if (!el) { el = document.createElement('div'); el.id = 'scc-toast'; document.body.appendChild(el); }
    el.textContent = message;
    el.className = 'toast show ' + (kind === 'error' ? 'error' : 'ok');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 2200);
  }

  async function saveField(sectionId, field, value) {
    await api('/api/update-content', { sectionId, field, value, mark: 'draft' });
    showToast('Saved ✓');
  }

  async function api(path, body) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed: ' + res.status);
    }
    return res.json();
  }

  // ── Renderers ───────────────────────────────────────────────────────────────
  function renderMeta() {
    byId('meta').textContent = 'Branch: ' + (state?.branch || 'unknown') + ' • ' + (state?.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : '');
  }

  function renderProgress() {
    const panel = byId('progress');
    const grouped = new Map(STATUS_ORDER.map(s => [s, []]));
    for (const section of state.sections) {
      if (!grouped.has(section.status)) grouped.set(section.status, []);
      grouped.get(section.status).push(section);
    }

    const templateSelect = '<div class="actions" style="margin:0 0 8px 0">' +
      '<select id="template-pack-select" style="max-width:260px">' +
      TEMPLATE_PACKS.map(p => '<option value="' + esc(p.id) + '"' + (state.templatePackId === p.id ? ' selected' : '') + '>' + esc(p.label) + '</option>').join('') +
      '</select>' +
      '<button class="primary" data-action="apply_template_pack">Apply Template</button>' +
      '</div>';
    const newForm = '<details class="new-section-form"><summary>New Section</summary>' +
      '<div class="new-section-inputs">' +
      '<input id="new-section-name" placeholder="Section name (e.g. Skills)" />' +
      '<input id="new-section-icon" class="icon-input" placeholder="Icon 🛠️" maxlength="4" />' +
      '<button class="primary" data-action="create_section">Create</button>' +
      '</div></details>';

    const grid = '<div class="grid">' + STATUS_ORDER.map(status => {
      const cards = (grouped.get(status) || []).map(section => {
        const cls = 's-' + section.status.replaceAll(' ', '-');
        const notes = section.notes.slice(-3).map(n =>
          '<div class="note ' + n.author + '">' + esc(n.author === 'agent' ? '🤖 ' : '🧑 ') + esc(n.text) + '</div>'
        ).join('');
        const noteEditor = openNoteEditorSectionId === section.id
          ? '<div class="field-row"><textarea rows="2" data-note-input="' + esc(section.id) + '" placeholder="Add note..."></textarea>' +
            '<div class="actions"><button data-action="save_note" data-id="' + esc(section.id) + '">Save</button>' +
            '<button data-action="cancel_note" data-id="' + esc(section.id) + '">Cancel</button></div></div>'
          : '';
        const approveButtons = section.status === 'Review'
          ? '<div class="actions"><button class="primary" data-action="approve" data-id="' + esc(section.id) + '">Approve ✓</button>' +
            '<button class="danger" data-action="request_changes" data-id="' + esc(section.id) + '">Request Changes</button></div>'
          : '';
        const statusOpts = STATUS_ORDER.map(s => '<option value="' + esc(s) + '"' + (s === section.status ? ' selected' : '') + '>' + esc(s) + '</option>').join('');
        return '<article class="card">' +
          '<div style="display:flex;justify-content:space-between;align-items:start">' +
          '<strong>' + esc(section.icon) + ' ' + esc(section.name) + '</strong>' +
          '<button class="danger" style="padding:2px 5px;font-size:11px" data-action="delete_section" data-id="' + esc(section.id) + '" title="Delete section">✕</button>' +
          '</div>' +
          '<div style="margin-top:4px"><span class="status-pill ' + cls + '">' + esc(section.status) + '</span></div>' +
          '<select data-action="update_status" data-id="' + esc(section.id) + '">' + statusOpts + '</select>' +
          '<div class="notes">' + notes + '</div>' +
          '<div class="actions"><button data-action="add_note" data-id="' + esc(section.id) + '">Add note</button></div>' +
          noteEditor + approveButtons +
          '<div class="meta" style="margin-top:6px;font-size:11px">Modified: ' + esc((section.lastModified || '').slice(0,19).replace('T',' ')) + '</div>' +
          '</article>';
      }).join('');
      return '<div class="column"><h3>' + esc(status) + '</h3>' +
        (cards || '<div class="meta" style="font-size:12px">No sections</div>') + '</div>';
    }).join('') + '</div>';

    panel.innerHTML = templateSelect + '<div class="progress-toolbar">' + newForm + '</div>' + grid;
  }

  function renderContent() {
    const panel = byId('content');

    const drafts = {};
    panel.querySelectorAll('textarea.fld-text').forEach(t => {
      const saved = t.dataset.saved ?? '';
      if (t.value !== saved) drafts[t.dataset.section + '|' + t.dataset.field] = t.value;
    });
    const act = document.activeElement;
    let focusKey = null, selStart = 0, selEnd = 0;
    if (act && act.classList && act.classList.contains('fld-text')) {
      focusKey = act.dataset.section + '|' + act.dataset.field;
      selStart = act.selectionStart; selEnd = act.selectionEnd;
    }

    const copyBtn = '<div class="toolbar"><button class="primary" id="copy-md-btn" data-action="copy_markdown">📋 Copy as Markdown</button></div>';

    const proposals = state.contentProposals.filter(p => p.status === 'pending').map(p =>
      '<article class="section-content"><div><strong>Proposal: ' + esc(p.sectionId) + '.' + esc(p.field) + '</strong></div>' +
      '<div class="meta">' + esc(p.reason) + '</div>' +
      '<div class="diff">' + esc(p.diff || '') + '</div>' +
      '<div class="actions">' +
      '<button class="primary" data-action="proposal_accept" data-proposal="' + esc(p.id) + '">Accept</button>' +
      '<button class="danger" data-action="proposal_reject" data-proposal="' + esc(p.id) + '">Reject</button>' +
      '</div></article>'
    ).join('');

    const editors = state.sections.map(section => {
      const suggestions = state.fieldSuggestions?.[section.id] || [];
      const fieldSchemas = state.sectionSchemas?.[section.id] || {};
      const isSample = v => isSampleVal(v);
      const missing = suggestions.map(s => s.field).filter(f => { const v = String(section.content?.[f] || '').trim(); return !v || isSample(v); });
      const nextPrompt = suggestions.find(s => missing.includes(s.field))?.prompt;
      const hint = nextPrompt ? '<div class="guide-hint">💬 Next: ' + esc(nextPrompt) + '</div>' : '';

      const fieldCards = Object.entries(section.content || {}).map(([field, value]) => {
        const schema = fieldSchemas[field] || {};
        const tags = [];
        if (schema.type) tags.push(esc(schema.type));
        if (schema.maxLength) tags.push('max ' + esc(schema.maxLength));
        const metaTag = tags.length ? '<span class="fld-meta">' + tags.join(' · ') + '</span>' : '';
        const reqTag = schema.required ? '<span class="req" title="Required">*</span>' : '';
        const sampleCls = isSample(value) ? ' is-sample' : '';
        return '<div class="fld">' +
          '<div class="fld-label">' + esc(field) + reqTag + metaTag + '<span class="fld-status"></span></div>' +
          '<textarea rows="3" class="fld-text' + sampleCls + '" data-field="' + esc(field) + '" data-section="' + esc(section.id) + '" data-saved="' + esc(value) + '">' + esc(value) + '</textarea>' +
          '<div class="fld-actions">' +
          '<button class="btn-compact ghost" data-action="delete_content" data-section="' + esc(section.id) + '" data-field="' + esc(field) + '">Remove</button>' +
          '</div>' +
          '</div>';
      }).join('');

      const fieldNames = Object.keys(section.content || {});
      const filledCount = fieldNames.filter(f => fieldIsFilled(section.content[f])).length;
      const totalCount = fieldNames.length;
      const fillChip = totalCount ? '<span class="fill-chip' + (filledCount === totalCount ? ' complete' : '') + '">' + filledCount + ' / ' + totalCount + ' filled</span>' : '';
      const requiredNames = fieldNames.filter(f => fieldSchemas[f]?.required);
      const requiredOk = requiredNames.every(f => fieldIsFilled(section.content[f]));
      const reviewable = totalCount > 0 && filledCount > 0 && (requiredNames.length ? requiredOk : filledCount === totalCount) && section.status !== 'Review' && section.status !== 'Approved';
      const readyRow = reviewable ? '<div class="ready-row"><button class="btn-compact ready-btn" data-action="mark_review" data-id="' + esc(section.id) + '">Mark ready for review →</button></div>' : '';

      const fieldsBlock = fieldCards
        ? '<div class="sec-fields">' + fieldCards + '</div>'
        : '<div class="empty-fields">No fields yet. Turn on Generate with AI above, or add a field below.</div>';

      const aiTip = 'If this section already has content, the AI uses it as the foundation. If the fields are empty, Copilot infers the best temporary placeholder text — which you can edit afterward.';
      const aiStateText = section.aiRequested ? '⏳ Requested — ask Copilot to generate' : 'Off';
      const aiAssist = '<div class="ai-assist">' +
        '<span class="ai-tip-wrap">' +
        '<span class="ai-label">✨ Generate with AI</span>' +
        '<span class="ai-info" role="img" tabindex="0" aria-label="' + esc(aiTip) + '">ⓘ</span>' +
        '<span class="ai-tip-bubble" role="tooltip">' + esc(aiTip) + '</span>' +
        '</span>' +
        '<label class="switch" title="' + esc(aiTip) + '">' +
        '<input type="checkbox" data-action="ai_toggle" data-section="' + esc(section.id) + '"' + (section.aiRequested ? ' checked' : '') + ' aria-label="Generate ' + esc(section.name) + ' content with AI" />' +
        '<span class="track"></span></label>' +
        '<span class="ai-state">' + esc(aiStateText) + '</span>' +
        '</div>';

      const addField = '<details class="addfld"><summary>➕ Add field to ' + esc(section.name) + '</summary>' +
        '<div class="addfld-inner">' +
        '<p class="hint">Create your own labeled field for ' + esc(section.name) + ' (for example: Tagline, CTA Text). The value is optional and saved as a draft you can edit anytime.</p>' +
        '<label><span class="label">Field name</span>' +
        '<input placeholder="e.g. Tagline" data-action="new_field_name" data-section="' + esc(section.id) + '" /></label>' +
        '<label><span class="label">Field value (optional)</span>' +
        '<textarea rows="2" placeholder="e.g. Build faster with AI" data-action="new_field_value" data-section="' + esc(section.id) + '"></textarea></label>' +
        '<div class="addfld-actions"><button class="primary" data-action="add_field" data-section="' + esc(section.id) + '">Add field</button></div>' +
        '</div></details>';

      const cls = 's-' + section.status.replaceAll(' ', '-');
      return '<article class="sec-card">' +
        '<div class="sec-card-head">' +
        '<span class="sec-title">' + esc(section.icon) + ' ' + esc(section.name) + '</span>' +
        '<span class="sec-head-right">' +
        fillChip +
        '<span class="status-pill ' + cls + '">' + esc(section.status) + '</span>' +
        '<button class="sec-remove" data-action="delete_section" data-id="' + esc(section.id) + '" data-name="' + esc(section.name) + '" title="Remove this section">✕ Remove</button>' +
        '</span>' +
        '</div>' +
        '<div class="sec-card-body">' +
        hint +
        aiAssist +
        fieldsBlock +
        addField +
        readyRow +
        '</div></article>';
    }).join('');

    const addSection = '<details class="addsec"><summary>➕ Add a section</summary>' +
      '<div class="addsec-inner">' +
      '<p class="hint">Create a new section for your site (for example: Testimonials, FAQ, Pricing). It starts empty so you can add your own fields.</p>' +
      '<div class="addsec-row">' +
      '<label class="grow"><span class="label">Section name</span>' +
      '<input placeholder="e.g. Testimonials" data-action="cs_name" /></label>' +
      '<label class="icon-col"><span class="label">Icon</span>' +
      '<input placeholder="💬" maxlength="4" data-action="cs_icon" /></label>' +
      '</div>' +
      '<div class="addsec-actions"><button class="primary" data-action="create_section_inline">Add section</button></div>' +
      '</div></details>';

    let totFilled = 0, totAll = 0;
    state.sections.forEach(s => {
      const fn = Object.keys(s.content || {});
      totAll += fn.length;
      totFilled += fn.filter(f => fieldIsFilled(s.content[f])).length;
    });
    const pct = totAll ? Math.round(totFilled / totAll * 100) : 0;
    const overall = '<div class="overall"><div class="overall-top"><span>📊 Content progress</span><span>' + totFilled + ' / ' + totAll + ' fields filled · ' + pct + '%</span></div><div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';

    panel.innerHTML = copyBtn +
      '<p class="content-intro">Fill in content for each section below. Edits save automatically when you click away — the <strong>Unsaved</strong> tag clears once saved. Flip <strong>✨ Generate with AI</strong> to queue an AI draft, or use <strong>➕ Add field</strong> to capture your own. When a section is filled in, use <strong>Mark ready for review</strong> to move it forward.</p>' +
      overall +
      (proposals ? '<h3>Pending proposals</h3>' + proposals : '') + editors + addSection;

    panel.querySelectorAll('textarea.fld-text').forEach(t => {
      const k = t.dataset.section + '|' + t.dataset.field;
      if (Object.prototype.hasOwnProperty.call(drafts, k)) {
        t.value = drafts[k];
        t.classList.add('dirty');
        t.classList.remove('is-sample');
        const st = t.closest('.fld') && t.closest('.fld').querySelector('.fld-status');
        if (st) { st.textContent = 'Unsaved'; st.classList.add('dirty'); }
      }
    });
    if (focusKey) {
      const bar = focusKey.indexOf('|');
      const sec = focusKey.slice(0, bar), fld = focusKey.slice(bar + 1);
      const escAttr = v => (window.CSS && CSS.escape) ? CSS.escape(v) : v;
      const el = panel.querySelector('textarea.fld-text[data-section="' + escAttr(sec) + '"][data-field="' + escAttr(fld) + '"]');
      if (el) { el.focus(); try { el.setSelectionRange(selStart, selEnd); } catch(e) {} }
    }
  }

  function renderChanges() {
    const panel = byId('changes');
    let html = '';

    const milestones = state.milestones || [];
    if (milestones.length) {
      html += '<h3 style="margin-top:0">🏆 Milestones</h3>';
      html += milestones.map(m =>
        '<div class="milestone-item"><h4>🏆 ' + esc(m.title) + '</h4>' +
        '<div class="meta" style="margin-bottom:4px">' + esc((m.timestamp || '').slice(0,19).replace('T',' ')) + '</div>' +
        '<div>' + esc(m.description) + '</div>' +
        (m.sectionsAffected?.length ? '<div class="meta" style="margin-top:4px">Sections: ' + esc(m.sectionsAffected.join(', ')) + '</div>' : '') +
        '</div>'
      ).join('');
      html += '<hr class="sep" />';
    }

    html += '<h3 style="margin-top:0">Changes</h3>';
    const rows = state.changeLog.map(entry => {
      const path = entry.path ? '<div class="mono">' + esc(entry.path) + '</div>' : '';
      return '<div class="feed-item"><div><strong>' + esc(entry.type) + '</strong> &bull; <span class="meta">' +
        esc((entry.timestamp || '').slice(0,19).replace('T',' ')) + '</span></div>' +
        path + '<div>' + esc(entry.summary) + '</div></div>';
    }).join('');
    html += rows || '<div class="meta">No changes yet.</div>';
    panel.innerHTML = html;
  }

  function renderAll() {
    if (!state) return;
    renderMeta();
    renderProgress();
    renderContent();
    renderChanges();
  }

  async function refreshState() {
    const res = await fetch('/api/state');
    state = await res.json();
    renderAll();
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  function copyMarkdown() {
    if (!state) return;
    const lines = ['# Site Content Draft', ''];
    for (const section of state.sections) {
      lines.push('## ' + section.icon + ' ' + section.name + ' (' + section.status + ')');
      const entries = Object.entries(section.content || {});
      if (entries.length) {
        for (const [field, value] of entries) {
          lines.push('', '### ' + field, value);
        }
      } else {
        lines.push('_No content yet._');
      }
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\\n')).then(() => {
      const btn = byId('copy-md-btn');
      if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy as Markdown'; }, 2000); }
    }).catch(() => showToast('Clipboard not available.', 'error'));
  }

  async function confirmReset() {
    if (!confirm('Reset all sections to blank state? This cannot be undone.')) return;
    try { await api('/api/reset-state', {}); } catch(e) { showToast(e.message, 'error'); }
  }

  // ── Event delegation ─────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      byId(btn.dataset.tab).classList.add('active');
    });
  });

  // Mark a content field dirty as the user types, and shed the sample styling.
  document.body.addEventListener('input', event => {
    const t = event.target.closest && event.target.closest('textarea.fld-text');
    if (!t) return;
    const dirty = t.value !== (t.dataset.saved ?? '');
    t.classList.toggle('dirty', dirty);
    if (!isSampleVal(t.value)) t.classList.remove('is-sample');
    const st = t.closest('.fld') && t.closest('.fld').querySelector('.fld-status');
    if (st) { st.textContent = dirty ? 'Unsaved' : ''; st.classList.toggle('dirty', dirty); }
  });

  // Select sample placeholder text on focus so typing replaces it.
  document.body.addEventListener('focusin', event => {
    const t = event.target.closest && event.target.closest('textarea.fld-text');
    if (!t) return;
    if (isSampleVal(t.value)) { try { t.select(); } catch(e) {} }
  });

  // Auto-save a content field when the user clicks away, if it changed.
  // Only mark the field saved after the server accepts it, so a rejected
  // value stays dirty and is preserved across the next SSE re-render.
  document.body.addEventListener('focusout', async event => {
    const t = event.target.closest && event.target.closest('textarea.fld-text');
    if (!t) return;
    if (t.value === (t.dataset.saved ?? '')) return;
    const sectionId = t.dataset.section, field = t.dataset.field, value = t.value;
    try {
      await saveField(sectionId, field, value);
      t.dataset.saved = value;
      t.classList.remove('dirty');
      const st = t.closest('.fld') && t.closest('.fld').querySelector('.fld-status');
      if (st) { st.textContent = ''; st.classList.remove('dirty'); }
    } catch(e) { showToast(e.message, 'error'); }
  });

  document.body.addEventListener('change', async event => {
    const sel = event.target.closest('select[data-action="update_status"]');
    if (sel) {
      try { await api('/api/update-status', { sectionId: sel.dataset.id, status: sel.value }); }
      catch(e) { showToast(e.message, 'error'); }
      return;
    }
    const toggle = event.target.closest('input[data-action="ai_toggle"]');
    if (toggle) {
      try { await api('/api/request-generation', { sectionId: toggle.dataset.section, requested: toggle.checked }); }
      catch(e) { showToast(e.message, 'error'); }
      return;
    }
  });

  document.body.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === 'copy_markdown') {
        copyMarkdown();
      } else if (action === 'approve') {
        await api('/api/approve-section', { sectionId: button.dataset.id });
      } else if (action === 'request_changes') {
        const note = prompt('What should change?');
        if (note) await api('/api/request-changes', { sectionId: button.dataset.id, note });
      } else if (action === 'add_note') {
        openNoteEditorSectionId = button.dataset.id || null;
        renderProgress();
      } else if (action === 'cancel_note') {
        openNoteEditorSectionId = null;
        renderProgress();
      } else if (action === 'save_note') {
        const sectionId = button.dataset.id;
        const textarea = document.querySelector('textarea[data-note-input="' + sectionId + '"]');
        const note = (textarea?.value || '').trim();
        if (!note) throw new Error('Note cannot be empty.');
        await api('/api/add-human-note', { sectionId, text: note });
        openNoteEditorSectionId = null;
      } else if (action === 'proposal_accept' || action === 'proposal_reject') {
        await api('/api/proposal-decision', { proposalId: button.dataset.proposal, decision: action === 'proposal_accept' ? 'accepted' : 'rejected' });
      } else if (action === 'delete_content') {
        if (!confirm('Remove the "' + button.dataset.field + '" field from this section?')) return;
        await api('/api/delete-content', { sectionId: button.dataset.section, field: button.dataset.field });
      } else if (action === 'add_field') {
        const sectionId = button.dataset.section;
        const nameEl = document.querySelector('input[data-action="new_field_name"][data-section="' + sectionId + '"]');
        const name = nameEl?.value?.trim();
        const value = document.querySelector('textarea[data-action="new_field_value"][data-section="' + sectionId + '"]')?.value || '';
        if (!name) { if (nameEl) nameEl.focus(); throw new Error('Enter a field name first (for example: Tagline), then click Add field.'); }
        await api('/api/update-content', { sectionId, field: name, value, mark: 'draft' });
      } else if (action === 'apply_template_pack') {
        const packId = byId('template-pack-select')?.value;
        if (!packId) throw new Error('Template pack is required.');
        if (!confirm('Apply selected template pack? This resets current sections/content.')) return;
        await api('/api/apply-template-pack', { templatePackId: packId });
      } else if (action === 'create_section') {
        const name = byId('new-section-name')?.value?.trim();
        const icon = byId('new-section-icon')?.value?.trim() || '📄';
        if (!name) throw new Error('Section name is required.');
        await api('/api/create-section', { name, icon });
      } else if (action === 'create_section_inline') {
        const nameEl = document.querySelector('input[data-action="cs_name"]');
        const name = nameEl?.value?.trim();
        const icon = document.querySelector('input[data-action="cs_icon"]')?.value?.trim() || '📄';
        if (!name) { if (nameEl) nameEl.focus(); throw new Error('Enter a section name first (for example: Testimonials), then click Add section.'); }
        await api('/api/create-section', { name, icon });
      } else if (action === 'delete_section') {
        const label = button.dataset.name || button.dataset.id;
        if (!confirm('Remove the "' + label + '" section and all its content? This cannot be undone.')) return;
        await api('/api/delete-section', { sectionId: button.dataset.id });
      } else if (action === 'mark_review') {
        await api('/api/update-status', { sectionId: button.dataset.id, status: 'Review' });
        showToast('Moved to Review');
      }
    } catch(error) {
      showToast(error.message, 'error');
    }
  });

  const source = new EventSource('/events');
  source.addEventListener('state_update', event => {
    state = JSON.parse(event.data);
    renderAll();
  });

  refreshState().catch(e => showToast(e.message, 'error'));
</script>
</body>
</html>`;
}

async function handleApi(req, res, instanceId) {
    await loadState();
    const { pathname } = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && pathname === "/api/state") {
        return sendJson(res, 200, stateCache);
    }
    if (req.method === "GET" && pathname === "/events") {
        const entry = servers.get(instanceId);
        if (!entry) {
            return sendJson(res, 404, { error: "Canvas instance is not available." });
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.write("event: state_update\n");
        res.write(`data: ${JSON.stringify(stateCache)}\n\n`);
        entry.clients.add(res);
        req.on("close", () => entry.clients.delete(res));
        return;
    }
    if (req.method === "GET" && pathname === "/") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml(instanceId));
        return;
    }
    if (req.method !== "POST" || !pathname.startsWith("/api/")) {
        sendJson(res, 404, { error: "Not found" });
        return;
    }

    try {
        const body = await readBodyJson(req);
        const payload = await mutateState(() => {
            if (pathname === "/api/approve-section") {
                const section = updateSectionStatus(body.sectionId, "Approved", "Approved by human reviewer.", "human");
                return { section };
            }
            if (pathname === "/api/request-changes") {
                const section = updateSectionStatus(body.sectionId, "Needs Changes", body.note || "Changes requested by human reviewer.", "human");
                return { section };
            }
            if (pathname === "/api/add-human-note") {
                const note = addNote(body.sectionId, body.text, "human");
                return { note };
            }
            if (pathname === "/api/reorder-sections") {
                const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id) => typeof id === "string") : [];
                const existing = new Map(stateCache.sections.map((section) => [section.id, section]));
                const reordered = [];
                for (const id of orderedIds) {
                    const section = existing.get(id);
                    if (section) {
                        reordered.push(section);
                        existing.delete(id);
                    }
                }
                for (const section of existing.values()) {
                    reordered.push(section);
                }
                stateCache.sections = reordered;
                stateCache.lastUpdated = nowIso();
                addChange({ type: "status_change", summary: "Section order updated by human.", timestamp: stateCache.lastUpdated });
                return { sections: stateCache.sections };
            }
            if (pathname === "/api/update-content") {
                return upsertSectionContent(body.sectionId, body.field, body.value, safeString(body.mark, "draft"), "human");
            }
            if (pathname === "/api/delete-content") {
                return deleteSectionContent(safeString(body.sectionId), safeString(body.field), "human");
            }
            if (pathname === "/api/request-generation") {
                const section = findSectionOrThrow(safeString(body.sectionId));
                const requested = body.requested === undefined ? true : Boolean(body.requested);
                section.aiRequested = requested;
                section.aiRequestedAt = requested ? nowIso() : null;
                section.lastModified = nowIso();
                stateCache.lastUpdated = section.lastModified;
                addChange({
                    type: "ai_request",
                    summary: requested ? `AI draft requested for ${section.name}.` : `AI draft request cleared for ${section.name}.`,
                    timestamp: section.lastModified,
                    sectionId: section.id,
                });
                addNote(section.id, requested ? "Turned on AI generate — ask Copilot to draft this section from existing details." : "Turned off AI generate for this section.", "human");
                return { sectionId: section.id, aiRequested: requested };
            }
            if (pathname === "/api/proposal-decision") {
                const proposal = stateCache.contentProposals.find((item) => item.id === body.proposalId);
                if (!proposal) {
                    throw new CanvasError("proposal_not_found", `Unknown proposal: ${body.proposalId}`);
                }
                if (body.decision !== "accepted" && body.decision !== "rejected") {
                    throw new CanvasError("invalid_decision", "Decision must be accepted or rejected.");
                }
                proposal.status = body.decision;
                proposal.timestamp = nowIso();
                if (body.decision === "accepted") {
                    const section = findSectionOrThrow(proposal.sectionId);
                    section.content[proposal.field] = proposal.proposed;
                    section.lastModified = proposal.timestamp;
                }
                addChange({
                    type: "status_change",
                    summary: `Content proposal ${proposal.id} was ${proposal.status}.`,
                    timestamp: proposal.timestamp,
                    sectionId: proposal.sectionId,
                });
                return { proposal };
            }
            if (pathname === "/api/reset-state") {
                stateCache.sections = stateCache.sections.map(s => ({
                    ...s, status: "Not Started", notes: [], content: {}, filesChanged: [], aiRequested: false, aiRequestedAt: null, lastModified: nowIso(),
                }));
                stateCache.changeLog = [];
                stateCache.contentProposals = [];
                stateCache.milestones = [];
                stateCache.lastUpdated = nowIso();
                addChange({ type: "status_change", summary: "Board reset to blank state.", timestamp: stateCache.lastUpdated });
                return stateCache;
            }
            if (pathname === "/api/update-status") {
                const section = updateSectionStatus(safeString(body.sectionId), safeString(body.status), "", "human");
                return { section };
            }
            if (pathname === "/api/create-section") {
                const name = safeString(body.name).trim();
                if (!name) throw new CanvasError("invalid_name", "Section name is required.");
                const icon = safeString(body.icon, "📄").trim() || "📄";
                const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("section");
                if (stateCache.sections.find(s => s.id === id)) throw new CanvasError("duplicate_section", `Section "${id}" already exists.`);
                const section = { id, name, icon, status: "Not Started", notes: [], content: {}, filesChanged: [], lastModified: nowIso() };
                stateCache.sections.push(section);
                if (!stateCache.fieldSuggestions || typeof stateCache.fieldSuggestions !== "object") {
                    stateCache.fieldSuggestions = {};
                }
                if (!stateCache.sectionSchemas || typeof stateCache.sectionSchemas !== "object") {
                    stateCache.sectionSchemas = {};
                }
                stateCache.fieldSuggestions[id] = stateCache.fieldSuggestions[id] || [];
                stateCache.sectionSchemas[id] = stateCache.sectionSchemas[id] || {};
                stateCache.lastUpdated = section.lastModified;
                addChange({ type: "status_change", summary: `Section "${name}" created.`, timestamp: section.lastModified });
                return { section };
            }
            if (pathname === "/api/delete-section") {
                const sectionId = safeString(body.sectionId);
                const idx = stateCache.sections.findIndex(s => s.id === sectionId);
                if (idx === -1) throw new CanvasError("section_not_found", `Unknown section: ${sectionId}`);
                const [removed] = stateCache.sections.splice(idx, 1);
                if (stateCache.fieldSuggestions && typeof stateCache.fieldSuggestions === "object") {
                    delete stateCache.fieldSuggestions[sectionId];
                }
                if (stateCache.sectionSchemas && typeof stateCache.sectionSchemas === "object") {
                    delete stateCache.sectionSchemas[sectionId];
                }
                stateCache.contentProposals = stateCache.contentProposals.filter((p) => p.sectionId !== sectionId);
                stateCache.lastUpdated = nowIso();
                addChange({ type: "status_change", summary: `Section "${removed.name}" deleted.`, timestamp: stateCache.lastUpdated });
                return { deleted: sectionId };
            }
            if (pathname === "/api/apply-template-pack") {
                return applyTemplatePack(safeString(body.templatePackId), "human");
            }
            throw new CanvasError("unknown_route", `Unknown route: ${pathname}`);
        });
        sendJson(res, 200, payload);
    } catch (error) {
        const code = error instanceof CanvasError ? error.code : "internal_error";
        const message = error instanceof Error ? error.message : "Unexpected error";
        sendJson(res, 400, { error: message, code });
    }
}

async function startServer(instanceId) {
    const clients = new Set();
    const server = createServer((req, res) => {
        handleApi(req, res, instanceId);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, clients, url: `http://127.0.0.1:${port}/` };
}

function summarizeProgress() {
    const approved = stateCache.sections.filter((section) => section.status === "Approved").length;
    return `${approved}/${stateCache.sections.length} approved`;
}

const session = await joinSession({
    hooks: {
        onSessionStart: async () => ({ additionalContext: INTERACTIVE_FILL_CONTEXT }),
        onUserPromptSubmitted: async (input) => {
            const prompt = safeString(input?.prompt).toLowerCase();
            const wantsAiGeneration =
                prompt.includes("generate with ai") ||
                prompt.includes("ai draft") ||
                prompt.includes("ai generate") ||
                prompt.includes("ai request") ||
                prompt.includes("ai-generate") ||
                (prompt.includes("generate") && prompt.includes("section"));
            if (wantsAiGeneration) {
                return { additionalContext: AI_GENERATION_CONTEXT };
            }
            const mentionsCanvas =
                prompt.includes("site studio") ||
                prompt.includes("design system") ||
                prompt.includes("interactive") ||
                prompt.includes("fill out") ||
                prompt.includes("fill in") ||
                prompt.includes("section content");
            if (!mentionsCanvas) {
                return;
            }
            const sectionId = detectSectionIdFromPrompt(prompt);
            const sectionHint = sectionId
                ? `Prioritize sectionId "${sectionId}" when calling get_section_guide and upsert_section_content.`
                : "If section is unclear, ask which section to draft before writing fields.";
            return {
                additionalContext: `${INTERACTIVE_FILL_CONTEXT}\n${sectionHint}`,
            };
        },
    },
    canvases: [
        createCanvas({
            id: "site-studio",
            displayName: "Site Studio",
            description:
                "Unified dashboard for planning and building a personal website. Track section progress, review live changes, provide content updates, and approve work.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
                properties: {
                    focusSectionId: { type: "string" },
                    initialTab: { type: "string", enum: ["progress", "content", "changes"] },
                },
            },
            actions: [
                {
                    name: "get_dashboard",
                    description: "Read the full dashboard state: sections, content proposals, milestones, and change feed.",
                    handler: async () => {
                        await loadState();
                        return stateCache;
                    },
                },
                {
                    name: "get_template_packs",
                    description: "List available template packs for personal website planning.",
                    handler: async () => ({
                        defaultTemplatePackId: DEFAULT_TEMPLATE_PACK,
                        templatePacks: TEMPLATE_PACK_OPTIONS,
                    }),
                },
                {
                    name: "apply_template_pack",
                    description: "Apply a template pack and reset sections/content to that template.",
                    inputSchema: {
                        type: "object",
                        required: ["templatePackId"],
                        additionalProperties: false,
                        properties: {
                            templatePackId: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        return mutateState(() => applyTemplatePack(safeString(ctx.input?.templatePackId), "agent"));
                    },
                },
                {
                    name: "get_section_guide",
                    description: "Get suggested fields and the next question to ask for interactive section content authoring.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const guide = await mutateState(() => getSectionGuide(safeString(ctx.input?.sectionId)));
                        return { guide };
                    },
                },
                {
                    name: "list_ai_requests",
                    description: "List sections that requested AI generation via the canvas '✨ Generate with AI' button, returning each request plus the full board content as grounding context.",
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        await loadState();
                        const requests = stateCache.sections
                            .filter((s) => s.aiRequested)
                            .map((s) => {
                                const suggested = getFieldSuggestionsForSection(s.id);
                                return {
                                    sectionId: s.id,
                                    sectionName: s.name,
                                    requestedAt: s.aiRequestedAt || null,
                                    currentContent: s.content || {},
                                    suggestedFields: suggested,
                                    missingFields: suggested
                                        .map((f) => f.field)
                                        .filter((f) => !safeString(s.content?.[f]).trim()),
                                };
                            });
                        const boardContext = stateCache.sections.map((s) => ({
                            sectionId: s.id,
                            sectionName: s.name,
                            status: s.status,
                            content: s.content || {},
                        }));
                        return { requests, boardContext };
                    },
                },
                {
                    name: "resolve_ai_request",
                    description: "Clear the AI-generation request flag for a section after its content has been drafted.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId"],
                        additionalProperties: false,
                        properties: { sectionId: { type: "string" } },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const sectionId = safeString(ctx.input?.sectionId);
                        return mutateState(() => {
                            const section = findSectionOrThrow(sectionId);
                            section.aiRequested = false;
                            section.aiRequestedAt = null;
                            section.lastModified = nowIso();
                            stateCache.lastUpdated = section.lastModified;
                            addChange({
                                type: "status_change",
                                summary: `AI draft completed for ${section.name}.`,
                                timestamp: section.lastModified,
                                sectionId: section.id,
                            });
                            return { sectionId: section.id, aiRequested: false };
                        });
                    },
                },
                {
                    name: "update_section_schema",
                    description: "Set or update validation schema for a specific section field.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "field"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            field: { type: "string" },
                            required: { type: "boolean" },
                            type: { type: "string", enum: ["text", "url", "email"] },
                            maxLength: { type: "number" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const sectionId = safeString(ctx.input?.sectionId);
                        const field = safeString(ctx.input?.field).trim();
                        if (!field) {
                            throw new CanvasError("invalid_field", "Field is required.");
                        }
                        findSectionOrThrow(sectionId);
                        const schema = await mutateState(() => {
                            if (!stateCache.sectionSchemas || typeof stateCache.sectionSchemas !== "object") {
                                stateCache.sectionSchemas = {};
                            }
                            if (!stateCache.sectionSchemas[sectionId] || typeof stateCache.sectionSchemas[sectionId] !== "object") {
                                stateCache.sectionSchemas[sectionId] = {};
                            }
                            const next = {
                                type: safeString(ctx.input?.type, "text"),
                                required: Boolean(ctx.input?.required),
                            };
                            if (Number.isInteger(ctx.input?.maxLength) && Number(ctx.input.maxLength) > 0) {
                                next.maxLength = Number(ctx.input.maxLength);
                            }
                            stateCache.sectionSchemas[sectionId][field] = next;
                            stateCache.lastUpdated = nowIso();
                            addChange({
                                type: "status_change",
                                summary: `Validation schema updated for ${sectionId}.${field}.`,
                                timestamp: stateCache.lastUpdated,
                                sectionId,
                            });
                            return next;
                        });
                        return { sectionId, field, schema };
                    },
                },
                {
                    name: "upsert_section_content",
                    description: "Write or update one content field in a section during interactive drafting.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "field", "value"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            field: { type: "string" },
                            value: { type: "string" },
                            mark: { type: "string", enum: ["draft", "final"] },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const result = await mutateState(() =>
                            upsertSectionContent(
                                safeString(ctx.input?.sectionId),
                                safeString(ctx.input?.field),
                                safeString(ctx.input?.value),
                                safeString(ctx.input?.mark, "draft"),
                                "agent",
                            ),
                        );
                        return result;
                    },
                },
                {
                    name: "upsert_section_content_bulk",
                    description: "Write multiple section content fields in one action.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "fields"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            fields: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: { type: "string" },
                            },
                            mark: { type: "string", enum: ["draft", "final"] },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const sectionId = safeString(ctx.input?.sectionId);
                        const fields = ctx.input?.fields;
                        if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
                            throw new CanvasError("invalid_fields", "fields must be an object of key/value pairs.");
                        }
                        const mark = safeString(ctx.input?.mark, "draft");
                        const updates = await mutateState(() => {
                            const output = [];
                            for (const [field, value] of Object.entries(fields)) {
                                if (typeof value !== "string") {
                                    throw new CanvasError("invalid_field_value", `Value for "${field}" must be a string.`);
                                }
                                output.push(upsertSectionContent(sectionId, field, value, mark, "agent"));
                            }
                            return output;
                        });
                        return { updates };
                    },
                },
                {
                    name: "update_section_status",
                    description: "Set a section status and optionally attach a note or commit summary.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "status"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            status: { type: "string" },
                            message: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const sectionId = safeString(ctx.input?.sectionId);
                        const status = safeString(ctx.input?.status);
                        const message = safeString(ctx.input?.message);
                        const section = await mutateState(() => updateSectionStatus(sectionId, status, message, "agent"));
                        return { section };
                    },
                },
                {
                    name: "propose_content",
                    description: "Create a pending content proposal for a section field.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "field", "proposed", "reason"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            field: { type: "string" },
                            proposed: { type: "string" },
                            reason: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const proposal = await mutateState(() => {
                            const section = findSectionOrThrow(safeString(ctx.input?.sectionId));
                            const field = safeString(ctx.input?.field).trim();
                            if (!field) {
                                throw new CanvasError("invalid_field", "Field is required.");
                            }
                            const current = safeString(section.content[field], "");
                            const proposed = safeString(ctx.input?.proposed);
                            const timestamp = nowIso();
                            const item = {
                                id: uid("proposal"),
                                sectionId: section.id,
                                field,
                                current,
                                proposed,
                                reason: safeString(ctx.input?.reason),
                                status: "pending",
                                diff: listDiffLines(current, proposed),
                                timestamp,
                            };
                            stateCache.contentProposals.unshift(item);
                            stateCache.lastUpdated = timestamp;
                            addChange({
                                type: "status_change",
                                summary: `Content proposal created for ${section.name}.${field}.`,
                                timestamp,
                                sectionId: section.id,
                            });
                            return item;
                        });
                        return { proposal };
                    },
                },
                {
                    name: "log_change",
                    description: "Append a structured entry to the live changes feed.",
                    inputSchema: {
                        type: "object",
                        required: ["type", "summary", "timestamp"],
                        additionalProperties: false,
                        properties: {
                            type: { type: "string" },
                            path: { type: "string" },
                            summary: { type: "string" },
                            timestamp: { type: "string" },
                            sectionId: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const entry = await mutateState(() => {
                            const type = safeString(ctx.input?.type);
                            if (!VALID_CHANGE_TYPES.has(type)) {
                                throw new CanvasError("invalid_change_type", `Unsupported change type: ${type}`);
                            }
                            const item = addChange({
                                type,
                                path: safeString(ctx.input?.path),
                                summary: safeString(ctx.input?.summary),
                                timestamp: safeString(ctx.input?.timestamp),
                                sectionId: safeString(ctx.input?.sectionId),
                            });
                            appendFileChange(item.sectionId, item.path);
                            return item;
                        });
                        return { entry };
                    },
                },
                {
                    name: "add_note",
                    description: "Attach an agent note to a section.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "text"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            text: { type: "string" },
                            author: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const note = await mutateState(() =>
                            addNote(safeString(ctx.input?.sectionId), safeString(ctx.input?.text), safeString(ctx.input?.author) || "agent"),
                        );
                        return { note };
                    },
                },
                {
                    name: "request_review",
                    description: "Move a section to Review with summary and file list.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId", "summary", "files_changed"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                            summary: { type: "string" },
                            files_changed: { type: "array", items: { type: "string" } },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const payload = await mutateState(() => {
                            const sectionId = safeString(ctx.input?.sectionId);
                            const summary = safeString(ctx.input?.summary);
                            const files = Array.isArray(ctx.input?.files_changed)
                                ? ctx.input.files_changed.filter((item) => typeof item === "string")
                                : [];
                            const section = updateSectionStatus(sectionId, "Review", summary, "agent");
                            for (const filePath of files) {
                                appendFileChange(sectionId, filePath);
                            }
                            section.filesChanged = [...new Set([...(section.filesChanged || []), ...files])];
                            addChange({
                                type: "status_change",
                                summary: `Review requested for ${section.name}.`,
                                timestamp: nowIso(),
                                sectionId,
                            });
                            return { section };
                        });
                        return payload;
                    },
                },
                {
                    name: "mark_milestone",
                    description: "Record a project milestone and mirror it to the changes feed.",
                    inputSchema: {
                        type: "object",
                        required: ["title", "description", "sections_affected"],
                        additionalProperties: false,
                        properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            sections_affected: { type: "array", items: { type: "string" } },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const milestone = await mutateState(() =>
                            markMilestone(
                                safeString(ctx.input?.title),
                                safeString(ctx.input?.description),
                                Array.isArray(ctx.input?.sections_affected) ? ctx.input.sections_affected : [],
                            ),
                        );
                        return { milestone };
                    },
                },
                {
                    name: "create_section",
                    description: "Create a new custom section on the board.",
                    inputSchema: {
                        type: "object",
                        required: ["name"],
                        additionalProperties: false,
                        properties: {
                            name: { type: "string" },
                            icon: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const name = safeString(ctx.input?.name).trim();
                        if (!name) {
                            throw new CanvasError("invalid_name", "Section name is required.");
                        }
                        const icon = safeString(ctx.input?.icon, "📄").trim() || "📄";
                        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("section");
                        const section = await mutateState(() => {
                            if (stateCache.sections.find((item) => item.id === id)) {
                                throw new CanvasError("duplicate_section", `Section "${id}" already exists.`);
                            }
                            const next = { id, name, icon, status: "Not Started", notes: [], content: {}, filesChanged: [], lastModified: nowIso() };
                            stateCache.sections.push(next);
                            if (!stateCache.fieldSuggestions || typeof stateCache.fieldSuggestions !== "object") {
                                stateCache.fieldSuggestions = {};
                            }
                            if (!stateCache.sectionSchemas || typeof stateCache.sectionSchemas !== "object") {
                                stateCache.sectionSchemas = {};
                            }
                            stateCache.fieldSuggestions[id] = stateCache.fieldSuggestions[id] || [];
                            stateCache.sectionSchemas[id] = stateCache.sectionSchemas[id] || {};
                            stateCache.lastUpdated = next.lastModified;
                            addChange({
                                type: "status_change",
                                summary: `Section "${name}" created.`,
                                timestamp: next.lastModified,
                                sectionId: id,
                            });
                            return next;
                        });
                        return { section };
                    },
                },
                {
                    name: "delete_section",
                    description: "Delete a section by sectionId.",
                    inputSchema: {
                        type: "object",
                        required: ["sectionId"],
                        additionalProperties: false,
                        properties: {
                            sectionId: { type: "string" },
                        },
                    },
                    handler: async (ctx) => {
                        captureWorkingDirectory(ctx);
                        const sectionId = safeString(ctx.input?.sectionId);
                        const deleted = await mutateState(() => {
                            const idx = stateCache.sections.findIndex((item) => item.id === sectionId);
                            if (idx === -1) {
                                throw new CanvasError("section_not_found", `Unknown section: ${sectionId}`);
                            }
                            const [removed] = stateCache.sections.splice(idx, 1);
                            if (stateCache.fieldSuggestions && typeof stateCache.fieldSuggestions === "object") {
                                delete stateCache.fieldSuggestions[sectionId];
                            }
                            if (stateCache.sectionSchemas && typeof stateCache.sectionSchemas === "object") {
                                delete stateCache.sectionSchemas[sectionId];
                            }
                            stateCache.contentProposals = stateCache.contentProposals.filter((p) => p.sectionId !== sectionId);
                            stateCache.lastUpdated = nowIso();
                            addChange({
                                type: "status_change",
                                summary: `Section "${removed.name}" deleted.`,
                                timestamp: stateCache.lastUpdated,
                            });
                            return removed.id;
                        });
                        return { deleted };
                    },
                },
            ],
            open: async (ctx) => {
                captureWorkingDirectory(ctx);
                await loadState();
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                stateCache.branch = readBranchFromGit();
                stateCache.lastUpdated = nowIso();
                await persistState();
                publishSse("state_update", stateCache);
                return {
                    title: "Site Studio",
                    status: summarizeProgress(),
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    for (const client of entry.clients) {
                        try {
                            client.end();
                        } catch {}
                    }
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});

workspacePath = session.workspacePath;
await loadState();
