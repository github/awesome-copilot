````prompt
---
mode: 'agent'
tools: ['changes', 'search/codebase', 'edit/editFiles', 'problems']
description: 'Add Adaptive Card response templates to MCP-based API plugins for visual data presentation in Microsoft 365 Copilot'
model: 'gpt-4.1'
tags: [mcp, adaptive-cards, m365-copilot, api-plugin, response-templates]
---

# Create Adaptive Cards for MCP Plugins

Add Adaptive Card response templates to MCP-based API plugins to enhance how data is presented visually in Microsoft 365 Copilot.

## Adaptive Card Types

### Static Response Templates
Use when API always returns items of the same type and format doesn't change often.

Define in `response_semantics.static_template` in ai-plugin.json:

```json
{
  "functions": [
    {
      "name": "GetBudgets",
      "description": "Returns budget details including name and available funds",
      "capabilities": {
        "response_semantics": {
          "data_path": "$",
          "properties": {
            "title": "$.name",
            "subtitle": "$.availableFunds"
          },
          "static_template": {
            "type": "AdaptiveCard",
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "version": "1.5",
            "body": [
              {
                "type": "Container",
                "$data": "${$root}",
                "items": [
                  {
                    "type": "TextBlock",
                    "text": "Name: ${if(name, name, 'N/A')}",
                    "wrap": true
                  },
                  {
                    "type": "TextBlock",
                    "text": "Available funds: ${if(availableFunds, formatNumber(availableFunds, 2), 'N/A')}",
                    "wrap": true
                  }
                ]
              }
            ]
          }
        }
      }
    }
  ]
}
```

### Dynamic Response Templates
Use when API returns multiple types and each item needs a different template.

**ai-plugin.json configuration:**
```json
{
  "name": "GetTransactions",
  "description": "Returns transaction details with dynamic templates",
  "capabilities": {
    "response_semantics": {
      "data_path": "$.transactions",
      "properties": {
        "template_selector": "$.displayTemplate"
      }
    }
  }
}
```

**API Response with Embedded Templates:**
```json
{
  "transactions": [
    {
      "budgetName": "Fourth Coffee lobby renovation",
      "amount": -2000,
      "description": "Property survey for permit application",
      "expenseCategory": "permits",
      "displayTemplate": "$.templates.debit"
    },
    {
      "budgetName": "Fourth Coffee lobby renovation",
      "amount": 5000,
      "description": "Additional funds to cover cost overruns",
      "expenseCategory": null,
      "displayTemplate": "$.templates.credit"
    }
  ],
  "templates": {
    "debit": {
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "size": "medium",
          "weight": "bolder",
          "color": "attention",
          "text": "Debit"
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Budget",
              "value": "${budgetName}"
            },
            {
              "title": "Amount",
              "value": "${formatNumber(amount, 2)}"
            },
            {
              "title": "Category",
              "value": "${if(expenseCategory, expenseCategory, 'N/A')}"
            },
            {
              "title": "Description",
              "value": "${if(description, description, 'N/A')}"
            }
          ]
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
    },
    "credit": {
      "type": "AdaptiveCard",
      "version": "1.5",
      "body": [
        {
          "type": "TextBlock",
          "size": "medium",
          "weight": "bolder",
          "color": "good",
          "text": "Credit"
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Budget",
              "value": "${budgetName}"
            },
            {
              "title": "Amount",
              "value": "${formatNumber(amount, 2)}"
            },
            {
              "title": "Description",
              "value": "${if(description, description, 'N/A')}"
            }
          ]
        }
      ],
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json"
    }
  }
}
```

### Combined Static and Dynamic Templates
Use static template as default when item doesn't have template_selector or when value doesn't resolve.

```json
{
  "capabilities": {
    "response_semantics": {
      "data_path": "$.items",
      "properties": {
        "title": "$.name",
        "template_selector": "$.templateId"
      },
      "static_template": {
        "type": "AdaptiveCard",
        "version": "1.5",
        "body": [
          {
            "type": "TextBlock",
            "text": "Default: ${name}",
            "wrap": true
          }
        ]
      }
    }
  }
}
```

## Response Semantics Properties

### data_path
JSONPath query indicating where data resides in API response:
```json
"data_path": "$"           // Root of response
"data_path": "$.results"   // In results property
"data_path": "$.data.items"// Nested path
```

### properties
Map response fields for Copilot citations:
```json
"properties": {
  "title": "$.name",            // Citation title
  "subtitle": "$.description",  // Citation subtitle
  "url": "$.link"               // Citation link
}
```

### template_selector
Property on each item indicating which template to use:
```json
"template_selector": "$.displayTemplate"
```

## Adaptive Card Template Language

### Conditional Rendering
```json
{
  "type": "TextBlock",
  "text": "${if(field, field, 'N/A')}"  // Show field or 'N/A'
}
```

### Number Formatting
```json
{
  "type": "TextBlock",
  "text": "${formatNumber(amount, 2)}"  // Two decimal places
}
```

### Data Binding
```json
{
  "type": "Container",
  "$data": "${$root}",  // Break to root context
  "items": [ ... ]
}
```

### Conditional Display
```json
{
  "type": "Image",
  "url": "${imageUrl}",
  "$when": "${imageUrl != null}"  // Only show if imageUrl exists
}
```

