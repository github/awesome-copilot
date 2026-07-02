# ui.message-extensions-ts

## purpose

Search-based and action-based message extensions (compose extensions) for Teams bots using the Teams AI Library v2.

## rules

1. Configure message extensions in `appPackage/manifest.json` under the `composeExtensions` array. Each extension has a `botId`, `commands` array, and each command specifies `type` (`query` for search, `action` for task module). [learn.microsoft.com -- Message extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
2. Handle search queries with `app.on('message.ext.query', handler)`. The handler receives the query text in `activity.value.parameters[0].value` and must return a response with `composeExtension.type: 'result'` containing an attachments array. [learn.microsoft.com -- Search extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
3. Set `attachmentLayout` to `'list'` for vertical result layout or `'grid'` for a tile grid. Use `'list'` for text-heavy results and `'grid'` for image-heavy results. [learn.microsoft.com -- Respond to search](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/respond-to-search)
4. Each attachment in the results array needs both a `content` (the full Adaptive Card inserted into the compose box) and a `preview` (a smaller Thumbnail Card shown in the search results list). The preview uses `contentType: 'application/vnd.microsoft.card.thumbnail'`. [learn.microsoft.com -- Respond to search](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/respond-to-search)
5. Handle action-based extensions with two routes: `app.on('message.ext.open', handler)` for displaying the task module form (`composeExtension/fetchTask`) and `app.on('message.ext.submit', handler)` for processing the submitted data (`composeExtension/submitAction`). [learn.microsoft.com -- Action extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
6. The `message.ext.open` handler returns a task module response identical to `dialog.open`: `{ status: 200, body: { task: { type: 'continue', value: { title, card } } } }`. [learn.microsoft.com -- Action extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
7. The `message.ext.submit` handler receives form data in `activity.value.data` and can return a card to insert into the compose box or perform a server-side action. [learn.microsoft.com -- Action extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit)
8. Manifest command parameters define the search fields displayed in the Teams UI. Each parameter has `name`, `title`, and optionally `description` and `inputType`. The first parameter is the default search field. [learn.microsoft.com -- Define search command](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
9. Search result counts should be limited (10-15 items) because Teams truncates long result lists. Always handle empty query strings gracefully by returning popular or recent results. [learn.microsoft.com -- Search extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/respond-to-search)
10. Handle link unfurling with `app.on('message.ext.query-link', handler)`. This fires when a user pastes a URL matching a domain in the manifest's `messageHandlers`. Return a card attachment to preview the link. [learn.microsoft.com -- Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)

## patterns

### Search-based message extension

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

// Manifest excerpt (appPackage/manifest.json):
// {
//   "composeExtensions": [{
//     "botId": "${{BOT_ID}}",
//     "commands": [{
//       "id": "searchCmd",
//       "type": "query",
//       "title": "Search Products",
//       "parameters": [{ "name": "query", "title": "Search query" }]
//     }]
//   }]
// }

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
}

async function searchProducts(query: string): Promise<Product[]> {
  // Replace with your actual search logic
  const products: Product[] = [
    { id: '1', title: 'Widget Pro', description: 'A premium widget', price: 29.99, imageUrl: 'https://example.com/widget.png' },
    { id: '2', title: 'Gadget Plus', description: 'An advanced gadget', price: 49.99, imageUrl: 'https://example.com/gadget.png' },
  ];
  return products.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );
}

const app = new App({
  logger: new ConsoleLogger('ext-bot'),
  plugins: [new DevtoolsPlugin()],
});

app.on('message.ext.query', async ({ activity }) => {
  const query = activity.value.parameters?.[0]?.value || '';
  const results = await searchProducts(query);

  return {
    status: 200,
    body: {
      composeExtension: {
        type: 'result',
        attachmentLayout: 'list',
        attachments: results.map(item => ({
          // Full card inserted into compose box when selected
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
              { type: 'TextBlock', text: item.title, weight: 'Bolder', size: 'Large' },
              { type: 'TextBlock', text: item.description, wrap: true },
              { type: 'TextBlock', text: `Price: $${item.price}`, weight: 'Bolder' },
            ],
          },
          // Preview card shown in search results list
          preview: {
            contentType: 'application/vnd.microsoft.card.thumbnail',
            content: {
              title: item.title,
              text: `$${item.price} - ${item.description}`,
              images: [{ url: item.imageUrl }],
            },
          },
        })),
      },
    },
  };
});

app.start(3978);
```

### Action-based message extension with task module

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

// Manifest excerpt (appPackage/manifest.json):
// {
//   "composeExtensions": [{
//     "botId": "${{BOT_ID}}",
//     "commands": [{
//       "id": "createItem",
//       "type": "action",
//       "title": "Create Item",
//       "fetchTask": true
//     }]
//   }]
// }

const app = new App({
  logger: new ConsoleLogger('action-ext-bot'),
  plugins: [new DevtoolsPlugin()],
});

// Open a task module form when the action is triggered
app.on('message.ext.open', async () => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'Create New Item',
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
                  text: 'Create a new item',
                  weight: 'Bolder',
                  size: 'Large',
                },
                {
                  type: 'Input.Text',
                  id: 'title',
                  label: 'Title',
                  isRequired: true,
                  errorMessage: 'Title is required',
                },
                {
                  type: 'Input.Text',
                  id: 'description',
                  label: 'Description',
                  isMultiline: true,
                },
                {
                  type: 'Input.ChoiceSet',
                  id: 'priority',
                  label: 'Priority',
                  value: 'medium',
                  choices: [
                    { title: 'Low', value: 'low' },
                    { title: 'Medium', value: 'medium' },
                    { title: 'High', value: 'high' },
                  ],
                },
              ],
              actions: [
                { type: 'Action.Submit', title: 'Create' },
              ],
            },
          },
        },
      },
    },
  };
});

// Process the submitted form data
app.on('message.ext.submit', async ({ activity, send }) => {
  const data = activity.value.data;
  const { title, description, priority } = data;

  // Create the item in your backend
  const itemId = `ITEM-${Date.now()}`;

  await send(`Created item "${title}" (${priority} priority) - ID: ${itemId}`);
});

app.start(3978);
```

### Combined search and action extensions

```typescript
import { App } from '@microsoft/teams.apps';

// Manifest excerpt (appPackage/manifest.json):
// {
//   "composeExtensions": [{
//     "botId": "${{BOT_ID}}",
//     "commands": [
//       {
//         "id": "searchItems",
//         "type": "query",
//         "title": "Search Items",
//         "parameters": [{ "name": "query", "title": "Search" }]
//       },
//       {
//         "id": "createItem",
//         "type": "action",
//         "title": "Create Item",
//         "fetchTask": true
//       }
//     ]
//   }]
// }

const app = new App();

// Search extension handler
app.on('message.ext.query', async ({ activity }) => {
  const query = activity.value.parameters?.[0]?.value || '';
  const commandId = activity.value.commandId;

  // You can route by commandId if multiple search commands exist
  const items = [
    { id: '1', title: 'Task Alpha', status: 'open' },
    { id: '2', title: 'Task Beta', status: 'closed' },
  ].filter(i => i.title.toLowerCase().includes(query.toLowerCase()));

  return {
    status: 200,
    body: {
      composeExtension: {
        type: 'result',
        attachmentLayout: 'list',
        attachments: items.map(item => ({
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
              { type: 'TextBlock', text: item.title, weight: 'Bolder' },
              { type: 'TextBlock', text: `Status: ${item.status}` },
            ],
          },
          preview: {
            contentType: 'application/vnd.microsoft.card.thumbnail',
            content: {
              title: item.title,
              text: `Status: ${item.status}`,
            },
          },
        })),
      },
    },
  };
});

// Action extension: open form
app.on('message.ext.open', async () => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'Create Item',
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [
                { type: 'Input.Text', id: 'title', label: 'Title', isRequired: true },
                { type: 'Input.Text', id: 'notes', label: 'Notes', isMultiline: true },
              ],
              actions: [
                { type: 'Action.Submit', title: 'Create' },
              ],
            },
          },
        },
      },
    },
  };
});

// Action extension: process submission
app.on('message.ext.submit', async ({ activity, send }) => {
  const { title, notes } = activity.value.data;
  await send(`Created: ${title}${notes ? ` - ${notes}` : ''}`);
});

app.start(3978);
```

## pitfalls

- **Missing manifest `composeExtensions`**: Message extensions require the `composeExtensions` array in the manifest. Without it, the extension does not appear in the Teams compose box. Update the manifest and re-sideload after changes.
- **Empty query handling**: Users often open the search extension without typing. Handle empty or blank `query` strings by returning popular/recent results instead of an empty list.
- **Missing preview card**: Each search result attachment must include a `preview` with `contentType: 'application/vnd.microsoft.card.thumbnail'`. Without it, the result appears blank in the search results list.
- **Wrong route handler**: Search uses `message.ext.query` (not `message.ext.open`). Action uses `message.ext.open` + `message.ext.submit`. Mixing them up results in handlers never firing.
- **Too many results**: Teams limits the number of displayed results. Return 10-15 items maximum. Longer lists are silently truncated.
- **Attachment layout mismatch**: Using `'grid'` layout requires images in the preview. Using `'grid'` with text-only thumbnails produces a poor visual experience. Match layout to content type.
- **Not setting `fetchTask: true` for action commands**: In the manifest, action commands must have `"fetchTask": true` for the `message.ext.open` handler to fire. Without it, Teams does not invoke the task module.
- **Preview vs content confusion**: The `preview` is what users see in the results dropdown. The `content` is what gets inserted when they select it. A missing or incorrect `content` card means the wrong card (or nothing) is inserted.

## references

- [Message extensions overview](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
- [Define search commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/define-search-command)
- [Respond to search commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/respond-to-search)
- [Define action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
- [Respond to action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit)
- [Link unfurling](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)

## instructions

This expert covers search-based and action-based message extensions (compose extensions) in Microsoft Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`) in TypeScript. Use it when you need to:

- Configure `composeExtensions` in the manifest with search (`query`) or action commands
- Handle search queries with `app.on('message.ext.query', ...)` and return result attachments with previews
- Handle action extensions with `app.on('message.ext.open', ...)` for task modules and `app.on('message.ext.submit', ...)` for processing
- Build thumbnail preview cards for search results
- Choose between `'list'` and `'grid'` attachment layouts
- Combine search and action commands in a single extension

Pair with `ui.adaptive-cards-ts.md` for card construction and `ui.dialogs-task-modules-ts.md` for task module patterns used in action extensions. Pair with `runtime.manifest-ts.md` for composeExtensions manifest configuration, and `ui.adaptive-cards-ts.md` for building card attachments returned by extensions.

## research

Deep Research prompt:

"Write a micro expert on Message Extensions in Teams (TypeScript). Cover manifest composeExtensions configuration, search-based query flow (message.ext.query handler, parameters, result attachments with preview), action-based flow (message.ext.open for task module, message.ext.submit for processing), attachment layouts (list/grid), thumbnail preview cards, link unfurling, and common pitfalls. Include 2-3 canonical TypeScript code examples."
