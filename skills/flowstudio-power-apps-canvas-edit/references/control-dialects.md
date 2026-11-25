# FlowStudio MCP: Control Generations (Classic, Fluent and Modern)

Canvas apps can mix three generations of controls with different property
names. A property from the wrong generation either compiles as an error or
does nothing. Find the generation first: `describe_canvas_control` returns
`controlType` (and `type.yamlType`) for every control.

| Generation | `controlType` examples | YAML type examples |
|---|---|---|
| Classic | `label`, `button`, `text`, `dropdown`, `toggleSwitch`, `gallery` | `Label`, `Classic/Button`, `Classic/TextInput` |
| Fluent (the first modern controls) | `PowerApps_CoreControls_TextCanvas`, `..._ButtonCanvas`, `..._TextInputCanvas`, `..._DropdownCanvas` | not tested |
| Modern (current) | `modernText`, `modernButton`, `modernTextInput`, `modernDropdown` | `ModernText`, `ModernButton`, `ModernTextInput` |

New apps from `create_canvas_app` use the current modern generation unless
created with `modern: false`. `addControl` in such an app builds the modern
generation (see "Type names" in the skill).

---

## Property Names

| Concern | Classic | Fluent | Modern (current) |
|---|---|---|---|
| Text color | `Color` | `FontColor` | `Color` |
| Weight | `FontWeight.Semibold`; no `Regular`, use `Normal` | `'TextCanvas.Weight'.Semibold`, `.Regular` | `FontWeight.Semibold`, `FontWeight.Normal` |
| Horizontal align | `Align.Left` | `'TextCanvas.Align'.Start` | `Align.Left` |
| Text input value | `.Text` | `.Value` | **`.Text`** |
| Text input hint | `HintText` | `Placeholder` | `Placeholder` |
| Text input start value | `Default` | check | `Default` |
| Button style | `Fill` and `Color` | `Appearance` (`'ButtonCanvas.Appearance'.Primary`) plus `BasePaletteColor` | `Appearance` (`ButtonAppearance.Primary`) plus `BasePaletteColor` |
| Button `Pressed` output | yes | not tested | no |
| Dropdown start value | `Default` (text) | `DefaultSelectedItems` (a table) | check |
| Default padding | 5 on each side | 0 | 5 on each side |

The current modern rows were read from `describe_canvas_control` on
2026-11-20. The Fluent rows were confirmed on a real app between August and
November 2026. Where a cell says "check" or "not tested", ask
`describe_canvas_control` with the type name, for example
`name: "modernDropdown"`.

---

## What Goes Wrong

- **Text controls that scroll.** A modern or Fluent text label shorter than
  its text shows a vertical scrollbar; six appeared at once on one real
  screen. Give it a height of at least 1.37 times the font size plus its top
  and bottom padding (Size 20 with padding 5 needs 38); wrapped text needs
  more. For current modern labels (`modernText`) whose height is not set by
  their container, the staging reply's `layoutSuggestions` flags this
  (`text-height`) and also suggests `AutoHeight: true`, which has not been
  tried on a real app. A label that grows with `AutoHeight` does not make a
  fixed-height container grow with it (Microsoft's layout guide), so budget
  the container's height too. Fluent labels are not checked. The fix that worked on
  a real app was converting to a classic `Label`, which clips instead
  (`Overflow.Hidden`).
- **Galleries draw their own scrollbar**, shown when the pointer is over the
  gallery (on touch screens, once scrolling starts). `ShowScrollbar: false`
  hides it. Wheel and drag scrolling should still work; Microsoft's page does
  not say, and this was not tested.
- **Shrunk buttons.** A button shorter than its top plus bottom padding pushes
  its label off center. Set the vertical padding to 0 when you shrink one.
- **Taps inside a gallery.** Reported from earlier work, not tested since:
  Fluent controls may swallow clicks that classic controls pass to the
  gallery's `OnSelect`. If tapping a row does nothing, check whether the tap
  hits a Fluent control. The current modern controls were not tested either.
- **Copying a formula between generations.** `txtName.Value` from a Fluent
  input fails on a current modern input; it needs `txtName.Text`.
  `check_canvas_formula` catches this ("is not a property of that control").

---

## Changing a Control's Generation

There is no edit that converts a control in place. Add the replacement with
`addControl` (`modern: false` for classic), copy its formulas across with
`setProperty` using the new generation's property names, update every formula
that refers to the old control (`deleteControl` lists them when it refuses),
then delete the old one. This sequence was not tested end to end.
