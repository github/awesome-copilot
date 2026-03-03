# Error Handling Patterns

> **MANDATORY**: All function implementations MUST include proper error handling with logging.

## Python

```python
import logging

try:
    # Your function logic here
    result = process_data(data)
    logging.info(f"Success: processed {item_id}")
except Exception as error:
    logging.error(f"Error processing {item_id}: {error}")
    raise  # Re-raise to trigger retry/dead-letter
```

## TypeScript

```typescript
try {
    // Your function logic here
    const result = await processData(data);
    context.log(`Success: processed ${itemId}`);
} catch (error) {
    context.error(`Error processing ${itemId}:`, error);
    throw error;  // Re-raise to trigger retry/dead-letter
}
```

## JavaScript

```javascript
try {
    // Your function logic here
    const result = await processData(data);
    context.log(`Success: processed ${itemId}`);
} catch (error) {
    context.error(`Error processing ${itemId}:`, error);
    throw error;  // Re-raise to trigger retry/dead-letter
}
```

## C# (.NET)

```csharp
try
{
    // Your function logic here
    var result = await ProcessDataAsync(data);
    _logger.LogInformation($"Success: processed {itemId}");
}
catch (Exception ex)
{
    _logger.LogError(ex, $"Error processing {itemId}");
    throw;  // Re-raise to trigger retry/dead-letter
}
```

## Java

```java
try {
    // Your function logic here
    Result result = processData(data);
    context.getLogger().info("Success: processed " + itemId);
} catch (Exception e) {
    context.getLogger().severe("Error processing " + itemId + ": " + e.getMessage());
    throw e;  // Re-raise to trigger retry/dead-letter
}
```

## PowerShell

```powershell
try {
    # Your function logic here
    $result = Process-Data -Data $data
    Write-Host "Success: processed $itemId"
}
catch {
    Write-Error "Error processing $itemId : $_"
    throw  # Re-raise to trigger retry/dead-letter
}
```

## Key Principles

1. **Always log before throwing** - Enables debugging from logs
2. **Re-throw exceptions** - Allows Functions runtime to handle retry/dead-letter
3. **Include context in logs** - Item ID, operation name, relevant metadata
4. **Use appropriate log levels** - Info for success, Error for failures
