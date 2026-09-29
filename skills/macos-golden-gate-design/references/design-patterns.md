# macOS 27 Golden Gate visual grammar

## What Golden Gate changes

Golden Gate refines the Liquid Glass system introduced in macOS 26. It is not permission to make every surface translucent.

Apple's 2026 guidance describes:

- stronger readability through better diffusion of complex content
- darker material edges and brighter highlights for depth and separation
- user tint control from very clear toward fully tinted
- automatic adaptation for Reduce Transparency and Increase Contrast
- sidebars extending to window edges
- content flowing behind sidebars where appropriate
- semibold sidebar selection text
- a hard scroll-edge effect when free-floating title text needs separation
- bordered toolbar items over a sidebar adopting Liquid Glass
- tighter macOS window corners
- interactive custom glass that responds to pointer clicks

These are refinements to native structure. Structure remains the first design decision.

## One-window composition

Treat a productivity window as one composition:

`[ full-height sidebar ] | [ primary content ] | [ optional inspector ]`

The titlebar and toolbar sit in the window frame or integrate with the content edge. Panes may use distinct system materials, but they do not need rounded wrappers inside the window.

Use:

- one shared boundary between panes
- native split-view behavior
- continuous content planes
- system separators or hairlines when needed
- spacing and typography for local grouping
- selection fills for selection
- transient surfaces only for transient tasks

Avoid:

- a rounded rectangle around the entire sidebar
- another rounded rectangle around each sidebar section
- a content card inside a rounded main shell
- a permanently floating form or table when it is the primary content
- repeated shadows used to explain hierarchy

## Container budget

Start with a card budget of zero.

A framed container is justified only when:

- It is independently movable, dismissible, reusable, or reorderable.
- It represents a discrete object in a collection where boundaries matter.
- It is transient, such as a popover, sheet, alert, menu, or floating utility.
- Its boundary communicates drag target, focus, selection, validation, or preview.
- The native platform component itself provides the boundary.

A container is not justified merely because:

- the section needs hierarchy or padding
- a web dashboard would use a card
- glass looks attractive over wallpaper
- neighboring content has rounded corners

If grouping is needed, try this order:

1. alignment
2. spacing
3. section heading
4. semantic background change
5. separator or divider
6. native grouped component
7. framed container only if the boundary remains meaningful

## Glass budget

Glass is a hierarchy and interaction material, not a theme.

Strong candidates:

- native toolbar item groups
- search and compact command fields
- system sidebar and inspector material
- compact floating controls over media or a canvas
- popovers, menus, sheets, and alerts
- a small custom control whose movement or response benefits from real Liquid Glass

Weak candidates:

- long reading regions
- dense tables
- every settings section
- each sidebar group
- every row or data cell
- the whole content background
- a decorative inner window shell

Use one glass layer where one will do. Do not stack glass on glass to create contrast. If contrast fails, simplify the background, use a system edge treatment, or stabilize the content surface.

## Sidebar grammar

- Use a full-height leading navigation pane.
- Use source-list hierarchy for places, collections, filters, accounts, or top-level destinations.
- Keep most hierarchy to one or two visible levels.
- Use succinct group labels, SF Symbols, and native row sizing.
- Use one selection highlight; keep unselected rows quiet.
- Let system accent color communicate selection and selected icons.
- Allow resizing and appropriate collapse at narrow widths.
- Provide the standard show/hide command and keyboard behavior.
- Do not put critical actions at the bottom edge.
- Do not inset the sidebar into a rounded card.
- Do not turn each sidebar group into a mini-panel.

The official kit shows multiple source-list arrangements on a shared pane. A selected-row background is a state treatment, not a template for wrapping every row.

## Toolbar grammar

- Put navigation and sidebar controls toward the leading edge, followed by the title.
- Put common, useful, customizable controls in the middle.
- Put important persistent actions, inspector controls, search, and overflow toward the trailing edge.
- Group by task and target, not visual symmetry alone.
- Minimize distinct groups; Apple's HIG suggests aiming for at most three.
- Let the system manage overflow as the window narrows.
- Make commands available through the menu bar when appropriate.
- Prefer recognizable symbols without decorative borders.
- Keep text-labeled and symbol-only action groups separate.
- Use one prominent primary action at most.
- Use native scroll-edge treatment when content passes beneath the toolbar.

Do not add a custom full-width banner, a pill around every icon, or a permanent glass command bar inside content.

## Content grammar

Primary content should be flatter and quieter than navigation and commands.

### Lists and tables

- Use native `List`, `Table`, `NSTableView`, or `NSOutlineView`.
- Use rows, columns, headers, alternating backgrounds, disclosure, indentation, and selection.
- Let the table occupy the content pane.
- Avoid a glass or rounded wrapper around the table.
- Do not make each row a card.
- Use separators only where they improve scanning.

