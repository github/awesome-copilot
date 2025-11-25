# Collections Template

Use this template to create a new collection of related prompts, instructions, and chat modes.

## Basic Template

```yaml
id: my-collection-id
name: My Collection Name
description: A brief description of what this collection provides and who should use it.
tags: [tag1, tag2, tag3] # Optional discovery tags
items:
  - path: prompts/my-prompt.prompt.md
    kind: prompt
  - path: instructions/my-instructions.instructions.md  
    kind: instruction
  - path: agents/my-chatmode.agent.md
    kind: agent
display:
  ordering: alpha # or "manual" to preserve order above
  show_badge: false # set to true to show collection badge
```

## Field Descriptions

- **id**: Unique identifier using lowercase letters, numbers, and hyphens only
- **name**: Display name for the collection
- **description**: Brief explanation of the collection's purpose (1-500 characters)
- **tags**: Optional array of discovery tags (max 10, each 1-30 characters)
- **items**: Array of items in the collection (1-50 items)
  - **path**: Relative path from repository root to the file
  - **kind**: Must be `prompt`, `instruction`, or `chat-mode`
- **display**: Optional display settings
  - **ordering**: `alpha` (alphabetical) or `manual` (preserve order)
  - **show_badge**: Show collection badge on items (true/false)

## Creating a New Collection

### Using VS Code Tasks
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "create-collection"
4. Enter your collection ID when prompted

### Using Command Line
```bash
node create-collection.js my-collection-id
```

### Manual Creation
1. Create `collections/my-collection-id.collection.yml`
2. Use the template above as starting point
3. Add your items and customize settings
4. Run `npm run validate:collections` to validate
5. Run `npm start` to generate documentation

## Validation

Collections are automatically validated to ensure:
- Required fields are present and valid
- File paths exist and match the item kind
- IDs are unique across collections
- Tags and display settings follow the schema

Run validation manually:
```bash
npm run validate:collections
```

## File Organization

Collections don't require reorganizing existing files. Items can be located anywhere in the repository as long as the paths are correct in the manifest.

## Best Practices

1. **Meaningful Collections**: Group items that work well together for a specific workflow or use case
2. **Clear Naming**: Use descriptive names and IDs that reflect the collection's purpose
3. **Good Descriptions**: Explain who should use the collection and what benefit it provides
4. **Relevant Tags**: Add discovery tags that help users find related collections
5. **Reasonable Size**: Keep collections focused - typically 3-10 items work well
6. **Test Items**: Ensure all referenced files exist and are functional before adding to a collection