## Card Elements

### TextBlock
```json
{
  "type": "TextBlock",
  "text": "Text content",
  "size": "medium",      // small, default, medium, large, extraLarge
  "weight": "bolder",    // lighter, default, bolder
  "color": "attention",  // default, dark, light, accent, good, warning, attention
  "wrap": true
}
```

### FactSet
```json
{
  "type": "FactSet",
  "facts": [
    {
      "title": "Label",
      "value": "Value"
    }
  ]
}
```

### Image
```json
{
  "type": "Image",
  "url": "https://example.com/image.png",
  "size": "medium",  // auto, stretch, small, medium, large
  "style": "default" // default, person
}
```

### Container
```json
{
  "type": "Container",
  "$data": "${items}",  // Iterate over array
  "items": [
    {
      "type": "TextBlock",
      "text": "${name}"
    }
  ]
}
```

### ColumnSet
```json
{
  "type": "ColumnSet",
  "columns": [
    {
      "type": "Column",
      "width": "auto",
      "items": [ ... ]
    },
    {
      "type": "Column",
      "width": "stretch",
      "items": [ ... ]
    }
  ]
}
```

### Actions
```json
{
  "type": "Action.OpenUrl",
  "title": "View Details",
  "url": "https://example.com/item/${id}"
}
```

## Responsive Design Best Practices

### Single-Column Layouts
- Use single columns for narrow viewports
- Avoid multi-column layouts when possible
- Ensure cards work at minimum viewport width

### Flexible Widths
- Don't assign fixed widths to elements
- Use "auto" or "stretch" for width properties
- Allow elements to resize with viewport
- Fixed widths OK for icons/avatars only

### Text and Images
- Avoid placing text and images in same row
- Exception: Small icons or avatars
- Use "wrap": true for text content
- Test at various viewport widths

### Test Across Hubs
Validate cards in:
- Teams (desktop and mobile)
- Word
- PowerPoint
- Various viewport widths (contract/expand UI)

## Complete Example

**ai-plugin.json:**
```json
{
  "functions": [
    {
      "name": "SearchProjects",
      "description": "Search for projects with status and details",
      "capabilities": {
        "response_semantics": {
          "data_path": "$.projects",
          "properties": {
            "title": "$.name",
            "subtitle": "$.status",
            "url": "$.projectUrl"
          },
          "static_template": {
            "type": "AdaptiveCard",
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "version": "1.5",
            "body": [
              {
                "type": "Container",
                "$data": "${$root}",
                "items": [
                  {
                    "type": "TextBlock",
                    "size": "medium",
                    "weight": "bolder",
                    "text": "${if(name, name, 'Untitled Project')}",
                    "wrap": true
                  },
                  {
                    "type": "FactSet",
                    "facts": [
                      {
                        "title": "Status",
                        "value": "${status}"
                      },
                      {
                        "title": "Owner",
                        "value": "${if(owner, owner, 'Unassigned')}"
                      },
                      {
                        "title": "Due Date",
                        "value": "${if(dueDate, dueDate, 'Not set')}"
                      },
                      {
                        "title": "Budget",
                        "value": "${if(budget, formatNumber(budget, 2), 'N/A')}"
                      }
                    ]
                  },
                  {
                    "type": "TextBlock",
                    "text": "${if(description, description, 'No description')}",
                    "wrap": true,
                    "separator": true
                  }
                ]
              }
            ],
            "actions": [
              {
                "type": "Action.OpenUrl",
                "title": "View Project",
                "url": "${projectUrl}"
              }
            ]
          }
        }
      }
    }
  ]
}
```

## Workflow

Ask the user:
1. What type of data does the API return?
2. Are all items the same type (static) or different types (dynamic)?
3. What fields should appear in the card?
4. Should there be actions (e.g., "View Details")?
5. Are there multiple states or categories requiring different templates?

Then generate:
- Appropriate response_semantics configuration
- Static template, dynamic templates, or both
- Proper data binding with conditional rendering
- Responsive single-column layout
- Test scenarios for validation

## Resources

- [Adaptive Card Designer](https://adaptivecards.microsoft.com/designer) - Visual design tool
- [Adaptive Card Schema](https://adaptivecards.io/schemas/adaptive-card.json) - Full schema reference
- [Template Language](https://learn.microsoft.com/en-us/adaptive-cards/templating/language) - Binding syntax guide
- [JSONPath](https://www.rfc-editor.org/rfc/rfc9535) - Path query syntax

## Common Patterns

### List with Images
```json
{
  "type": "Container",
  "$data": "${items}",
  "items": [
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "Image",
              "url": "${thumbnailUrl}",
              "size": "small",
              "$when": "${thumbnailUrl != null}"
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "${title}",
              "weight": "bolder",
              "wrap": true
            }
          ]
        }
      ]
    }
  ]
}
```

### Status Indicators
```json
{
  "type": "TextBlock",
  "text": "${status}",
  "color": "${if(status == 'Completed', 'good', if(status == 'In Progress', 'attention', 'default'))}"
}
```

### Currency Formatting
```json
{
  "type": "TextBlock",
  "text": "$${formatNumber(amount, 2)}"
}
```

````