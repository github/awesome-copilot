import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTEXT_WRITER, DEFAULT_SPEC_DIRS } from './spec-rules.mjs';
import { isKnownStep, renderPreamble, renderSpecifyCreationLifecyclePreamble } from './vendor/preamble.mjs';

export const STEP_COMMANDS = ['plan', 'tasks', 'implement'];
export const SPEC_COMMANDS = [...STEP_COMMANDS, 'status', 'resume', 'doctor', 'mark-complete'];
const COMPANION_ONLY = new Set(['status', 'resume', 'doctor', 'mark-complete']);

/** Companion is installed when its extension folder is: the same check VS Code makes (`isCompanionInstalled`). */
export function isCompanionInstalled(root) {
    return existsSync(join(root, '.specify', 'extensions', 'companion'));
}

/** `companion` when the Companion commands are installed in the workspace, else stock `speckit`. */
export function detectCommandSet(root) {
    return isCompanionInstalled(root) ? 'companion' : 'speckit';
}

/** A stock-workflow spec keeps the stock commands even when Companion is installed; every other spec follows the workspace. */
export function commandSetFor(root, workflow) {
    return workflow === 'speckit' ? 'speckit' : detectCommandSet(root);
}

const WORKSPACE_WRITER = CONTEXT_WRITER;
const CHECKOUT_WRITER = fileURLToPath(new URL('../speckit-extension/scripts/write-context.py', import.meta.url));

/** The context writer run instructions may name: the workspace's copy, else this checkout's; null when neither exists. */
export function writerPath(root, checkout = CHECKOUT_WRITER) {
    if (existsSync(join(root, WORKSPACE_WRITER))) return WORKSPACE_WRITER;
    return checkout && existsSync(checkout) ? checkout : null;
}

/** The model reads only title, status and url from a canvas's `open` result, so the instruction to stop rides in `status`. */
export const OPEN_NOTE = 'The board is open: wait for the user\'s next instruction and do not start any work.';

/** The rule appended to the session's system message: the strongest place to say what opening the board means. */
export const SYSTEM_RULE = 'If the user only asks to open the SpecKit Companion canvas, open it and stop: do not read, test or implement any spec until they ask. A message that starts with a /speckit command is a request to run that command, or the skill of that name, so run it.';

/** What the catalog shows the model for the canvas, in the same words as the rule. */
export const CANVAS_DESCRIPTION = 'A live board of every spec: its specify → plan → tasks → implement pipeline, task progress and run history, with a button that runs the next step. When the user only asks to open it, show it and stop: do not read, test or implement any spec until they ask.';

export function openStatus(active, total) {
    return `${active} active · ${total} specs. ${OPEN_NOTE}`;
}

/** Which commands the board can offer for this workspace's command set. */
export function availableCommands(commandSet) {
    return SPEC_COMMANDS.filter(command => commandSet === 'companion' || !COMPANION_ONLY.has(command));
}

const dottedName = (command, commandSet) => (commandSet === 'companion' ? `speckit.companion.${command}` : `speckit.${command}`);
const SKILL_DIRS = ['.github/skills', '.agents/skills', '.claude/skills'];

/** How this project spells a command: dashed for a skill folder, dotted for a prompt or agent file, and a dotted guess (`registered` false) with the command's body when neither exists. */
export function resolveCommand(root, command, commandSet = 'companion') {
    const dotted = dottedName(command, commandSet);
    const dashed = dotted.replace(/\./g, '-');
    const first = candidates => candidates.find(candidate => existsSync(join(root, candidate))) ?? null;
    const skill = first(SKILL_DIRS.map(dir => `${dir}/${dashed}/SKILL.md`));
    if (skill) return { name: dashed, registered: true, instructions: skill };
    const prompt = first([`.github/prompts/${dotted}.prompt.md`, `.github/agents/${dotted}.agent.md`]);
    if (prompt) return { name: dotted, registered: true, instructions: prompt };
    const body = first([commandSet === 'companion' ? `.specify/extensions/companion/commands/${dotted}.md` : `.specify/templates/commands/${command}.md`]);
    return { name: dotted, registered: false, instructions: body };
}

/** Where the command's body lives on disk. */
export function commandInstructions(root, command, commandSet = 'companion') {
    return resolveCommand(root, command, commandSet).instructions;
}

/** `/speckit-<step>` or `/speckit.<step>`: the pattern the board's buttons send for a command set, in this project's spelling. */
export function commandPattern(root, commandSet = 'companion') {
    return `/${resolveCommand(root, 'plan', commandSet).name.replace(/plan$/, '<step>')}`;
}

/** Where the board keeps the run instructions it writes, relative to the project root. The only place it writes. */
export const PROMPTS_DIR = '.speckit-companion/prompts';

