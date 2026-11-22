# FlowStudio MCP: AutoLayout Containers

How the Power Apps player treats controls inside AutoLayout containers, from
work on real apps. Microsoft's own guidance is on the server:
`tool_search "page:ms-canvas-layout"` and `"page:ms-canvas-grid"`. Set every
property below with `update_canvas_app` `setProperty`; read current values with
`describe_canvas_control`.

---

## Sizing

- A child with `FillPortions: 0` keeps its own size along the container's
  direction: `Height` in a vertical container, `Width` in a horizontal one. The
  minimum applies only along that direction (`LayoutMinHeight` in a vertical
  container, `LayoutMinWidth` in a horizontal one) and only when `FillPortions`
  is above 0; Microsoft defines it as the minimum size "in the direction of the
  Fill portions". A minimum height on a fixed button in a vertical stack does
  not create a gap. Microsoft's layout guide says containers default to a 250
  by 100 minimum, but Studio writes 16 by 16, so read the real values with
  `describe_canvas_control`.
- `AlignInContainer` works across the container's direction only (left to
  right in a vertical stack). It never adds space along it.
- To get a gap in a container with `LayoutGap: 0`, put the control inside a
  transparent container with `FillPortions: 0` and a `Height` equal to the
  control's height plus the gap. Set `FillPortions` yourself: Studio gives a
  nested container `FillPortions: 1`, which makes it share the spare space
  instead.
- A hidden child takes no space in its own container. Containers have no
  setting that fits them to their content, so a container that is empty, or
  whose children are all hidden, keeps its size: its `Height` when
  `FillPortions` is 0, or its share of the spare space (never below its
  minimum) when `FillPortions` is above 0. Hiding everything inside a wrapper
  leaves a wrapper-sized gap, so put a role-based `Visible` on the wrapper
  itself. Microsoft's container pages do not describe hidden or empty
  children; this follows from how they define Fill portions and from the
  layout guide the server serves (`tool_search` `skill:canvas-layout`).
- A fixed-height container (`FillPortions: 0`) whose children differ by role
  needs a `Height` formula that changes with them; it does not grow or shrink
  to fit them.
- If the app has a control-height value that changes with screen size (say 40
  on desktop, 60 on a phone), write row heights in terms of it, not as the
  desktop number.

---

## Scrolling and Clipping

- `LayoutOverflowY: LayoutOverflow.Scroll` shows a scrollbar whenever content
  is taller than the container; `LayoutOverflow.Hide` clips.
- Use `Scroll` on the outer container when its content can be taller than the
  screen, and set its `LayoutJustifyContent` to `Start` or `SpaceBetween`.
  Microsoft notes that `Center` or `End` can leave controls out of reach even
  with `Scroll` set.
- An inner container that should fit its children exactly gets an exact
  `Height` and `Hide`. One shorter than its content with `Scroll` set gives the
  familiar form with a scrollbar and the Submit button off the bottom of the
  screen. Fix its `Height` (a formula adding up the visible children; see
  "Exact-Fit Heights") and use `Hide`.
- Inside a vertical container with `LayoutOverflowY: LayoutOverflow.Scroll`, a
  direct child with `FillPortions` above 0 is sized to the visible area and
  clipped instead of scrolled, according to Microsoft's layout guide (not
  verified by FlowStudio). Give it `FillPortions: 0` and a height. The server's
  layout check flags this (`scroll-child-fill`).
- A gallery with `FillPortions` above 0 cannot shrink below its
  `LayoutMinHeight`, so it can push its parent past the space it has when a
  sibling grows. Lower the minimum rather than letting the parent scroll or
  clip. With `FillPortions: 0`, its `Height` decides instead.
- Studio's editor draws its own scroll and warning marks whatever these
  settings say. Judge scrollbars in the published app after a reload.

---

## Order and Position

- In an AutoLayout container, order is reading order. Use `moveControl` with
  `before`, `after` or `position`.
- Visual order is kept in `ZIndex`. A Studio save scrambles the children's
  order in the file while `ZIndex` keeps the true order, so never set `ZIndex`
  from file order. Whether `moveControl` places correctly in a container Studio
  saved last was not tested. Check the reply's `siblings` list, which follows
  visual order, and the `ZIndex` values from `describe_canvas_control` before
  pushing.
- Children of AutoLayout containers still carry `X` and `Y` (normally 0). They
  are ignored while the parent lays them out; leave them.
- Inside a gallery, controls sit at fixed `X` and `Y` within the row. Check
  every combination of visible controls for overlap, and if a position uses
  `Parent.TemplateWidth`, check it at a narrow and a wide width.

---

## Exact-Fit Heights

When a container must fit its content exactly (to remove a scrollbar), write
its `Height` as a formula and check it as arithmetic:

```text
sum of the visible children's heights
+ gap * Max(0, number of visible children - 1)
+ top padding + bottom padding
```

Type the gap and padding as numbers: a formula cannot read `LayoutGap` or
`PaddingTop`. With no visible children the height is the padding alone. Add up
only children with `FillPortions: 0`; a child that takes its size from this
container makes the formula circular. The formula assumes a hidden child takes
its gap with it; Microsoft's documentation does not say.

Work it out for each role that sees different children and each screen size.
An "about right" height breaks the first time someone adds a row.
