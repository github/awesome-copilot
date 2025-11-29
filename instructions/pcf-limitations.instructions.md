---
description: 'Limitations and restrictions of Power Apps Component Framework'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj}'
---

# Limitations

With Power Apps component framework, you can create your own code components to improve the user experience in Power Apps and Power Pages. Even though you can create your own components, there are some limitations that restrict developers implementing some features in the code components. Below are some of the limitations:

## 1. Dataverse Dependent APIs Not Available for Canvas Apps

Microsoft Dataverse dependent APIs, including WebAPI, are not available for Power Apps canvas applications yet. For individual API availability, see [Power Apps component framework API reference](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/).

## 2. Bundle External Libraries or Use Platform Libraries

Code components should either use [React controls & platform libraries](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/react-controls-platform-libraries) or bundle all the code including external library content into the primary code bundle. 

To see an example of how the Power Apps command line interface can help with bundling your external library content into a component-specific bundle, see [Angular flip component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/sample-controls/angular-flip-control) example.

## 3. Do Not Use HTML Web Storage Objects

Code components should not use the HTML web storage objects, like `window.localStorage` and `window.sessionStorage`, to store data. Data stored locally on the user's browser or mobile client is not secure and not guaranteed to be available reliably.

## 4. Custom Auth Not Supported in Canvas Apps

Custom auth in code components is not supported in Power Apps canvas applications. Use connectors to get data and take actions instead.

## Related Topics

- [Power Apps component framework API reference](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/)
- [Power Apps component framework overview](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview)