/** The one sentence that stands in the chat for the whole preamble. */
export function instructionsSentence(file) {
    return `Before you start, read and follow the run instructions in \`${file}\`.`;
}

const safeName = name => String(name).replace(/[^A-Za-z0-9._-]+/g, '-');

/** `plan-042-export-csv.md`: one file per step and spec folder, so a re-run replaces the last one. */
export function stepInstructionsName(command, specId) {
    return `${command}-${safeName(basename(specId))}.md`;
}

/** New spec has no folder yet, so its file is named by the dispatch time. */
export function specifyInstructionsName(now = new Date()) {
    return `specify-${now.toISOString().replace(/[-:.]/g, '')}.md`;
}

/** The instruction file's text: which command it belongs to, then the preamble exactly as VS Code renders it. */
export function runInstructionsDoc(commandLine, preamble) {
    return `# Run instructions\n\nThese belong to the \`${commandLine}\` command the SpecKit Companion board sent to the chat. Follow them while you run it.\n\n${preamble}\n`;
}

function ownDirectory(realRoot, dir, label) {
    mkdirSync(dir, { recursive: true });
    if (realpathSync(dir) !== join(realRoot, label)) throw new Error(`Could not write the run instructions: \`${label}\` leads outside the project.`);
}

/**
 * Write a run's instructions under `.speckit-companion/prompts/` and return the root-relative path the chat message names.
 * Refuses when either folder resolves outside the project through a symlink. An older file of the same name is removed first.
 */
export function writeRunInstructions(root, name, content) {
    const realRoot = realpathSync(root);
    const [home, prompts] = PROMPTS_DIR.split('/');
    ownDirectory(realRoot, join(root, home), home);
    ownDirectory(realRoot, join(root, home, prompts), PROMPTS_DIR);
    const ignore = join(root, home, '.gitignore');
    if (!lstatSync(ignore, { throwIfNoEntry: false })) writeFileSync(ignore, '*\n', { flag: 'wx' });
    const file = join(root, home, prompts, safeName(name));
    rmSync(file, { force: true });
    writeFileSync(file, content, { flag: 'wx' });
    return `${PROMPTS_DIR}/${safeName(name)}`;
}

/** The chat message a run button sends: the command as `spelling` has it, its body's path only when unregistered, and the instruction file's sentence when there is one. */
export function buildPrompt(command, specId, commandSet = 'companion', spelling = null, instructionsFile = null) {
    if (!availableCommands(commandSet).includes(command)) {
        throw new Error(`Unknown command for the ${commandSet} command set: ${command}`);
    }
    const name = spelling?.name ?? dottedName(command, commandSet);
    let text = `/${name} ${specId}`;
    if (spelling && !spelling.registered && spelling.instructions) text += `\n\nIf /${name} is not a command here, read \`${spelling.instructions}\` and follow it for the spec in \`${specId}\`.`;
    return instructionsFile ? `${text}\n\n${instructionsSentence(instructionsFile)}` : text;
}

/** The step preamble for a run button, or null: for commands VS Code sends none for, and for a stock run with no context writer to call. */
export function buildStepPreamble(command, specId, root, commandSet, now = new Date(), writer = writerPath(root)) {
    if (!STEP_COMMANDS.includes(command) || !isKnownStep(command)) return null;
    const companion = commandSet === 'companion';
    if (!companion && !writer) return null;
    return renderPreamble(command, specId, now.toISOString(), companion, writer ?? WORKSPACE_WRITER);
}

/** What the New spec form offers, mirroring VS Code's create-spec dialog: Companion, Spec Kit, and Auto (Companion only). */
export const SPECIFY_WORKFLOWS = ['companion', 'speckit', 'auto'];

export function specifyChoices(root) {
    const installed = isCompanionInstalled(root);
    const needs = 'Needs the SpecKit Companion extension, which is not installed in this workspace.';
    return {
        installed,
        installCommand: installed ? null : INSTALL_COMMAND,
        default: installed ? 'companion' : 'speckit',
        choices: [
            { id: 'companion', label: 'Companion', available: installed, reason: installed ? null : needs },
            { id: 'speckit', label: 'Spec Kit', available: true, reason: null },
            { id: 'auto', label: 'Auto', available: installed, reason: installed ? null : needs },
        ],
    };
}

/** The command a workflow choice sends and the workflow name the run record carries. Throws when the choice cannot run here. */
export function resolveSpecify(workflow, installed) {
    if (!SPECIFY_WORKFLOWS.includes(workflow)) throw new Error(`Unknown workflow: ${String(workflow)}`);
    if (workflow === 'auto' && !installed) throw new Error('Auto needs the companion spec-kit extension, which is not installed.');
    if (workflow === 'companion' && !installed) throw new Error('SpecKit Companion is not installed in this workspace. Choose Spec Kit, or install the companion spec-kit extension.');
    if (workflow === 'speckit') return { command: 'speckit.specify', effective: 'speckit' };
    return { command: workflow === 'auto' ? 'speckit.companion.auto' : 'speckit.companion.specify', effective: 'companion' };
}

