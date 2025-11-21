---
description: 'Complete PCF API reference with all interfaces and their availability in model-driven and canvas apps'
applyTo: '**/*.{ts,tsx,js}'
---

# Power Apps Component Framework API Reference

The Power Apps component framework provides a rich set of APIs that enable you to create powerful code components. This reference lists all available interfaces and their availability across different app types.

## API Availability

The following table shows all API interfaces available in the Power Apps component framework, along with their availability in model-driven apps and canvas apps.

| API | Model-driven apps | Canvas apps |
|-----|------------------|-------------|
| AttributeMetadata | Yes | No |
| Client | Yes | Yes |
| Column | Yes | Yes |
| ConditionExpression | Yes | Yes |
| Context | Yes | Yes |
| DataSet | Yes | Yes |
| Device | Yes | Yes |
| Entity | Yes | Yes |
| Events | Yes | Yes |
| Factory | Yes | Yes |
| Filtering | Yes | Yes |
| Formatting | Yes | Yes |
| ImageObject | Yes | Yes |
| Linking | Yes | Yes |
| Mode | Yes | Yes |
| Navigation | Yes | Yes |
| NumberFormattingInfo | Yes | Yes |
| Paging | Yes | Yes |
| Popup | Yes | Yes |
| PopupService | Yes | Yes |
| PropertyHelper | Yes | Yes |
| Resources | Yes | Yes |
| SortStatus | Yes | Yes |
| StandardControl | Yes | Yes |
| UserSettings | Yes | Yes |
| Utility | Yes | Yes |
| WebApi | Yes | Yes |

## Key API Namespaces

### Context APIs

The `Context` object provides access to all framework capabilities and is passed to your component's lifecycle methods. It contains:

- **Client**: Information about the client (form factor, network status)
- **Device**: Device capabilities (camera, location, microphone)
- **Factory**: Factory methods for creating framework objects
- **Formatting**: Number and date formatting
- **Mode**: Component mode and tracking
- **Navigation**: Navigation methods
- **Resources**: Access to resources (images, strings)
- **UserSettings**: User settings (locale, number format, security roles)
- **Utils**: Utility methods (getEntityMetadata, hasEntityPrivilege, lookupObjects)
- **WebApi**: Dataverse Web API methods

### Data APIs

- **DataSet**: Work with tabular data
- **Column**: Access column metadata and data
- **Entity**: Access record data
- **Filtering**: Define data filtering
- **Linking**: Define relationships
- **Paging**: Handle data pagination
- **SortStatus**: Manage sorting

### UI APIs

- **Popup**: Create popup dialogs
- **PopupService**: Manage popup lifecycle
- **Mode**: Get component rendering mode

### Metadata APIs

- **AttributeMetadata**: Column metadata (model-driven only)
- **PropertyHelper**: Property metadata helpers

### Standard Control

- **StandardControl**: Base interface for all code components with lifecycle methods:
  - `init()`: Initialize component
  - `updateView()`: Update component UI
  - `destroy()`: Cleanup resources
  - `getOutputs()`: Return output values

## Usage Guidelines

### Model-Driven vs Canvas Apps

Some APIs are only available in model-driven apps due to platform differences:

- **AttributeMetadata**: Model-driven only - provides detailed column metadata
- Most other APIs are available in both platforms

### API Version Compatibility

- Always check the API availability for your target platform (model-driven or canvas)
- Some APIs may have different behaviors across platforms
- Test components in the target environment to ensure compatibility

### Common Patterns

1. **Accessing Context APIs**
   ```typescript
   // In init or updateView
   const userLocale = context.userSettings.locale;
   const isOffline = context.client.isOffline();
   ```

2. **Working with DataSet**
   ```typescript
   // Access dataset records
   const records = context.parameters.dataset.records;
   
   // Get sorted columns
   const sortedColumns = context.parameters.dataset.sorting;
   ```

3. **Using WebApi**
   ```typescript
   // Retrieve records
   context.webAPI.retrieveMultipleRecords("account", "?$select=name");
   
   // Create record
   context.webAPI.createRecord("contact", data);
   ```

4. **Device Capabilities**
   ```typescript
   // Capture image
   context.device.captureImage();
   
   // Get current position
   context.device.getCurrentPosition();
   ```

5. **Formatting**
   ```typescript
   // Format date
   context.formatting.formatDateLong(date);
   
   // Format number
   context.formatting.formatDecimal(value);
   ```

## Best Practices

1. **Type Safety**: Use TypeScript for type checking and IntelliSense
2. **Null Checks**: Always check for null/undefined before accessing API objects
3. **Error Handling**: Wrap API calls in try-catch blocks
4. **Platform Detection**: Check `context.client.getFormFactor()` to adapt behavior
5. **API Availability**: Verify API availability for your target platform before use
6. **Performance**: Cache API results when appropriate to avoid repeated calls

## Additional Resources

- For detailed documentation on each API, refer to the [Power Apps component framework API reference](https://learn.microsoft.com/power-apps/developer/component-framework/reference/)
- Sample code for each API is available in the [PowerApps-Samples repository](https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework)
