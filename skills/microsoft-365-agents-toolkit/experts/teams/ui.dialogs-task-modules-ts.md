# ui.dialogs-task-modules-ts

## purpose

Dialog/task module flows: opening, submitting, and chaining dialogs in Teams bots using the Teams AI Library v2.

## rules

1. Handle dialog open requests with `app.on('dialog.open', handler)`. This fires when Teams invokes `task/fetch`. The handler must return a response with `task.type: 'continue'` containing a card, or `task.type: 'message'` containing text. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
2. Handle dialog submissions with `app.on('dialog.submit', handler)`. This fires when the user submits the form inside the task module (`task/submit`). Form data is available in `activity.value.data`. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
3. To open a dialog with an Adaptive Card, return `{ status: 200, body: { task: { type: 'continue', value: { title, card } } } }` where `card` is an object with `contentType: 'application/vnd.microsoft.card.adaptive'` and `content` containing the card JSON. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
4. To close a dialog with a text message, return `{ status: 200, body: { task: { type: 'message', value: 'Success message' } } }` from the submit handler. This displays the message and closes the dialog. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
5. To chain dialogs (open a new dialog after submission), return a `continue` response from the submit handler with a new card. This replaces the current dialog content without closing it. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
6. Control dialog dimensions with `width` and `height` properties in the `value` object. Accepted values are `'small'`, `'medium'`, `'large'`, or pixel values (e.g., `500`). Default is `'medium'`. [learn.microsoft.com -- Task module size](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots#the-taskinfo-object)
7. Trigger a dialog from a message by sending an Adaptive Card with `Action.Submit` containing `{ msteams: { type: 'task/fetch' } }` in its data, or by adding the bot to the manifest with `taskInfo` commands. [learn.microsoft.com -- Invoke task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots#invoke-a-task-module-from-a-bot)
8. The `dialog.open` route maps to `task/fetch` and `dialog.submit` maps to `task/submit` in the Teams invoke system. Both are invoke routes that require a structured return value, not a simple `send()` call. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Form input IDs in the Adaptive Card become keys in `activity.value.data`. For example, `Input.Text` with `id: 'email'` appears as `activity.value.data.email` in the submit handler. [learn.microsoft.com -- Adaptive Card inputs](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-actions)
10. Always validate submitted data server-side. Users can tamper with the JSON payload sent by the dialog. Use schema validation before processing form data. [learn.microsoft.com -- Task modules security](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)

## patterns

### Opening a dialog with an Adaptive Card form

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('dialog-bot'),
  plugins: [new DevtoolsPlugin()],
});

// Open a dialog when task/fetch is invoked
app.on('dialog.open', async () => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'Submit Feedback',
          width: 'medium',
          height: 'medium',
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                {
                  type: 'TextBlock',
                  text: 'Submit your feedback',
                  weight: 'Bolder',
                  size: 'Large',
                },
                {
                  type: 'Input.Text',
                  id: 'userName',
                  label: 'Your name',
                  isRequired: true,
                  errorMessage: 'Name is required',
                },
                {
                  type: 'Input.ChoiceSet',
                  id: 'rating',
                  label: 'Rating',
                  style: 'compact',
                  value: '3',
                  choices: [
                    { title: '1 - Poor', value: '1' },
                    { title: '2 - Fair', value: '2' },
                    { title: '3 - Good', value: '3' },
                    { title: '4 - Great', value: '4' },
                    { title: '5 - Excellent', value: '5' },
                  ],
                },
                {
                  type: 'Input.Text',
                  id: 'comments',
                  label: 'Comments',
                  isMultiline: true,
                  placeholder: 'Tell us more...',
                },
              ],
              actions: [
                {
                  type: 'Action.Submit',
                  title: 'Submit',
                },
              ],
            },
          },
        },
      },
    },
  };
});

// Handle the dialog form submission
app.on('dialog.submit', async ({ activity }) => {
  const formData = activity.value.data;
  const { userName, rating, comments } = formData;

  // Validate and process
  console.log(`Feedback from ${userName}: ${rating}/5 - ${comments}`);

  // Close dialog with a message
  return {
    status: 200,
    body: {
      task: {
        type: 'message',
        value: `Thanks ${userName}! Your feedback (${rating}/5) has been recorded.`,
      },
    },
  };
});