function usesTimestampNumbering(root) {
    try {
        return JSON.parse(readFileSync(join(root, '.specify', 'init-options.json'), 'utf8')).branch_numbering === 'timestamp';
    } catch {
        return false;
    }
}

/**
 * The number the next spec folder takes, counted the way Spec Kit's `create-new-feature` script counts: the highest `NNN-` folder
 * plus one, skipping timestamp folders. A `_NN_` fixture folder never matches. Null when the workspace numbers by timestamp.
 */
export function nextSpecNumber(root, specDirs = DEFAULT_SPEC_DIRS) {
    if (usesTimestampNumbering(root)) return null;
    let highest = 0;
    for (const specDir of specDirs) {
        let entries;
        try {
            entries = readdirSync(join(root, specDir), { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory() || /^\d{8}-\d{6}-/.test(entry.name)) continue;
            const number = Number(entry.name.match(/^(\d{3,})-/)?.[1] ?? 0);
            if (number > highest) highest = number;
        }
    }
    return String(highest + 1).padStart(3, '0');
}

/** The numbering rule New spec carries, so the agent neither reuses a number nor counts on from the `_NN_` fixture folders. */
export function numberingRule(root, specDirs = DEFAULT_SPEC_DIRS) {
    const next = nextSpecNumber(root, specDirs);
    if (!next) return null;
    return `Name the new spec folder \`${next}-<short-name>\`: ${next} is one more than the highest numbered spec folder. Folders that start with \`_\` are fixtures, so do not count them or copy their naming. If a branch script in this run reports a higher feature number, use that number instead.`;
}

/**
 * A new spec starts from a description, not a folder: specify mints the folder itself. The message is the command line with the
 * description, the folder number, and one sentence naming the file that will hold the lifecycle preamble that seeds `.spec-context.json`.
 * The caller writes `preamble` to `instructionsName` (`writeRunInstructions`) before it sends `prompt`; a stock run with no context writer gets neither.
 */
export function buildSpecifyPrompt({ description, workflow, root, specDirs = DEFAULT_SPEC_DIRS, now = new Date(), writer = writerPath(root) }) {
    const text = String(description ?? '').replace(/\r\n?/g, '\n').trim();
    if (!text) throw new Error('Describe the feature to specify.');
    const installed = isCompanionInstalled(root);
    const { command, effective } = resolveSpecify(workflow, installed);
    const spelling = resolveCommand(root, command.replace(/^speckit\.(companion\.)?/, ''), effective);
    let message = `/${spelling.name} ${text}`;
    if (!spelling.registered && spelling.instructions) message += `\n\nIf /${spelling.name} is not a command here, read \`${spelling.instructions}\` and follow it with the feature description above.`;
    const numbering = numberingRule(root, specDirs);
    if (numbering) message += `\n\n${numbering}`;
    const sent = { command: spelling.name, workflow: effective, startedAt: now.toISOString() };
    if (effective !== 'companion' && !writer) return { ...sent, prompt: message, preamble: null, instructionsName: null, instructionsDoc: null };
    const preamble = renderSpecifyCreationLifecyclePreamble(effective, null, now.toISOString(), effective === 'companion' && installed, writer ?? WORKSPACE_WRITER, null);
    const instructionsName = specifyInstructionsName(now);
    return {
        ...sent,
        prompt: `${message}\n\n${instructionsSentence(`${PROMPTS_DIR}/${instructionsName}`)}`,
        preamble,
        instructionsName,
        instructionsDoc: runInstructionsDoc(`/${spelling.name}`, preamble),
    };
}

/** The spec-kit command that installs Companion. It names the pinned `companion-latest` download, as the spec-kit extension README does. */
export const INSTALL_COMMAND = 'specify extension add companion --from https://github.com/alfredoperez/speckit-companion/releases/download/companion-latest/companion.zip --force';

/** The one chat line behind "Ask Copilot to install it". */
export function buildInstallPrompt() {
    return `Run \`${INSTALL_COMMAND}\` in this project, then commit the skill files it generates: each session starts from the committed default branch, so the SpecKit Companion commands only exist in the next session if those files are real, committed files.`;
}

/** A read-only question about one spec, for the "Ask Copilot" button. */
export function buildAskPrompt(spec) {
    return [
        `Look at the spec in \`${spec.id}\` (titled ${JSON.stringify(spec.title)}).`,
        `The board shows it as "${spec.statusLabel}", current step "${spec.currentStep ?? 'none'}".`,
        'Tell me in a few lines where it stands, what is left, and the single next step. Read only: do not change any files.',
    ].join(' ');
}
