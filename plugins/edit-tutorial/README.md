# Edit Tutorial Plugin

Turn the code edits Copilot made in your session into an interactive lesson: a step-by-step walkthrough of each change with before/after views and quizzes, then a hands-on exercise that varies those edits so you finish the change yourself.

## Installation

```bash
copilot plugin install edit-tutorial@awesome-copilot
```

## How It Works

1. Let Copilot make a change to your code, then open the Edit Tutorial canvas and click "Build my tutorial" (or just ask: "teach me what you changed").
2. Copilot reviews the edits it made in the session and publishes a lesson: one step per focused change, each with the file, an explanation, a before/after view, and an optional comprehension quiz.
3. Work through the steps. Finishing them unlocks the exercise: the same technique applied to a slightly different target, such as another function or different parameter values.
4. Write your solution in the canvas editor. "Check my work" runs the lesson's checks locally, hints reveal one at a time, and "Ask Copilot for a review" sends your attempt to the chat for coaching. Passing the checks, or an approving review, completes the lesson.

## Example

If Copilot added retry-with-backoff logic to `fetchUser` in a sample project, the lesson walks through that change step by step, then asks you to apply the same pattern to `fetchOrders` with a different attempt cap and starting delay.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
