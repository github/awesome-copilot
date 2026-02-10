# Progressive Web App Reference

---

## Overview: What Are Progressive Web Apps?

> Source: <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps>

A **Progressive Web App (PWA)** is an app built using web platform technologies that provides a user experience comparable to a platform-specific (native) app. Key characteristics include:

- Runs on multiple platforms and devices from a single codebase
- Can be installed on devices like native apps
- Operates offline and in the background
- Integrates with device features and other installed apps
- Appears as a permanent feature users can launch directly from the OS

### Main Guides

| Guide | Description |
|-------|-------------|
| **What is a Progressive Web App?** | Comparison with traditional websites and platform-specific apps; introduction to main PWA features |
| **Making PWAs Installable** | Requirements for installability, device installation process, customizing the install experience |
| **Installing and Uninstalling Web Apps** | How users install and uninstall PWAs on their devices |
| **Offline and Background Operation** | Technologies enabling offline functionality, intermittent network connectivity management, background task execution |
| **Caching** | APIs for local resource caching, common caching strategies for offline functionality |
| **Best Practices for PWAs** | Cross-browser and device adaptation, accessibility, performance optimization, OS integration |

### How-To Implementation Features

| Feature | Purpose |
|---------|---------|
| Create a standalone app | Launch in a dedicated window instead of a browser tab |
| Define app icons | Customize icons for the installed PWA |
| Customize app colors | Set background and theme colors |
| Display badges | Show badges on the app icon (e.g., notification counts) |
| Expose app shortcuts | Access common actions from the OS shortcut menu |
| Share data between apps | Use OS app-sharing mechanisms |
| Trigger installation | Provide custom UI to invite user installation |
| Associate files | Connect file types to the PWA for handling |

### Core Technologies and APIs

#### Web App Manifest

- Defines PWA metadata and appearance
- Customizes deep OS integration (name, icons, display mode, colors, etc.)

#### Service Worker APIs

**Communication:**

- `Client.postMessage()` -- Service worker to PWA messaging
- Broadcast Channel API -- Two-way communication between service worker and client

**Offline Operation:**

- `Cache` API -- Persistent HTTP response storage
- `Clients` -- Document access control for service-worker-controlled documents
- `FetchEvent` -- HTTP request interception and caching

**Background Tasks:**

- Background Synchronization API -- Defer tasks until a stable network connection
- Web Periodic Background Synchronization API -- Register periodic tasks with network connectivity
- Background Fetch API -- Manage large, long-duration downloads

#### Other Essential Web APIs

| API | Purpose |
|-----|---------|
| **IndexedDB** | Client-side storage for structured data and files |
| **Badging API** | Application icon badge notifications |
| **Notifications API** | OS-level notification display |
| **Web Share API** | Share content to user-selected apps |
| **Window Controls Overlay API** | Desktop PWA window customization (hide title bar, display app over full window) |

### Essential PWA Checklist

- Installable and standalone operation
- Offline functionality via service workers
- Caching strategies implemented
- Web app manifest configured
- App icons and colors defined
- Accessible and performant
- Cross-browser compatible
- Secure (HTTPS required)

---

## Tutorials

> Source: <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials>

These tutorials provide structured, step-by-step learning paths for building PWAs from start to finish.

### Tutorial 1: CycleTracker -- Creating Your First PWA

**Level:** Novice

A menstrual cycle tracking app that walks through the complete process of turning a web app into a PWA.

**Sub-modules:**

1. **Base HTML and CSS** -- Build the foundational web app structure
2. **Secure connection** -- Set up a testing environment with HTTPS
3. **JavaScript functionality** -- Add interactivity and application logic
4. **Manifest and iconography** -- Create and inspect a web app manifest; define icons
5. **Offline support using service workers** -- Add service workers and manage stale caches

**Topics Covered:**

- HTML, CSS, and JavaScript fundamentals for creating a functional web app
- Setting up a testing environment
- Upgrading a web app into a PWA
- Manifest development: creating and inspecting a web app manifest
- Service workers: adding service workers to the application
- Cache management: using service workers to delete stale caches