app.start(3978);
```

### Chaining dialogs (multi-step form)

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();

// Step 1: Open initial dialog
app.on('dialog.open', async () => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'Step 1: Basic Info',
          width: 'medium',
          height: 'small',
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                { type: 'TextBlock', text: 'Step 1 of 2', weight: 'Bolder' },
                {
                  type: 'Input.Text',
                  id: 'projectName',
                  label: 'Project name',
                  isRequired: true,
                },
                {
                  type: 'Input.ChoiceSet',
                  id: 'projectType',
                  label: 'Type',
                  choices: [
                    { title: 'Feature', value: 'feature' },
                    { title: 'Bug Fix', value: 'bugfix' },
                    { title: 'Research', value: 'research' },
                  ],
                },
              ],
              actions: [
                {
                  type: 'Action.Submit',
                  title: 'Next',
                  data: { step: 'step1' },
                },
              ],
            },
          },
        },
      },
    },
  };
});

// Handle submissions -- route by step
app.on('dialog.submit', async ({ activity, send }) => {
  const data = activity.value.data;

  if (data.step === 'step1') {
    // Chain to step 2: return a continue response with a new card
    return {
      status: 200,
      body: {
        task: {
          type: 'continue',
          value: {
            title: 'Step 2: Details',
            width: 'medium',
            height: 'medium',
            card: {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                type: 'AdaptiveCard',
                version: '1.5',
                body: [
                  { type: 'TextBlock', text: `Project: ${data.projectName}`, weight: 'Bolder' },
                  { type: 'TextBlock', text: 'Step 2 of 2' },
                  {
                    type: 'Input.Text',
                    id: 'description',
                    label: 'Description',
                    isMultiline: true,
                    isRequired: true,
                  },
                  {
                    type: 'Input.Date',
                    id: 'dueDate',
                    label: 'Due date',
                  },
                ],
                actions: [
                  {
                    type: 'Action.Submit',
                    title: 'Create',
                    data: {
                      step: 'step2',
                      projectName: data.projectName,
                      projectType: data.projectType,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };
  }

  if (data.step === 'step2') {
    // Final step: process all data and close
    await send(`Project "${data.projectName}" (${data.projectType}) created! Due: ${data.dueDate || 'No date set'}`);

    return {
      status: 200,
      body: {
        task: {
          type: 'message',
          value: 'Project created successfully!',
        },
      },
    };
  }

  return { status: 200, body: { task: { type: 'message', value: 'Unknown step.' } } };
});

app.start(3978);
```

### Triggering a dialog from an Adaptive Card

```typescript
import { App } from '@microsoft/teams.apps';

const app = new App();

// Send a card with a button that triggers dialog.open
app.on('message', async ({ send }) => {
  await send({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          {
            type: 'TextBlock',
            text: 'Click the button below to open a form dialog.',
            wrap: true,
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Open Form',
            data: {
              msteams: { type: 'task/fetch' },
            },
          },
        ],
      },
    }],
  });
});

// The dialog.open handler fires when the button is clicked
app.on('dialog.open', async () => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'My Form',
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                { type: 'Input.Text', id: 'name', label: 'Enter your name' },
              ],
              actions: [
                { type: 'Action.Submit', title: 'Submit' },
              ],
            },
          },
        },
      },
    },
  };
});

app.on('dialog.submit', async ({ activity }) => {
  return {
    status: 200,
    body: {
      task: { type: 'message', value: `Hello, ${activity.value.data.name}!` },
    },
  };
});

app.start(3978);
```

## pitfalls

- **Wrong response structure**: `dialog.open` and `dialog.submit` are invoke handlers that must return `{ status: 200, body: { task: { ... } } }`. Using `await send()` instead of returning the response results in an empty dialog.
- **Missing card `contentType` wrapper**: The `card` in the task value must include `contentType: 'application/vnd.microsoft.card.adaptive'` and `content`. Passing raw card JSON without the wrapper results in a blank dialog.
- **Not routing multi-step dialogs**: When chaining dialogs, the submit handler fires for every step. Without a routing key (e.g., `data.step`), you cannot distinguish which step was submitted.
- **Forgetting to pass data between steps**: When chaining, data from step 1 is not automatically available in step 2. Include previous step data in the `Action.Submit` `data` object to carry it forward.
- **Dialog not opening**: Ensure the triggering card action includes `data: { msteams: { type: 'task/fetch' } }` for `Action.Submit`, or that the manifest defines a command with `taskInfo`. Without this, Teams does not invoke `dialog.open`.
- **Form data not appearing**: Input element `id` values become keys in `activity.value.data`. If `id` is missing on an input, its value is not submitted.
- **Size not taking effect**: The `width` and `height` properties must be in the `value` object alongside `title` and `card`. Placing them at the wrong nesting level is silently ignored.
- **Returning undefined**: If the handler returns `undefined` or nothing, Teams shows a generic error. Always return a valid task response.

## references

- [Task modules in Teams bots](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots)
- [Task module invocation](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots#invoke-a-task-module-from-a-bot)
- [TaskInfo object](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots#the-taskinfo-object)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [Adaptive Cards for task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference)

## instructions

This expert covers dialog/task module flows in Microsoft Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`) in TypeScript. Use it when you need to:

- Open a dialog with an Adaptive Card form via `app.on('dialog.open', ...)`
- Process form submissions via `app.on('dialog.submit', ...)`
- Return `continue` (card) or `message` (text) task responses
- Chain multiple dialog steps (multi-step wizard)
- Trigger dialogs from Adaptive Card buttons using `msteams: { type: 'task/fetch' }`
- Control dialog dimensions with `width` and `height`

Pair with `ui.adaptive-cards-ts.md` for card construction details and `runtime.routing-handlers-ts.md` for handler registration context. Pair with `ui.adaptive-cards-ts.md` for card construction inside task modules, and `runtime.routing-handlers-ts.md` for dialog.open/dialog.submit route registration.

## research

Deep Research prompt:

"Write a micro expert on Teams Task Modules (dialogs) using Teams SDK v2 in TypeScript. Cover app.on('dialog.open') return payload structure, app.on('dialog.submit') handling, embedding Adaptive Card forms in dialogs, multi-step dialog patterns with chaining, triggering dialogs from card actions, dialog dimensions, and common failure modes. Include 2-3 canonical TypeScript code examples."