### Forms and settings

- Use native `Form`, settings scenes, labels, controls, and section headings.
- Group by spacing and titles first.
- Reserve group boxes for relationships that truly require enclosure.
- Avoid stacked rounded panels for ordinary preference categories.
- Keep control alignment and label columns consistent.

### Editors, documents, canvases, and media

- Let the document or canvas own the content plane.
- Extend appropriate visual content under sidebars or inspectors with native behavior.
- Keep floating controls compact and sparse.
- Do not place the canvas inside another decorative card.

### Inspectors

- Treat an inspector as an adjacent subordinate pane.
- Align controls and sections consistently.
- Use native disclosure and separators.
- Do not make it a permanent floating card unless it is genuinely movable or transient.

## Corners and boundaries

More consistent corners does not mean round every section.

- Keep window corners, sheets, popovers, menus, floating utilities, and native controls.
- Preserve concentric corner relationships when a real surface nests near a container edge.
- Prefer a straight shared pane divider over two adjacent rounded rectangles.
- Use thin semantic lines for table columns, pane separation, or scroll-edge contrast.
- Avoid strokes when material or position already establishes the boundary.
- Do not invent fixed radii for native components.

## Color and typography

- Use semantic system colors instead of hard-coded light and dark values.
- Use system accent for selection, progress, and a few key actions.
- Do not tint every glass surface with the accent.
- Use SF typography and system text styles.
- Use weight and spacing for hierarchy before adding containers.
- Keep body text off highly refracted or busy glass.
- Do not rely on color alone; preserve sufficient contrast.
- Respect system accent, appearance, and glass tint.

## Window states and resizing

Design and test:

- active, key, main, and inactive states
- compact, default, and wide widths
- collapsed or hidden sidebar
- optional inspector
- toolbar overflow
- long titles and localized labels
- empty, loading, populated, and error content
- hover, pressed, focus, selection, drag, and disabled states

Inactive windows must reduce emphasis coherently. Custom material must not remain louder than native chrome.

## Accessibility and personalization

- With Reduce Transparency, provide opaque or stable backgrounds.
- With Increase Contrast, preserve pane boundaries, selection, focus, icons, and text.
- With Reduce Motion, do not rely on morphing or bounce to explain state.
- Give every symbol-only action an accessibility label.
- Preserve keyboard traversal, menu commands, focus rings, and VoiceOver order.
- Test the full user-selected glass tint range.
- Keep content comprehensible when background color and refraction change.

## Official Figma observations

These observations are reference examples, not universal constants:

- Examples overview: `121:18094`
- List: `4440:8153`
- Form: `4440:8152`
- Unified toolbar plus title: `4440:8159`
- Expanded toolbar plus title: `4440:8161`
- Unified compact toolbar plus title: `4440:8163`
- Default titlebar plus sidebar: `4440:8165`
- Utility window: `4440:8167`
- Sidebars page: `207:14495`
- Light sidebar examples: `4358:6073`
- Toolbars page: `207:14501`
- Windows page: `207:14504`
- Materials page: `483:8848`
- Light Liquid Glass samples: `483:9316`

The `Examples/List` reference contains a 1512 × 982 canvas and a 1200 × 600 sample window. In that instance, the leading pane is 240 points, the detail pane 960 points, sidebar rows 24 points, table rows 20 points, toolbar controls 36 points, the title/control band 52 points, and the larger toolbar region 83 points. Use these only to understand relative density; adopt native metrics in production.

The important pattern is:

- full-height integrated sidebar
- one clear vertical pane boundary
- toolbar controls in restrained system groups
- continuous, unboxed list or table
- state through selection and alternating rows
- no decorative card behind content

## Correction map

| If the design has… | Change it to… |
| --- | --- |
| rounded inner app shell | content and panes directly in the system window |
| inset sidebar card | full-height source-list pane and shared divider |
| card around every section | spacing, heading, native section, or separator |
| glass behind every block | native glass on navigation, commands, and transient UI |
| pill around every toolbar icon | a small number of native task groups |
| floating inspector by default | adjacent inspector pane |
| dashboard tiles around a table | one native table with rows and columns |
| custom title banner | native window title and toolbar |
| fixed blur/opacity recipe | adaptive semantic system material |
| light-mode-only mockup | light, dark, inactive, tinted, reduced-transparency, and resized states |

## Final visual question

Ask: "If I remove the decorative radii, strokes, and shadows, does the interface still have a clear native hierarchy?"

If no, the structure is unresolved. Fix pane and component hierarchy before adding material.
