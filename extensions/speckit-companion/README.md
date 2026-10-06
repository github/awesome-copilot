# SpecKit Companion spec board for the GitHub Copilot app

A live board of every spec in your repo, next to the chat in the GitHub Copilot app. It is for people who run [Spec Kit](https://github.com/github/spec-kit) with Copilot: you see where each spec stands, read its documents, and run the next step from a button. It works with stock Spec Kit and with [SpecKit Companion](https://speckit-companion.dev). You do not need VS Code.

![A recreation of a run on the SpecKit Companion board, sped up: a finished spec's Overview, New spec with one line typed, Run plan pressed and the command landing in the chat, the step rail moving through Plan, Tasks and Implement, the tasks ticking from 0/6 to 6/6, and the new spec's Overview with a time per step.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/board-story.gif)

One spec from **New spec** to done. This is a recreation of a run, sped up, not a recording: the board is the real one, and the window and chat around it are a plain stand-in for the Copilot app.

**[Docs](https://speckit-companion.dev/docs/copilot-app/install/)** · **[A run, step by step](https://speckit-companion.dev/docs/copilot-app/a-run-step-by-step)** · **[speckit-companion.dev](https://speckit-companion.dev)**

## Install

The board is a [canvas extension](https://docs.github.com/en/copilot/how-tos/github-copilot-app/working-with-canvas-extensions). Copy this folder into your user folder and it shows up in every new session:

```bash
git clone https://github.com/alfredoperez/speckit-companion
cp -R speckit-companion/apps/copilot-canvas ~/.copilot/extensions/speckit-companion
```

Then open your project in the Copilot app, start a **new** session, and ask: **Open the SpecKit Companion canvas**. It is also in the session's **+** menu, under **Canvas** → **SpecKit Companion**.

### Share it with your team

Copy the folder into the project and commit it:

```bash
cp -R speckit-companion/apps/copilot-canvas <project>/.github/extensions/speckit-companion
```

A project copy is code, so the app keeps it off until you accept it. Since Copilot app 1.1.26:

1. Merge the copy to your default branch. The app runs each session in a fresh worktree cut from that branch.
2. Choose **Review repository content** on the notice the app shows, or in the project's settings under **Repository trust**. Then choose **Accept for new sessions**.
3. Start a new session and open the canvas.

A session that was open when you accepted never gets the board. There the agent opens an empty `speckit-companion.md` in the editor: start another session. The app accepts the exact files, so after any change under `.github/extensions/` the project shows **Update available**, and new sessions lose the board until you accept again. A project with unaccepted content turns every extension off in its sessions, the user-folder copy included.

## What you get

### Every spec, and where it stands

The list shows every spec folder under `specs/`, or under your `speckit.specDirectories`, most recently active first. Each row has its status, a four-step bar (specify, plan, tasks, implement) and its task count. Filter by Active, Done or All, or search by name or number.

![The SpecKit Companion board open on a project with five specs. The list on the left gives each spec a status and a four-step bar, and Demo, Tasked is open on the right with its pipeline and a Run implement button.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/live-copilot-board.png)

### A spec's documents, rendered

Open a spec for its pipeline, the next step, and one tab per document: Overview, Spec, Plan, Tasks, research, data model and checklists. The Overview shows what the run recorded: the intent, the time each step took, what was verified, the decisions and the coverage. An Activity tab lists the run history. The documents look as they do in the VS Code viewer.

![The spec board in dark mode: the list of specs on the left, each with a status and a four-step bar, and one spec open on the right with its pipeline, its next-step card and its Overview.](https://github.com/alfredoperez/speckit-companion/raw/main/apps/copilot-canvas/assets/preview.png)

### The next step is a button

The card under the pipeline names the next step and runs it. The button sends one command into the chat, and your agent runs the step from there. **New spec** asks which workflow to use: **Companion**, **Spec Kit**, or **Auto**, which runs every step without pausing. Companion and Auto need the Companion Spec Kit extension in the project.

![The same spec after tasks. The status reads Ready to Implement, three steps are done, the card reads Next: Implement with a Run implement button, and the Tasks tab reads 0/6 with Phase 1's tasks unticked.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/live-copilot-walk-tasked.png)

### It updates while the agent works

The board watches the spec folders. When the agent writes `plan.md` or ticks a task, the board changes without a refresh. A step you sent shows as **Running** until the chat turn ends. The first spec of a project shows up as soon as the agent creates it.

![The same spec during implement. The status reads Implementing, Implement is running in the pipeline, the card reads Implement is running with a Resume button, and the Tasks tab reads 3/6 with T001 and T002 ticked and the files each one touched.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/live-copilot-walk-implementing.png)

### A short message in the chat

After a button is pressed, a note at the foot of the board names the command it sent. **Show prompt** shows the whole message and **Copy** copies it. Where Companion is installed the message is the command plus one sentence that points the agent at its run instructions, which the board writes to a file under `.speckit-companion/prompts/`. That folder is ignored by git.

![The board after Run tasks was pressed. A note reads Sent /speckit.tasks to the chat, with Hide prompt and Copy beside it, and under it the short message that was sent and the path of its run instructions file with Copy path.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/live-copilot-sent-prompt.png)

### Ask the agent

The agent can drive the board too. Ask "which specs are still open?" or "show me the export spec" and the board follows.

## Works with stock Spec Kit

You do not need SpecKit Companion in the project. Without it:

- **The board reads each step from the files.** A written spec means Specify is done, a written `plan.md` Plan, a written `tasks.md` Tasks, and ticked tasks show how far Implement is. An empty file, or the template Spec Kit copies in when a step starts, does not count.
- **The buttons send the stock commands**, spelled the way your project registers them. A project whose commands are skills, such as `.github/skills/speckit-plan/`, gets `/speckit-plan`. One whose commands are prompt files, such as `.github/prompts/speckit.plan.prompt.md`, gets `/speckit.plan`.
- **The message is the command and nothing else.**
- **Steps you send from the board are timed.** The board notes when it sent the step and when that chat turn ended, and the Overview shows a time for those steps only.
- **The board offers to install Companion.** One line on New spec and on the next-step card says it is missing. **Install it** shows the command with a Copy button, and **Ask Copilot to install it** asks the agent to run it. You can dismiss the line for the session.

![The next-step card in a project without Companion. A line says SpecKit Companion is not installed in this project, so the standard Spec Kit commands run, with Install it opened to show the specify extension add command, a Copy button and Ask Copilot to install it.](https://raw.githubusercontent.com/alfredoperez/speckit-companion/main/docs/screenshots/live-copilot-install-hint.png)

With the Companion Spec Kit extension in the project (`specify extension add companion …`, see the [spec-kit extension README](https://github.com/alfredoperez/speckit-companion/blob/main/apps/speckit-extension/README.md)), the buttons send the `/speckit.companion.*` commands and every step is recorded: times, decisions and what was verified. A spec keeps the workflow it was started with, so a run never switches halfway.

## What the board writes

The board never writes a spec document. It writes two things:

- Its own run instructions under `.speckit-companion/prompts/`, with a `.gitignore` beside them so they stay out of your commits.
- In a stock project, the start and finish of each step it sent, in the spec's `.spec-context.json`. Where Companion is installed the board does not write that file. The commands it sends do.

## Good to know

- **Opening the board starts nothing.** The canvas tells the agent to stop after opening it. If your agent still goes looking for work, ask "Only open it, then wait for me."
- **Copilot worktrees have no `node_modules`.** Each session runs in a fresh worktree, so an implement step that runs tests installs the project's dependencies first.
- **Companion's commands must be committed files.** The worktree is cut from your committed default branch. If `/speckit.companion.*` does not resolve in a session, check that `.github/skills/speckit-companion-*/SKILL.md` are real files in the commit, not symlinks from a `--dev` install.
- **In this repo it already works.** `.github/extensions/speckit-companion/extension.mjs` loads this folder.
- **Trying it from a branch?** A project copy only shows up once it is merged, so point your user folder at your checkout:

  ```bash
  mkdir -p ~/.copilot/extensions/speckit-companion
  echo "import '$PWD/apps/copilot-canvas/extension.mjs';" > ~/.copilot/extensions/speckit-companion/extension.mjs
  ```

## The other places SpecKit Companion runs

- **VS Code**: the [SpecKit Companion extension](https://marketplace.visualstudio.com/items?itemName=alfredoperez.speckit-companion) has the sidebar, the spec viewer with review comments, and the Overview.
- **Claude Code**: the [SpecKit Companion mod](https://speckit-companion.dev/docs/claude-code/install/) shows the run in a band above the prompt and a pane beside the transcript.
- **Spec Kit**: the Companion Spec Kit extension records each run. All three surfaces read that record.

Docs: [install](https://speckit-companion.dev/docs/copilot-app/install/), [navigate the board](https://speckit-companion.dev/docs/copilot-app/navigate-the-board), [run the steps](https://speckit-companion.dev/docs/copilot-app/run-the-steps). Changes to the board are listed in the [changelog](https://speckit-companion.dev/changelog/). MIT licensed.

## Develop

```bash
npm run canvas:dev     # from the repo root: serves the board for this repo and prints its URL
npm run test:canvas    # node:test suites for parsing, rendering, the server, and the page in headless Chrome
npm run canvas:shots   # the page suite again, saving a screenshot of each state to .canvas-shots/
```

The page suite drives the board in the installed Google Chrome through `playwright-core` (already a dev dependency) and skips itself when there is no Chrome. It covers what the Copilot app would show: the list and filters, opening a spec on its Overview, the rendered tasks, a run button reaching the chat as a short message (and the prompt kept up to paste when there is no chat session), the install line in a project without Companion, a live update after a file change, the agent focusing a spec, the one-pane layout on a narrow panel, and light mode.

`canvas:dev` runs the same server the canvas uses, without the Copilot app. Run buttons print the short message and copy it to the clipboard instead of sending it, and still write its instruction file into the workspace. Add `&theme=light` or `&theme=dark` to the URL to force a theme.

Clicking through the demo specs (`specs/_0N_demo-*`) can change their `.spec-context.json`. Restore them with `git restore specs/_0*` before committing.

## How it's built

| File | Job |
|---|---|
| `extension.mjs` | Declares the canvas and its actions with `@github/copilot-sdk/extension`. Wiring only. |
| `server.mjs` | Loopback HTTP server per open canvas: the page, a token-guarded JSON API, and a server-sent event stream fed by a file watcher. The watcher follows each spec directory recursively and each folder above it, up to the project root, flat, so a spec directory that appears, or is deleted and created again, is picked up. |
| `specs-core.mjs` | Scans spec folders, reads `.spec-context.json`, and works out each step's state. It uses the same rules as the VS Code viewer. |
| `spec-rules.mjs` | The rules with no IO, shared with the Claude Code mod: step badges from the record and from the files, what counts as a written document, and which of record and files leads. |
| `run-record.mjs` | The one write to `.spec-context.json`: a step the board sent, with the send and turn-end times, in a project with no context writer. Where there is a context writer it only finishes a specify, plan or tasks step it sent that the agent left open in the record once the turn ended with the document written. Forward only, under the cross-process lock `specContextWriter.ts` and `spec_context.py` take, and never over a record it could not read. |
| `tasks.mjs` | Task checkbox parsing. It agrees with the VS Code extension through the shared `apps/vscode/tests/fixtures/task-grammar/` cases. |
| `overview.mjs` | The Overview dossier (intent, timing, expectations, verified, decisions, coverage), built from the run record with the viewer's own class names. |
| `vendor/` | Generated by `build.mjs`: the VS Code viewer's markdown renderer, stylesheet and step timing, bundled with esbuild so documents look exactly as they do in the extension. Rebuilt by `npm run canvas:build` (also on every `test:canvas`). Never edit by hand. |
| `prompts.mjs` | The chat lines the buttons send, and the instruction files they point at. |
| `public/` | The board page: plain HTML, CSS and JS, with no build step. The header's logo is the moss mascot, inlined from `assets/icons/moss.svg`. |

The folder has the same layout as an entry in [awesome-copilot's extensions](https://github.com/github/awesome-copilot/tree/main/extensions). `plugin.json` is the listing manifest, ready to copy to their `plugins/speckit-companion/plugin.json`. Its `logo` is the `assets/preview.png` screenshot, which is also the listing card image. The app lists the canvas by its `displayName` (SpecKit Companion) and `description` from `extension.mjs`. To submit it, follow their [contributing guide](https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md#adding-canvas-extensions).
