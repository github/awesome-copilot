# Native implementation patterns

## Start from structure, not effects

Build the normal macOS hierarchy first. A representative SwiftUI root looks like this:

```swift
struct BrowserView: View {
    @State private var selection: Item.ID?
    @State private var query = ""
    @State private var showsInspector = false

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                Section("Favorites") {
                    Label("Recents", systemImage: "clock")
                    Label("Downloads", systemImage: "arrow.down.circle")
                }
            }
            .listStyle(.sidebar)
            .navigationTitle("Library")
        } detail: {
            ItemTable(selection: $selection)
                .navigationTitle("Items")
        }
        .searchable(text: $query)
        .toolbar {
            ToolbarItemGroup {
                Button("Change View", systemImage: "square.grid.2x2") {
                    // Change the content presentation.
                }
                Button("Show Inspector", systemImage: "sidebar.trailing") {
                    showsInspector.toggle()
                }
            }
        }
        .inspector(isPresented: $showsInspector) {
            ItemInspector(selection: selection)
        }
    }
}
```

This is a structural example, not a demand for these exact controls. Notice what is absent:

- no rounded shell around `NavigationSplitView`
- no material background added to every column
- no card around `List`, `Table`, or the inspector
- no custom title banner

Let the scene and native components provide the platform appearance.

## Scene and window architecture

Choose the scene that matches the product:

- `WindowGroup` for ordinary multiwindow app content
- `DocumentGroup` for document-based apps
- `Settings` for preferences
- `MenuBarExtra` for a menu bar utility
- additional `Window` or window groups for distinct auxiliary workflows

Give each window:

- a coherent title
- native toolbar and menu commands
- a realistic minimum size
- restoration behavior appropriate to its role
- keyboard shortcuts
- resizable content

Do not use a visually custom borderless window simply to imitate a mockup. If you alter toolbar visibility or extend content into the titlebar, preserve draggable regions, accessibility titles, traffic lights, resizing, and window state behavior.

## Sidebars, columns, and inspectors

Prefer:

- `NavigationSplitView` for two- or three-column navigation
- `List(selection:)` with `.listStyle(.sidebar)` for a source list
- `.inspector(isPresented:content:)` for a subordinate trailing inspector
- `navigationSplitViewColumnWidth` only where the content has a real width need
- `NavigationStack` inside a column when that column owns deeper navigation

Do not reproduce split-view columns with an `HStack` of rounded rectangles. Native split views supply resizing, collapse behavior, dividers, focus, and platform adaptation.

## Lists, tables, forms, and settings

Use:

- `List` for navigable or heterogeneous rows
- `Table` for dense, columnar data
- `OutlineGroup`, hierarchical `List`, `NSOutlineView`, or `NSTableView` for trees
- `Form` for labeled controls and settings
- `Section` for semantic grouping
- `ContentUnavailableView` or a native empty-state composition when no content exists

Let native row backgrounds, selection, alternating table rows, separators, and headers do the work. Avoid adding:

- `.background(.material, in: RoundedRectangle(...))` to a whole list or table
- a rounded rectangle behind every row
- shadows on static form sections
- manual selection capsules that conflict with native selection

Use `GroupBox` only when an explicit enclosure is semantically useful, not as the default section component.

## Toolbars and search

Use `.toolbar`, `ToolbarItem`, and `ToolbarItemGroup` with semantic placements. Let the system adapt spacing and overflow.

- Put navigation and sidebar controls toward the leading side.
- Let the title participate in the titlebar or toolbar.
- Put search where `.searchable` naturally places it; on macOS this is normally the trailing toolbar edge.
- Keep high-frequency actions visible and move secondary actions to menus or system overflow.
- Use symbol-only controls only when the symbol is familiar, and supply an accessibility label.
- Put equivalent commands in the menu bar where appropriate.
- Use at most one prominent primary action.

For macOS 27 SDK features such as toolbar visibility priority, overflow grouping, or pinned trailing placement, verify the exact current symbol and availability in Apple documentation before writing code. Do not invent a beta API from a screenshot or WWDC paraphrase.

