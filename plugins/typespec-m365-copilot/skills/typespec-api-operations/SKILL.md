---
name: typespec-api-operations
description: 'Add GET, POST, PATCH, and DELETE operations to a TypeSpec API plugin with proper routing, parameters, and adaptive cards'
---

# Add TypeSpec API Operations

Add RESTful operations to an existing TypeSpec API plugin for Microsoft 365 Copilot.

## Adding GET Operations

### Simple GET - List All Items
```typescript
/**
 * List all items.
 */
@route("/items")
@get op listItems(): Item[];
```

### GET with Query Parameter - Filter Results
```typescript
/**
 * List items filtered by criteria.
 * @param userId Optional user ID to filter items
 */
@route("/items")
@get op listItems(@query userId?: integer): Item[];
```

### GET with Path Parameter - Get Single Item
```typescript
/**
 * Get a specific item by ID.
 * @param id The ID of the item to retrieve
 */
@route("/items/{id}")
@get op getItem(@path id: integer): Item;
```

### GET with Adaptive Card
```typescript
/**
 * List items with adaptive card visualization.
 */
@route("/items")
@card(#{
  dataPath: "$",
  title: "$.title",
  file: "item-card.json"
})
@get op listItems(): Item[];
```

**Create the Adaptive Card** (`appPackage/item-card.json`):
```json
{
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
          "text": "**${if(title, title, 'N/A')}**",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "${if(description, description, 'N/A')}",
          "wrap": true
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Details",
      "url": "https://example.com/items/${id}"
    }
  ]
}
```

## Adding POST Operations

### Simple POST - Create Item
```typescript
/**
 * Create a new item.
 * @param item The item to create
 */
@route("/items")
@post op createItem(@body item: CreateItemRequest): Item;

model CreateItemRequest {
  title: string;
  description?: string;
  userId: integer;
}
```

### POST with Confirmation
```typescript
/**
 * Create a new item with confirmation.
 */
@route("/items")
@post
@capabilities(#{
  confirmation: #{
    type: "AdaptiveCard",
    title: "Create Item",
    body: """
    Are you sure you want to create this item?
      * **Title**: {{ function.parameters.item.title }}
      * **User ID**: {{ function.parameters.item.userId }}
    """
  }
})
op createItem(@body item: CreateItemRequest): Item;
```

## Adding PATCH Operations

### Simple PATCH - Update Item
```typescript
/**
 * Update an existing item.
 * @param id The ID of the item to update
 * @param item The updated item data
 */
@route("/items/{id}")
@patch op updateItem(
  @path id: integer,
  @body item: UpdateItemRequest
): Item;

model UpdateItemRequest {
  title?: string;
  description?: string;
  status?: "active" | "completed" | "archived";
}
```

### PATCH with Confirmation
```typescript
/**
 * Update an item with confirmation.
 */
@route("/items/{id}")
@patch
@capabilities(#{
  confirmation: #{
    type: "AdaptiveCard",
    title: "Update Item",
    body: """
    Updating item #{{ function.parameters.id }}:
      * **Title**: {{ function.parameters.item.title }}
      * **Status**: {{ function.parameters.item.status }}
    """
  }
})
op updateItem(
  @path id: integer,
  @body item: UpdateItemRequest
): Item;
```

## Adding DELETE Operations

### Simple DELETE
```typescript
/**
 * Delete an item.
 * @param id The ID of the item to delete
 */
@route("/items/{id}")
@delete op deleteItem(@path id: integer): void;
```

### DELETE with Confirmation
```typescript
/**
 * Delete an item with confirmation.
 */
@route("/items/{id}")
@delete
@capabilities(#{
  confirmation: #{
    type: "AdaptiveCard",
    title: "Delete Item",
    body: """
    ⚠️ Are you sure you want to delete item #{{ function.parameters.id }}?
    This action cannot be undone.
    """
  }
})
op deleteItem(@path id: integer): void;
```

## Complete CRUD Example

