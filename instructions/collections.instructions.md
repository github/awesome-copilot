---
description: 'Guidelines for creating and managing awesome-copilot collections'
applyTo: 'collections/*.collection.yml'
---

# Collections Development

## Collection Instructions

When working with collections in the awesome-copilot repository:

- Always validate collections using `node validate-collections.js` before committing
- Follow the established YAML schema for collection manifests
- Reference only existing files in the repository
- Use descriptive collection IDs with lowercase letters, numbers, and hyphens
- Keep collections focused on specific workflows or themes
- Test that all referenced items work well together

## Collection Structure

- **Required fields**: id, name, description, items
- **Optional fields**: tags, display
- **Item requirements**: path must exist, kind must match file extension
- **Display options**: ordering (alpha/manual), show_badge (true/false)

## Validation Rules

- Collection IDs must be unique across all collections
- File paths must exist and match the item kind
- Tags must use lowercase letters, numbers, and hyphens only
- Collections must contain 1-50 items
- Descriptions must be 1-500 characters

## Best Practices

- Group 3-10 related items for optimal usability  
- Use clear, descriptive names and descriptions
- Add relevant tags for discoverability
- Test the complete workflow the collection enables
- Ensure items complement each other effectively

## File Organization

- Collections don't require file reorganization
- Items can be located anywhere in the repository
- Use relative paths from repository root
- Maintain existing directory structure (prompts/, instructions/, agents/)

## Generation Process

- Collections automatically generate README files via `npm start`
- Individual collection pages are created in collections/ directory
- Main collections overview is generated as README.collections.md
- VS Code install badges are automatically created for each item