## Liquid Glass

First, rebuild with the current SDK and inspect the standard controls. Many system components adopt and refine Liquid Glass automatically.

Use a custom glass effect only when:

- the element is a custom control or compact floating surface
- the material communicates its elevation or interaction
- a standard button, toolbar item, menu, popover, or material does not already express the need

A minimal custom SwiftUI surface can use the documented effect:

```swift
if #available(macOS 26.0, *) {
    Label("Live", systemImage: "waveform")
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .glassEffect(.regular, in: .capsule)
}
```

For multiple nearby custom glass elements, use `GlassEffectContainer` so the system can render and coordinate their shapes. Use `glassEffectUnion`, IDs, transitions, or interactive glass only when the design genuinely calls for merging, morphing, or pointer response.

Do not:

- put the entire root view in `GlassEffectContainer`
- apply `glassEffect` to every navigation row or content section
- hard-code blur, opacity, refraction, highlight, or shadow recipes to fake system glass
- copy Figma effect-token numbers into production rendering code

## Background extension and scroll edges

`backgroundExtensionEffect()` can extend visually rich detail content under a sidebar or inspector. Use it for imagery or immersive content where continuity has value. It is not a generic pane background and does not justify putting text-heavy content under blur.

Use the system's scroll-edge behavior to keep free-floating titles and toolbar controls legible when content scrolls beneath them. On macOS 27, standard behavior may resolve to a hard edge where text requires stronger separation. Prefer automatic or semantic system behavior before custom gradients.

## AppKit equivalents

For AppKit:

- use `NSWindow` and standard titlebar behavior
- use `NSSplitViewController` for structural columns
- use `NSToolbar` for commands and search
- use source-list `NSOutlineView` or `NSTableView`
- use standard controls and presentation APIs
- use `NSGlassEffectView` for a necessary custom dynamic glass surface on supported systems
- use `NSVisualEffectView` for conventional material backgrounds or compatible older targets

macOS 27 AppKit refinements described by Apple include edge-reaching sidebars, content behind sidebars, semibold sidebar selection, hard scroll-edge behavior for free-floating title text, glass on bordered toolbar items over a sidebar, and new concentric-corner support such as `NSViewCornerConfiguration` and `NSViewCornerRadius.containerConcentric`. Verify symbols against the installed macOS 27 SDK.

## Accessibility implementation

Prefer native components because their material and state behavior adapt automatically. For custom AppKit material:

- inspect `NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency`
- observe `accessibilityDisplayOptionsDidChangeNotification`
- replace semitransparent backgrounds with opaque or stable alternatives when reduction is requested

Also test:

- `accessibilityDifferentiateWithoutColor`
- increased contrast and focus visibility
- Reduce Motion
- VoiceOver labels, roles, values, and traversal
- Full Keyboard Access
- inactive-window emphasis

Do not use an accessibility setting merely to swap one hard-coded visual recipe for another. Preserve semantic colors and native behavior.

## Migration sequence

For an existing app:

1. Build with the current Xcode and SDK.
2. Capture the current interface in light, dark, active, inactive, narrow, and wide states.
3. Replace custom root shells with native scenes and split views.
4. Remove redundant backgrounds from sidebar, content, table, form, and inspector regions.
5. Restore hierarchy with spacing, typography, native dividers, and selection.
6. Replace custom command bars with a native toolbar and menu commands.
7. Inspect what glass the framework supplies automatically.
8. Add only the remaining necessary custom glass.
9. Verify accessibility settings and user-selected tint.
10. Build, run, and compare the real app with the official Figma reference.

## Code review questions

- Does any `RoundedRectangle`, `.background`, `.overlay`, shadow, or material modifier wrap a structural pane?
- Is a custom `HStack` recreating `NavigationSplitView`?
- Is a custom header recreating the window titlebar or toolbar?
- Are native selection and row styles being overridden merely for decoration?
- Is custom glass solving a real interaction problem?
- Does every availability-gated API exist in the current SDK?
- Does the app stay clear with transparency reduced?
- Does resizing preserve the pane hierarchy without turning it into stacked cards?