### Define the Service and Models
```typescript
@service
@server("https://api.example.com")
@actions(#{
  nameForHuman: "Items API",
  descriptionForHuman: "Manage items",
  descriptionForModel: "Read, create, update, and delete items"
})
namespace ItemsAPI {
  
  // Models
  model Item {
    @visibility(Lifecycle.Read)
    id: integer;
    
    userId: integer;
    title: string;
    description?: string;
    status: "active" | "completed" | "archived";
    
    @format("date-time")
    createdAt: utcDateTime;
    
    @format("date-time")
    updatedAt?: utcDateTime;
  }

  model CreateItemRequest {
    userId: integer;
    title: string;
    description?: string;
  }

  model UpdateItemRequest {
    title?: string;
    description?: string;
    status?: "active" | "completed" | "archived";
  }

  // Operations
  @route("/items")
  @card(#{ dataPath: "$", title: "$.title", file: "item-card.json" })
  @get op listItems(@query userId?: integer): Item[];

  @route("/items/{id}")
  @card(#{ dataPath: "$", title: "$.title", file: "item-card.json" })
  @get op getItem(@path id: integer): Item;

  @route("/items")
  @post
  @capabilities(#{
    confirmation: #{
      type: "AdaptiveCard",
      title: "Create Item",
      body: "Creating: **{{ function.parameters.item.title }}**"
    }
  })
  op createItem(@body item: CreateItemRequest): Item;

  @route("/items/{id}")
  @patch
  @capabilities(#{
    confirmation: #{
      type: "AdaptiveCard",
      title: "Update Item",
      body: "Updating item #{{ function.parameters.id }}"
    }
  })
  op updateItem(@path id: integer, @body item: UpdateItemRequest): Item;

  @route("/items/{id}")
  @delete
  @capabilities(#{
    confirmation: #{
      type: "AdaptiveCard",
      title: "Delete Item",
      body: "⚠️ Delete item #{{ function.parameters.id }}?"
    }
  })
  op deleteItem(@path id: integer): void;
}
```

## Advanced Features

### Multiple Query Parameters
```typescript
@route("/items")
@get op listItems(
  @query userId?: integer,
  @query status?: "active" | "completed" | "archived",
  @query limit?: integer,
  @query offset?: integer
): ItemList;

model ItemList {
  items: Item[];
  total: integer;
  hasMore: boolean;
}
```

### Header Parameters
```typescript
@route("/items")
@get op listItems(
  @header("X-API-Version") apiVersion?: string,
  @query userId?: integer
): Item[];
```

### Custom Response Models
```typescript
@route("/items/{id}")
@delete op deleteItem(@path id: integer): DeleteResponse;

model DeleteResponse {
  success: boolean;
  message: string;
  deletedId: integer;
}
```

### Error Responses
```typescript
model ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}

@route("/items/{id}")
@get op getItem(@path id: integer): Item | ErrorResponse;
```

## Testing Prompts

After adding operations, test with these prompts:

**GET Operations:**
- "List all items and show them in a table"
- "Show me items for user ID 1"
- "Get the details of item 42"

**POST Operations:**
- "Create a new item with title 'My Task' for user 1"
- "Add an item: title 'New Feature', description 'Add login'"

**PATCH Operations:**
- "Update item 10 with title 'Updated Title'"
- "Change the status of item 5 to completed"

**DELETE Operations:**
- "Delete item 99"
- "Remove the item with ID 15"

## Best Practices

### Parameter Naming
- Use descriptive parameter names: `userId` not `uid`
- Be consistent across operations
- Use optional parameters (`?`) for filters

### Documentation
- Add JSDoc comments to all operations
- Describe what each parameter does
- Document expected responses

### Models
- Use `@visibility(Lifecycle.Read)` for read-only fields like `id`
- Use `@format("date-time")` for date fields
- Use union types for enums: `"active" | "completed"`
- Make optional fields explicit with `?`

### Confirmations
- Always add confirmations to destructive operations (DELETE, PATCH)
- Show key details in confirmation body
- Use warning emoji (⚠️) for irreversible actions

### Adaptive Cards
- Keep cards simple and focused
- Use conditional rendering with `${if(..., ..., 'N/A')}`
- Include action buttons for common next steps
- Test data binding with actual API responses

### Routing
- Use RESTful conventions:
  - `GET /items` - List
  - `GET /items/{id}` - Get one
  - `POST /items` - Create
  - `PATCH /items/{id}` - Update
  - `DELETE /items/{id}` - Delete
- Group related operations in the same namespace
- Use nested routes for hierarchical resources

## Common Issues

### Issue: Parameter not showing in Copilot
**Solution**: Check parameter is properly decorated with `@query`, `@path`, or `@body`

### Issue: Adaptive card not rendering
**Solution**: Verify file path in `@card` decorator and check JSON syntax

### Issue: Confirmation not appearing
**Solution**: Ensure `@capabilities` decorator is properly formatted with confirmation object

### Issue: Model property not appearing in response
**Solution**: Check if property needs `@visibility(Lifecycle.Read)` or remove it if it should be writable
