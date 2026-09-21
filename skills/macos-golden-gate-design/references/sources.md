# Sources and inspection routes

Source snapshot used to build this skill: 2026-09-13.

macOS 27 documentation, SDK symbols, and Figma kits can change. Refresh live sources before making release-critical or beta-sensitive claims.

## Authority rules

- Use Apple product pages, Apple Developer Documentation, the Human Interface Guidelines, Apple release notes, and Apple WWDC sessions as primary sources.
- Use Apple's official Figma community listing to establish kit provenance.
- A duplicated Figma design file is a working copy, not independent proof of provenance.
- Use third-party articles only to discover primary sources or understand reactions.
- If Apple sources disagree with the kit, prefer current documented platform behavior and note the discrepancy.
- Do not quote Figma values as code constants unless the product explicitly requires a fixed custom design token.

## Apple macOS 27 and release sources

- macOS 27 Golden Gate: https://www.apple.com/os/macos/
- macOS 27 release notes: https://developer.apple.com/documentation/macos-release-notes/macos-27-release-notes
- macOS developer overview: https://developer.apple.com/macos/
- What's new in macOS: https://developer.apple.com/macos/whats-new/
- Apple Developer news announcing the macOS 27 design kits: https://developer.apple.com/news/?id=e2lxw9l1
- Apple Design Resources: https://developer.apple.com/design/resources/
- SF Symbols: https://developer.apple.com/sf-symbols/

## Liquid Glass guidance

- Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Adopting Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- Applying Liquid Glass to custom SwiftUI views: https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views
- `glassEffect(_:in:)`: https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)
- `GlassEffectContainer`: https://developer.apple.com/documentation/swiftui/glasseffectcontainer
- `Glass.interactive(_:)`: https://developer.apple.com/documentation/swiftui/glass/interactive(_:)
- `glassEffectUnion(id:namespace:)`: https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:)
- `GlassButtonStyle`: https://developer.apple.com/documentation/swiftui/glassbuttonstyle
- Landmarks sample using Liquid Glass: https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass

## Human Interface Guidelines

- HIG root: https://developer.apple.com/design/human-interface-guidelines
- Designing for macOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-macos
- Sidebars: https://developer.apple.com/design/human-interface-guidelines/sidebars
- Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Windows: https://developer.apple.com/design/human-interface-guidelines/windows
- Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Color: https://developer.apple.com/design/human-interface-guidelines/color
- Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Components: https://developer.apple.com/design/human-interface-guidelines/components
- Menu bar: https://developer.apple.com/design/human-interface-guidelines/the-menu-bar
- Presentation: https://developer.apple.com/design/human-interface-guidelines/presentation

## SwiftUI and AppKit implementation sources

- SwiftUI framework: https://developer.apple.com/documentation/swiftui
- `NavigationSplitView`: https://developer.apple.com/documentation/swiftui/navigationsplitview
- Adding search: https://developer.apple.com/documentation/swiftui/adding-a-search-interface-to-your-app
- `ToolbarItemPlacement`: https://developer.apple.com/documentation/swiftui/toolbaritemplacement
- Customizing macOS window styles and restoration: https://developer.apple.com/documentation/swiftui/customizing-window-styles-and-state-restoration-behavior-in-macos
- `backgroundExtensionEffect()`: https://developer.apple.com/documentation/swiftui/view/backgroundextensioneffect()
- Building and customizing the menu bar with SwiftUI: https://developer.apple.com/documentation/swiftui/building-and-customizing-the-menu-bar-with-swiftui
- AppKit `NSGlassEffectView`: https://developer.apple.com/documentation/appkit/nsglasseffectview
- AppKit views and controls: https://developer.apple.com/documentation/appkit/views-and-controls
- Reduce Transparency signal: https://developer.apple.com/documentation/appkit/nsworkspace/accessibilitydisplayshouldreducetransparency

## WWDC sessions

- WWDC25 — Meet Liquid Glass: https://developer.apple.com/videos/play/wwdc2025/219/
- WWDC25 — Get to know the new design system: https://developer.apple.com/videos/play/wwdc2025/356/
- WWDC25 — Build a SwiftUI app with the new design: https://developer.apple.com/videos/play/wwdc2025/323/
- WWDC25 — Build an AppKit app with the new design: https://developer.apple.com/videos/play/wwdc2025/310/
- WWDC26 — Modernize your AppKit app: https://developer.apple.com/videos/play/wwdc2026/289/
- WWDC26 — Platforms State of the Union: https://developer.apple.com/videos/play/wwdc2026/112/
- WWDC26 — What's new in SwiftUI: https://developer.apple.com/videos/play/wwdc2026/269/
- WWDC26 — Platforms State of the Union recap: https://developer.apple.com/videos/play/wwdc2026/122/

