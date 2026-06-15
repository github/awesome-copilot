# UI Components

## Block Kit vs Adaptive Cards

| Slack Block Kit | Adaptive Card Element | Notes |
|---|---|---|
| `section` (text) | `TextBlock` | Set `wrap: true`; convert `*bold*` mrkdwn → `**bold**` Markdown |
| `section` (fields) | `FactSet` | Each field becomes `{ title, value }` |
| `section` (text + accessory) | `ColumnSet` with 2 `Column`s | Col 1 = text, Col 2 = accessory |
| `header` | `TextBlock` size `Large`, weight `Bolder` | |
| `actions` | `ActionSet` | Max 6 actions in Teams (vs 25 in Slack) |
| `divider` | `TextBlock` with `separator: true` | |
| `image` | `Image` | `alt_text` (underscore) → `altText` (camelCase) |
| `context` | `TextBlock` size `Small`, `isSubtle: true` | |
| `input` (plain_text) | `Input.Text` | |
| `input` (static_select) | `Input.ChoiceSet` `style: "compact"` | |
| `input` (multi_select) | `Input.ChoiceSet` `isMultiSelect: true` | |
| `input` (datepicker) | `Input.Date` | |
| `input` (timepicker) | `Input.Time` | |
| `input` (checkboxes) | `Input.ChoiceSet` `style: "expanded"`, `isMultiSelect: true` | |
| `input` (radio_buttons) | `Input.ChoiceSet` `style: "expanded"` | |
| `rich_text` | `RichTextBlock` | Schema 1.5+ |
| `overflow` menu | **No equivalent** | Redesign as `ActionSet` or `Input.ChoiceSet` dropdown |

**Rating:** GREEN for most elements, RED for overflow menus.

### Markdown Differences

| Formatting | Slack mrkdwn | Adaptive Card Markdown |
|---|---|---|
| Bold | `*bold*` | `**bold**` |
| Italic | `_italic_` | `_italic_` |
| Strikethrough | `~strike~` | `~~strike~~` |
| Code | `` `code` `` | `` `code` `` |
| Emoji | `:emoji_shortcode:` | Unicode characters only |
| User mention | `<@U12345>` | Display name (no mention syntax) |

**Impact:** Failing to convert `*bold*` to `**bold**` produces literal asterisks in Teams. Slack emoji shortcodes render as plain text in Adaptive Cards.

**Mitigation:** Apply a text transform function when converting between formats:

```typescript
// Slack mrkdwn → Adaptive Card Markdown
text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "**$1**")
    .replace(/~([^~]+)~/g, "~~$1~~");

// Adaptive Card Markdown → Slack mrkdwn
text.replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/~~([^~]+)~~/g, "~$1~");
```

### Button / Action Styles

| Slack | Adaptive Card | Visual |
|---|---|---|
| `"primary"` | `"positive"` | Green |
| `"danger"` | `"destructive"` | Red |
| (default) | `"default"` | Neutral |

### Interaction Model Difference

This is the **biggest behavioral shift** between platforms:

| Aspect | Slack | Teams |
|---|---|---|
| Model | **Event-per-interaction** — every select/button fires immediately | **Form-then-submit** — inputs collect, submit sends all at once |
| Select behavior | `static_select` fires `block_actions` on selection | `Input.ChoiceSet` does nothing until `Action.Submit` clicked |
| Live updates | `dispatch_action: true` for real-time `block_actions` | No equivalent — use `Action.Execute` with refresh for critical cases |
| Form data | Per-element: `action.selected_option.value` | Batched: `activity.value` contains all input IDs |

**Impact:** Bots that rely on instant-fire selects to update UI dynamically will feel different in Teams. The Teams UX has fewer round trips but less reactivity.

**Mitigation:** Accept the batch-submit model for Teams. Group related inputs and submit together. For cases requiring per-interaction updates, use `Action.Execute` with the `refresh` property (schema 1.4+).

### Block / Action Limits

| Limit | Slack | Teams |
|---|---|---|
| Blocks per message | 50 | No formal block limit, but 28 KB payload max |
| Blocks per modal/view | 100 | 28 KB payload max |
| Actions per block | 25 per `actions` block | 6 per `ActionSet` |
| Card payload size | No formal limit | 28 KB after JSON serialization |

**Mitigation:** Paginate dense action rows into multiple cards. Consolidate overflow menus into `Input.ChoiceSet` dropdowns.

---

## Modals vs Dialogs (Task Modules)

| Aspect | Slack Modal | Teams Dialog (Task Module) |
|---|---|---|
| Open | `views.open(trigger_id, view)` | Return card from `dialog.open` handler |
| Submit handler | `app.view("callback_id")` | `app.on("dialog.submit")` |
| Form data location | `view.state.values[block_id][action_id]` | `activity.value.data` (flat object keyed by input `id`) |
| Stacking | `views.push()` — up to 3 levels | **Not supported** |
| Cancel notification | `notify_on_close: true` → `view_closed` | **Not supported** |
| Mid-form updates | `dispatch_action` + `block_actions` + `views.update` | **Not supported** |
| Field validation | `ack({ response_action: "errors", errors })` | Client-side only (`isRequired`, `regex`) |
| Private metadata | `private_metadata` (3000 char limit) | Hidden fields in `Action.Submit.data` |
| View hash (race protection) | `view_hash` parameter in `views.update` | **Not supported** — manual `_version` field needed |

**Rating:** YELLOW for basic modal-to-dialog, RED for stacking, cancel notifications, and mid-form updates.

### Mitigation Strategies

| Gap | Strategy | Effort |
|---|---|---|
| **No stacking** | Flatten into single dialog with step routing in submit handler. Include a "Back" button that re-renders the previous step. | 8–16 hrs |
| **No cancel notification** | Add explicit "Cancel" button inside the dialog. Implement 5-min timeout-based cleanup for stale locks. | 4–8 hrs |
| **No mid-form updates** | Multi-step dialogs for dependent fields. `Action.ToggleVisibility` for simple show/hide. | 8–16 hrs |
| **No server-side validation** | Re-open dialog with pre-populated data + error messages in field labels. Use client-side `isRequired`/`regex` where possible. | 4–8 hrs |
| **No view hash** | Inject `_version` counter into `Action.Submit.data`. Reject stale updates server-side. | 2–4 hrs |

### Reverse Direction (Teams → Slack)

Dialogs map to modals via `views.open()`. Teams' batch-submit model decomposes into Slack's per-element handlers. Client-side validation (`isRequired`, `regex`) becomes server-side validation in `view_submission`.

---

## App Home vs Personal Tab

| Aspect | Slack App Home | Teams Personal Tab |
|---|---|---|
| Render | `views.publish()` with Block Kit | `tab.fetch` handler returns Adaptive Card, or `staticTabs` in manifest for web |
| Trigger | `app_home_opened` event | `tab.fetch` fires on every tab open |
| Dynamic updates | `views.publish()` any time | `tab.submit` for interactions within tab |
| Race protection | `view_hash` parameter | **Not supported** |

**Rating:** YELLOW — functional equivalent exists, different event model.

### Mitigation Strategies

| Strategy | How | Effort |
|---|---|---|
| **`tab.fetch` handler (Recommended)** | Return Adaptive Card on every tab open. Closest to `app_home_opened`. | 4–8 hrs |
| **Welcome message only** | Send card to 1:1 chat on `install.add`. Simple but fires once. | 1–2 hrs |
| **Static web tab** | Full web page in iframe. Richer UI but needs hosting. | 8–16 hrs |
