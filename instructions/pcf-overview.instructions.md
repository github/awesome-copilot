---
description: 'Power Apps Component Framework overview and fundamentals'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj}'
---

# Power Apps Component Framework Overview

Power Apps component framework empowers professional developers and app makers to create code components for model-driven and canvas apps. These code components can be used to enhance the user experience for users working with data on forms, views, dashboards, and canvas app screens.

## Key Capabilities

You can use PCF to:
- Replace a column on a form that displays a numeric text value with a `dial` or `slider` code component
- Transform a list into an entirely different visual experience bound to the dataset, like a `Calendar` or `Map`

## Important Limitations

- Power Apps component framework works only on Unified Interface and not on the legacy web client
- Power Apps component framework is currently not supported for on-premises environments

## How PCF Differs from Web Resources

Unlike HTML web resources, code components are:
- Rendered as part of the same context
- Loaded at the same time as any other components
- Provide a seamless experience for the user

Code components can be:
- Used across the full breadth of Power Apps capabilities
- Reused many times across different tables and forms
- Bundled with all HTML, CSS, and TypeScript files into a single solution package
- Moved across environments
- Made available via AppSource

## Key Advantages

### Rich Framework APIs
- Component lifecycle management
- Contextual data and metadata access
- Seamless server access via Web API
- Utility and data formatting methods
- Device features: camera, location, microphone
- User experience elements: dialogs, lookups, full-page rendering

### Development Benefits
- Support for modern web practices
- Optimized for performance
- High reusability
- Bundle all files into a single solution file
- Handle being destroyed and reloaded for performance reasons while preserving state

## Licensing Requirements

Power Apps component framework licensing is based on the type of data and connections used:

### Premium Code Components
Code components that connect to external services or data directly via the user's browser client (not through connectors):
- Considered premium components
- Apps using these become premium
- End-users require Power Apps licenses

Declare as premium by adding to manifest:
```xml
<external-service-usage enabled="true">
  <domain>www.microsoft.com</domain>
</external-service-usage>
```

### Standard Code Components
Code components that don't connect to external services or data:
- Apps using these with standard features remain standard
- End-users require minimum Office 365 license

**Note**: If using code components in model-driven apps connected to Microsoft Dataverse, end users will require Power Apps licenses.

## Related Resources

- [What are code components?](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/custom-controls-overview)
- [Code components for canvas apps](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/component-framework-for-canvas-apps)
- [Create and build a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/create-custom-controls-using-pcf)
- [Learn Power Apps component framework](https://learn.microsoft.com/en-us/training/paths/use-power-apps-component-framework)
- [Use code components in Power Pages](https://learn.microsoft.com/en-us/power-apps/maker/portals/component-framework)

## Training Resources

- [Create components with Power Apps Component Framework - Training](https://learn.microsoft.com/en-us/training/paths/create-components-power-apps-component-framework/)
- [Microsoft Certified: Power Platform Developer Associate](https://learn.microsoft.com/en-us/credentials/certifications/power-platform-developer-associate/)
