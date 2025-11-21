---
description: 'Best practices and guidance for developing PCF code components'
applyTo: '**/*.{ts,tsx,js,json,xml,pcfproj,csproj,css,html}'
---

# Best Practices and Guidance for Code Components

Developing, deploying, and maintaining code components needs a combination of knowledge across multiple areas. This article outlines established best practices and guidance for professionals developing code components.

## Power Apps Component Framework

### Avoid Deploying Development Builds to Dataverse

Code components can be built in [production or development mode](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/code-components-alm#building-pcfproj-code-component-projects). Avoid deploying development builds to Dataverse since they adversely affect the performance and can even get blocked from deployment due to their size. Even if you plan to deploy a release build later, it can be easy to forget to redeploy if you don't have an automated release pipeline. More information: [Debugging custom controls](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/debugging-custom-controls).

### Avoid Using Unsupported Framework Methods

These include using undocumented internal methods that exist on the `ComponentFramework.Context`. These methods might work but, because they're not supported, they might stop working in future versions. Use of control script that accesses host application HTML Document Object Model (DOM) isn't supported. Any parts of the host application DOM that are outside the code component boundary, are subject to change without notice.

### Use `init` Method to Request Network Required Resources

When the hosting context loads a code component, the `init` method is first called. Use this method to request any network resources such as metadata instead of waiting for the `updateView` method. If the `updateView` method is called before the requests return, your code component must handle this state and provide a visual loading indicator.

### Clean Up Resources Inside the `destroy` Method

The hosting context calls the `destroy` method when a code component is removed from the browser DOM. Use the `destroy` method to close any `WebSockets` and remove event handlers that are added outside of the container element. If you're using React, use `ReactDOM.unmountComponentAtNode` inside the `destroy` method. Cleaning up resources in this way prevents any performance issues caused by code components being loaded and unloaded within a given browser session.

### Avoid Unnecessary Calls to Refresh on a Dataset Property

If your code component is of type dataset, the bound dataset properties expose a `refresh` method that causes the hosting context to reload the data. Calling this method unnecessarily impacts the performance of your code component.

### Minimize Calls to `notifyOutputChanged`

In some circumstances, it's undesirable for updates to a UI control (such as keypresses or mouse move events) to each call `notifyOutputChanged`, as more calls would result in many more events propagating to the parent context than needed. Instead, consider using an event when a control loses focus, or when the user's touch or mouse event completes.

### Check API Availability

When developing code components for different hosts (model-driven apps, canvas apps, portals), always check the availability of the APIs you're using for support on those platforms. For example, `context.webAPI` isn't available in canvas apps. For individual API availability, see [Power Apps component framework API reference](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/).

### Manage Temporarily Null Property Values Passed to `updateView`

Null values are passed to the `updateView` method when data isn't ready. Your components should account for this situation and expect that the data could be null, and that a subsequent `updateView` cycle can include updated values. `updateView` is available for both [standard](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/control/updateview) and [React](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/react-control/updateview) components.

## Model-Driven Apps

### Don't Interact Directly with `formContext`

If you have experience working with client API, you might be used to interacting with `formContext` to access attributes, controls, and call API methods such as `save`, `refresh`, and `setNotification`. Code components are expected to work across various products like model-driven apps, canvas apps, and dashboards, therefore they can't have a dependency on `formContext`.

A workaround is to make the code component bound to a column and add an `OnChange` event handler to that column. The code component can update the column value, and the `OnChange` event handler can access the `formContext`. Support for the custom events will be added in the future, which will enable communicating changes outside of a control without adding a column configuration.

### Limit Size and Frequency of Calls to the `WebApi`

When using the `context.WebApi` methods, limit both the number of calls and the amount of data. Each time you call the `WebApi`, it counts towards the user's API entitlement and service protection limits. When performing CRUD operations on records, consider the size of the payload. In general, the larger the request payload, the slower your code component is.

## Canvas Apps

### Minimize the Number of Components on a Screen

Each time you add a component to your canvas app, it takes a finite amount of time to render. Render time increases with each component you add. Carefully measure the performance of your code components as you add more to a screen using the Developer Performance tools.

Currently, each code component bundles their own library of shared libraries such as Fluent UI and React. Loading multiple instances of the same library won't load these libraries multiple times. However, loading multiple different code components results in the browser loading multiple bundled versions of these libraries. In the future, these libraries will be able to be loaded and shared with code components.

### Allow Makers to Style Your Code Component

When app makers consume code components from inside a canvas app, they want to use a style that matches the rest of their app. Use input properties to provide customization options for theme elements such as color and size. When using Microsoft Fluent UI, map these properties to the theme elements provided by the library. In the future, theming support will be added to code components to make this process easier.

### Follow Canvas Apps Performance Best Practices

Canvas apps provide a wide set of best practices from inside the app and solution checker. Ensure your apps follow these recommendations before you add code components. For more information, see:

- [Tips to improve canvas app performance](https://learn.microsoft.com/en-us/powerapps/maker/canvas-apps/performance-tips)
- [Considerations for optimized performance in Power Apps](https://powerapps.microsoft.com/blog/considerations-for-optimized-performance-in-power-apps/)

## TypeScript and JavaScript

### ES5 vs ES6

By default, code components target ES5 to support older browsers. If you don't want to support these older browsers, you can change the target to ES6 inside your `pcfproj` folder's `tsconfig.json`. More information: [ES5 vs ES6](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/debugging-custom-controls#es5-vs-es6).

### Module Imports

Always bundle the modules that are required as part of your code component instead of using scripts that are required to be loading using the `SCRIPT` tag. For example, if you wanted to use a non-Microsoft charting API where the sample shows adding `<script type="text/javascript" src="somechartlibrary.js></script>` to the page, this isn't supported inside a code component. Bundling all of the required modules isolates the code component from other libraries and also supports running in offline mode.

> **Note**: Support for shared libraries across components using library nodes in the component manifest is not yet supported.

### Linting

Linting is where a tool can scan the code for potential issues. The template used by `pac pcf init` installs the `eslint` module to your project and configures it by adding an `.eslintrc.json` file.

To configure, at the command-line use:

```bash
npx eslint --init
```

Then answer the following questions when prompted:

- **How would you like to use ESLint?** Answer: To check syntax, find problems, and enforce code style
- **What type of modules does your project use?** Answer: JavaScript modules (import/export)
- **Which framework does your project use?** Answer: React
- **Does your project use TypeScript?** Answer: Yes
- **Where does your code run?** Answer: Browser
- **How would you like to define a style for your project?** Answer: Answer questions about your style
- **What format do you want your config file to be in?** Answer: JSON
- **What style of indentation do you use?** Answer: Spaces
- **What quotes do you use for strings?** Answer: Single
- **What line endings do you use?** Answer: Windows
- **Do you require semicolons?** Answer: Yes

Before you can use `eslint`, you need to add some scripts to the `package.json`:

```json
"scripts": {
   ...
   "lint": "eslint MY_CONTROL_NAME --ext .ts,.tsx",
   "lint:fix": "npm run lint -- --fix"
}
```

Now at the command-line, you can use:

```bash
npm run lint:fix
```

Additionally, you can add files to ignore by adding to the `.eslintrc.json`:

```json
"ignorePatterns": ["**/generated/*.ts"]
```

## HTML Browser User Interface Development

### Use Microsoft Fluent UI React

[Fluent UI React](https://developer.microsoft.com/fluentui#/get-started/web) is the official [open source](https://github.com/microsoft/fluentui) React front-end framework designed to build experiences that fit seamlessly into a broad range of Microsoft products. Power Apps itself uses Fluent UI, meaning you are able to create UI that's consistent with the rest of your apps.

#### Use Path-Based Imports from Fluent to Reduce Bundle Size

Currently, the code component templates used with `pac pcf init` won't use tree-shaking, which is the process where `webpack` detects modules imported that aren't used and removes them. If you import from Fluent UI using the following command, it imports and bundles the entire library:

```typescript
import { Button } from '@fluentui/react'
```

To avoid importing and bundling the entire library, you can use path-based imports where the specific library component is imported using the explicit path:

```typescript
import { Button } from '@fluentui/react/lib/Button';
```

Using the specific path reduces your bundle size both in development and release builds.

#### Optimize React Rendering

When using React, follow React specific best practices regarding minimizing rendering of components:

- Only make a call to `ReactDOM.render` inside the `updateView` method when a bound property or framework aspect change requires the UI to reflect the change. You can use `updatedProperties` to determine what has changed.
- Use `PureComponent` (with class components) or `React.memo` (with function components) where possible to avoid unnecessary re-renders.
- For large React components, deconstruct your UI into smaller components to improve performance.
- Avoid use of arrow functions and function binding inside the render function as these practices create a new callback closure with each render.

### Check Accessibility

Ensure that code components are accessible so that keyboard only and screen-reader users can use them:

- Provide keyboard navigation alternatives to mouse/touch events
- Ensure that `alt` and [ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA) (Accessible Rich Internet Applications) attributes are set so that screen readers announce an accurate representation of the code components interface
- Modern browser developer tools offer helpful ways to inspect accessibility

More information: [Create accessible canvas apps in Power Apps](https://learn.microsoft.com/en-us/powerapps/maker/canvas-apps/accessible-apps).

### Always Use Asynchronous Network Calls

When making network calls, never use a synchronous blocking request since this causes the app to stop responding and result in slow performance. More information: [Interact with HTTP and HTTPS resources asynchronously](https://learn.microsoft.com/en-us/powerapps/developer/model-driven-apps/best-practices/business-logic/interact-http-https-resources-asynchronously).

### Write Code for Multiple Browsers

Model-driven apps, canvas apps, and portals all support multiple browsers. Be sure to only use techniques that are supported on all modern browsers, and test with a representative set of browsers for your intended audience.

- [Limits and configurations](https://learn.microsoft.com/en-us/powerapps/maker/canvas-apps/limits-and-config)
- [Supported web browsers](https://learn.microsoft.com/en-us/power-platform/admin/supported-web-browsers-and-mobile-devices)
- [Browsers used by office](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins)

### Code Components Should Plan for Supporting Multiple Clients and Screen Formats

Code components can be rendered in multiple clients (model-driven apps, canvas apps, portals) and screen formats (mobile, tablet, web).

- Using `trackContainerResize` allows code components to respond to changes in the available width and height
- Using `allocatedHeight` and `allocatedWidth` can be combined with `getFormFactor` to determine if the code component is running on a mobile, tablet, or web client
- Implementing `setFullScreen` allows users to expand to use the entire available screen available where space is limited
- If the code component can't provide a meaningful experience in the given container size, it should disable functionality appropriately and provide feedback to the user

### Always Use Scoped CSS Rules

When you implement styling to your code components using CSS, ensure that the CSS is scoped to your component using the automatically generated CSS classes applied to the container `DIV` element for your component. If your CSS is scoped globally, it might break the existing styling of the form or screen where the code component is rendered.

For example, if your namespace is `SampleNamespace` and your code component name is `LinearInputComponent`, you would add a custom CSS rule using:

```css
.SampleNamespace\.LinearInputComponent rule-name
```

### Avoid Use of Web Storage Objects

Code components shouldn't use the HTML web storage objects, like `window.localStorage` and `window.sessionStorage`, to store data. Data stored locally on the user's browser or mobile client isn't secure and not guaranteed to be available reliably.

## ALM/Azure DevOps/GitHub

See the article on [Code component application lifecycle management (ALM)](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/code-components-alm) for best practices on code components with ALM/Azure DevOps/GitHub.

## Related Articles

- [What are code components](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/custom-controls-overview)
- [Code components for canvas apps](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/component-framework-for-canvas-apps)
- [Create and build a code component](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/create-custom-controls-using-pcf)
- [Learn Power Apps component framework](https://learn.microsoft.com/en-us/training/paths/use-power-apps-component-framework)
- [Use code components in Power Pages](https://learn.microsoft.com/en-us/power-apps/maker/portals/component-framework)