The WWDC26 AppKit and State of the Union sessions are especially important for macOS 27 refinements: edge-reaching sidebars, content under sidebars, harder scroll-edge separation for free-floating titles, updated toolbar glass, tighter window geometry, interactive glass, user tint control, and accessibility adaptation.

## Official Figma kit

- Official community listing: https://www.figma.com/community/file/1651309434229735362/macos-27
- Creator shown by the listing: Apple
- Listing description: Apple's official macOS 27 UI kit
- Listing update observed: July 24, 2026
- Coverage stated by the listing: components, text styles, color styles, materials, sidebars, toolbars, tables, buttons, menus, pointers, dark mode, window states, windows, alerts, popovers, sheets, dialogs, desktop templates, system colors, vibrancy, and SF Symbols.
- Install the latest SF Symbols version before using the library.
- Follow the Apple Design Resources license linked or described by the official listing.

### Current working-copy nodes

Working-copy file key: `BgkMzbnUpf3DwLMkAbQVCL`

- Examples overview: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=121-18094&p=f
- List example: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8153&p=f
- Form example: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8152&p=f
- Unified toolbar plus title: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8159&p=f
- Expanded toolbar plus title: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8161&p=f
- Unified compact toolbar plus title: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8163&p=f
- Default titlebar and sidebar: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8165&p=f
- Utility window: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4440-8167&p=f
- Sidebars page: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=207-14495&p=f
- Light sidebar examples: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=4358-6073&p=f
- Toolbars page: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=207-14501&p=f
- Windows page: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=207-14504&p=f
- Materials page: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=483-8848&p=f
- Light Liquid Glass samples: https://www.figma.com/design/BgkMzbnUpf3DwLMkAbQVCL/macOS-27--Community-?node-id=483-9316&p=f

## Figma plugin workflow

Use the Figma plugin for precise node evidence when available:

1. Parse the file key and node ID from the URL.
2. Use metadata only for broad discovery or a page map.
3. Request design context for the smallest relevant node.
4. Request a screenshot for visual truth.
5. Request variable definitions when implementation needs tokens or styles.
6. For large nodes, fetch children individually instead of treating a broad page response as complete.
7. Record which node was inspected.

Use `figma:figma-design-to-code` for implementation extraction and `figma:figma-swiftui` for SwiftUI mapping. If a Figma quota blocks additional reads, use Ego on the authenticated file and document the limitation.

## Ego workflow

When the Figma file is already open in Ego:

1. Invoke `$ego-browser`.
2. Call `listTaskSpaces()`.
3. Claim the user-owned Space with `claimTaskSpace(spaceId)`, or resume an agent-owned Space with `takeOverTaskSpace(spaceId)`.
4. Verify the current URL, file key, and node ID before inspecting.
5. Use semantic snapshots for Figma chrome and screenshots for the canvas.
6. Select exact layers or navigate directly to exact node URLs.
7. Leave the requested overview or handoff page open unless the user asks to close it.

Do not say a normal browser tab was inspected through Ego's agent API when no TaskSpace was claimed or created.

## Firecrawl refresh workflow

Use `$firecrawl-search` for focused current discovery and `$firecrawl-deep-research` when the user requests exhaustive coverage.

Suggested queries:

- `site:developer.apple.com macOS 27 Liquid Glass sidebar toolbar window`
- `site:developer.apple.com/documentation/swiftui macOS 27 glassEffect toolbar NavigationSplitView`
- `site:developer.apple.com/design/human-interface-guidelines macOS sidebar toolbar windows materials`
- `site:developer.apple.com/videos/play/wwdc2026 macOS 27 Liquid Glass`
- `site:developer.apple.com macOS 27 release notes AppKit SwiftUI design`

Search first, then fetch the exact primary pages. For an exhaustive refresh, use more than ten distinct searches, read at least 25 distinct relevant sources, record URLs and dates, and separate direct source statements from synthesis.
