# Edit Tutorial

A canvas extension that turns the code edits the agent made in the current session into
an interactive lesson: a step-by-step walkthrough of each change, comprehension quizzes,
and a hands-on exercise the learner finishes in the canvas in order to understand the
updates to the source code.

![Edit Tutorial canvas showing a walkthrough step with a before/after diff and a quiz](assets/preview.png)

## Prerequisites

- **Node.js 20.19 or newer** because the Copilot SDK requires `node ^20.19.0 || >=22.12.0`.
- The GitHub Copilot app canvas / UI-extensions experiment enabled.

## Install

Drop this folder at `~/.copilot/extensions/edit-tutorial/` for user scope, or in a repository at `.github/extensions/edit-tutorial/` for project scope. Then install dependencies from inside the copied folder:

```sh
# User scope
cd ~/.copilot/extensions/edit-tutorial

# Or project scope, from the repository root
cd .github/extensions/edit-tutorial

npm install
```

Reload extensions in the GitHub Copilot app, then when updating a repository using the Copilot app, add a line like:

```
Start an edit tutorial for the update.
```

at the end of the prompt to start the `edit-tutorial` canvas.

## What It Does

- **Walkthrough**: one step per focused edit, each with the file, an explanation, a
  before/after code view with change highlighting, and an optional multiple-choice quiz.
- **Exercise**: finishing the walkthrough unlocks a hands-on task that applies the same
  technique as the session's edits, but as a slight variation (a different function,
  module, or parameter values), so the learner writes the change themselves instead of
  rereading it.
- **Completion**: local regex checks validate the attempt, hints reveal one at a time,
  a reference solution unlocks after repeated failed attempts, and the learner can send
  their code to the agent for a coaching review. Passing the checks, or an approving
  review, completes the lesson.
- **Persistence**: lesson content and learner progress are saved to the session
  workspace, so reopening the canvas resumes where the learner left off.

For example, if the agent added retry-with-backoff logic to `fetchUser`, the lesson
walks through that change and then asks the learner to apply the same pattern to
`fetchOrders` with a different attempt cap and starting delay.

## Usage

1. Let the agent make a change to your code, then open the Edit Tutorial canvas and
   click "Build my tutorial" (or just ask: "teach me what you changed").
2. The agent reviews the edits it made in the session and publishes the lesson to the
   canvas with the `set_tutorial` action.
3. Work through the steps, answer the quizzes, and finish the exercise in the canvas
   editor.

## Canvas Actions

| Action | Purpose |
| --- | --- |
| `set_tutorial` | Publish or replace the lesson (title, summary, steps, exercise) |
| `get_progress` | Read the learner's step progress and current exercise attempt |
| `approve_exercise` | Mark the exercise complete after a successful review |
| `reset_progress` | Restart the current lesson without changing its content |

### Example `set_tutorial` Payload

Quizzes are optional per step. Each `solutionChecks` entry is a JavaScript regular
expression the learner's attempt must match; its `hint` is shown when the check fails.

<details>

<summary>Show Details</summary>

```json
{
  "title": "Retry with exponential",
  "summary": "The API client now retries transient failures with exponential.",
  "steps": [
    {
      "file": "src/api/client.js",
      "heading": "Wrap the request in a retry loop",
      "explanation": "The single request call becomes a bounded loop.",
      "before": "const res = await get(\"/users/\" + id);",
      "after": "for (let attempt = 1; attempt <= maxAttempts; attempt++) { ... }",
      "quiz": {
        "question": "Why bound the loop?",
        "options": ["To avoid retrying forever", "To speed up requests"],
        "answerIndex": 0,
        "why": "A bounded loop guarantees the call eventually settles."
      }
    }
  ],
  "exercise": {
    "heading": "Your turn: retry the orders endpoint",
    "brief": "Apply the same pattern to fetchOrders, capped at 5 attempts.",
    "file": "src/api/orders.js",
    "starterCode": "async function fetchOrders(customerId) { ... }",
    "hints": ["Start from the loop shape used in fetchUser."],
    "solutionChecks": [
      { "pattern": "maxAttempts\\s*=\\s*5", "hint": "Cap the attempts at 5" }
    ],
    "solution": "async function fetchOrders(customerId) { ... }"
  }
}
```

</details>

## Distribution

This extension is shipped through the `edit-tutorial` plugin:

```bash
copilot plugin install edit-tutorial@awesome-copilot
```