### Tutorial 2: js13kGames -- Deep Dive into PWA

**Level:** Intermediate

A game information listing app (from the js13kGames 2017 competition) that explores advanced PWA features.

**Sub-modules:**

1. **PWA structure** -- Understand app architecture and organization
2. **Offline support using service workers** -- Implement offline functionality
3. **Making PWAs installable** -- Meet installability requirements
4. **Using Notifications and Push APIs** -- Implement push notifications
5. **Progressive loading** -- Optimize loading performance

**Topics Covered:**

- PWA basics and core concepts
- Notifications and Push APIs: implementing notifications and push functionality
- App performance: optimizing PWA performance
- Advanced PWA features beyond the basics

---

## API and Manifest Reference

> Source: <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Reference>

### Web App Manifest Members

The web app manifest describes PWA characteristics, customizes its appearance, and enables deeper OS integration. The following members can be defined in the manifest JSON file:

| Member | Status | Description |
|--------|--------|-------------|
| `name` | Standard | Full name of the application |
| `short_name` | Standard | Short name for limited-space contexts |
| `description` | Standard | Description of the application |
| `start_url` | Standard | URL that loads when the app is launched |
| `scope` | Standard | Navigation scope of the PWA |
| `display` | Standard | Display mode (fullscreen, standalone, minimal-ui, browser) |
| `display_override` | Experimental | Override display mode preferences |
| `orientation` | Standard | Default orientation for the app |
| `icons` | Standard | Array of icon objects for various contexts |
| `screenshots` | Standard | Screenshots for app stores and install UI |
| `background_color` | Standard | Background color for the splash screen |
| `theme_color` | Standard | Default theme color for the application |
| `categories` | Standard | Expected application categories |
| `id` | Standard | Unique identifier for the application |
| `shortcuts` | Standard | Quick-access shortcuts to key tasks |
| `file_handlers` | Experimental | File types the app can handle |
| `launch_handler` | Experimental | Control how the app is launched |
| `protocol_handlers` | Experimental | URL protocols the app can handle |
| `share_target` | Experimental | Define how the app receives shared data |
| `scope_extensions` | Experimental | Extend the navigation scope |
| `note_taking` | Experimental | Note-taking app integration |
| `related_applications` | Experimental | Related native applications |
| `prefer_related_applications` | Experimental | Prefer native app over PWA |
| `serviceworker` | Experimental / Non-standard | Service worker registration info |

### Service Worker APIs

#### Communication with the App

- **`Client.postMessage()`** -- Send messages from the service worker to client pages
- **Broadcast Channel API** -- Create a two-way communication channel between the service worker and the client PWA

#### Offline Operation

- **`Cache`** -- Persistent storage of HTTP responses for reuse when offline
- **`Clients`** -- Interface to access service-worker-controlled documents
- **`FetchEvent`** -- Intercept HTTP requests; enables caching or proxying responses for offline support

#### Background Operation

- **Background Synchronization API** -- Defer tasks until the network connection is stable
- **Web Periodic Background Synchronization API** -- Register periodic tasks that run with network connectivity
- **Background Fetch API** -- Manage long-duration downloads such as video and audio files

### Other Web APIs for PWAs

| API | Purpose |
|-----|---------|
| **IndexedDB** | Client-side storage for structured data and files |
| **Badging API** | Set application icon badges for notification indicators |
| **Notifications API** | Display OS-level system notifications |
| **Web Share API** | Share text, links, files, and content to user-selected apps |
| **Window Controls Overlay API** | Hide the title bar and display the app over the full window area (desktop PWAs) |

### Key MDN Reference Paths

- **Main PWA Index:** `/en-US/docs/Web/Progressive_web_apps`
- **Service Worker API:** `/en-US/docs/Web/API/Service_Worker_API`
- **Web APIs Overview:** `/en-US/docs/Web/API`
- **Web App Manifest:** `/en-US/docs/Web/Progressive_web_apps/Manifest`
