# FlowStudio MCP: AutoLayout Containers

How the Power Apps player treats controls inside AutoLayout containers, from
work on real apps. Microsoft's own guidance is on the server:
`tool_search "page:ms-canvas-layout"` and `"page:ms-canvas-grid"`. Set every
property below with `update_canvas_app` `setProperty`; read current values with
`describe_canvas_control`.

---

## Sizing

- A child with `FillPortions: 0` takes exactly its `Height` (or `Width` along
  the container's direction). `LayoutMinHeight` and `LayoutMinWidth` only apply
  to children with `FillPortions` above 0. A minimum height on a fixed button
  does not create a gap.
- `AlignInContainer` works across the container's direction only (left to
  right in a vertical stack). It never adds space along it.
- To get a gap in a container with `LayoutGap: 0`, put the control inside a
  transparent container taller than it.
- Hidden children take no space, but only the container's direct children. A
  hidden control inside a visible wrapper container leaves a wrapper-sized
  hole. Put a role-based `Visible` on the wrapper, not the control inside it.
- A container whose children differ by role needs a `Height` formula that
  changes with them.
- If the app has a control-height value that changes with screen size (say 40
  on desktop, 60 on a phone), write row heights in terms of it, not as the
  desktop number.

---

## Scrolling and Clipping

- `LayoutOverflowY: LayoutOverflow.Scroll` shows a scrollbar whenever content
  is taller than the container; `LayoutOverflow.Hide` clips.
- Use `Scroll` on the outer container when its content can be taller than the
  screen, so nothing is out of reach.
- An inner container that should fit its children exactly gets an exact
  `Height` and `Hide`. One shorter than its content with `Scroll` set gives the
  familiar form with a scrollbar and the Submit button off the bottom of the
  screen. Fix its `Height` (a formula adding up the visible children; see
  "Exact-Fit Heights") and use `Hide`.
- Inside a scrolling container, a child with `FillPortions` above 0 is pinned
  to the visible area and clipped instead of scrolled. Give it `FillPortions:
  0` and a height. The server's layout check flags this (`scroll-child-fill`).
- A gallery's `LayoutMinHeight` can push its parent past the space it has
  when a sibling grows. Lower it rather than letting the parent scroll or clip.
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
visible children's heights + LayoutGap * (visible children - 1) + top and bottom padding
```

Work it out for each role that sees different children and each screen size.
An "about right" height breaks the first time someone adds a row.
