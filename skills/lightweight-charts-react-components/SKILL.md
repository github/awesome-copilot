---
name: lightweight-charts-react-components
description: lightweight-charts-react-components recipes for TradingView lightweight-charts in React. Candlestick, line, and area series; volume and indicator panes; realtime WebSocket updates; infinite history on scroll; crosshair OHLC legends and tooltips; trade markers and price lines; synchronized charts; numeric options and yield-curve axes. Use when adding or fixing a financial or trading chart in a React app, or when the user mentions lightweight-charts, TradingView charts in React, or this package.
license: MIT
metadata:
  author: ukorvl
  version: "1.0"
  source: "https://github.com/ukorvl/lightweight-charts-react-components/tree/0368191127568e48aef6f7bda2ff3900e8e24756/skills/lightweight-charts-react-components"
---

# lightweight-charts-react-components guide

## Quick Start

Let the components manage chart and series creation and cleanup. Import components
and ref types from `lightweight-charts-react-components`; import native data, option,
and event types from `lightweight-charts`.

1. Check versions against the compatibility table below. Read declared ranges
   from the app's `package.json`, then the installed versions from the `version`
   field of `node_modules/<package>/package.json` for
   `lightweight-charts-react-components`, `lightweight-charts`, `react`, and
   `react-dom`. If the library is not installed, follow
   [Installation](#installation). Ensure chart rendering runs in the browser,
   within the app's client boundary.
2. For a basic static chart, start from the minimal chart below. Otherwise, read the
   reference matching the requested behavior. Adapt its feed and UI; preserve its
   data contract, component nesting, and API readiness handling.
3. Choose one data owner: pass the complete dataset through `data` for React-owned
   updates, or use `reactive={false}` and the series API for frequent ticks.

### Installation

Install the wrapper together with its `lightweight-charts` peer dependency, using
the project's package manager. React and React DOM must already be installed.

```sh
npm install lightweight-charts-react-components lightweight-charts
```

### Minimal chart

```tsx
import type { LineData, UTCTimestamp } from "lightweight-charts";
import {
  Chart,
  LineSeries,
  TimeScale,
  TimeScaleFitContentTrigger,
} from "lightweight-charts-react-components";

// Data must be sorted ascending by time with unique times (UTC seconds here).
export function SimpleLineChart({ data }: { data: LineData<UTCTimestamp>[] }) {
  return (
    // autoSize follows the container, which needs a nonzero height.
    <Chart
      options={{ autoSize: true }}
      containerProps={{ style: { height: 300, width: "100%" } }}
    >
      <LineSeries data={data} />
      <TimeScale>
        <TimeScaleFitContentTrigger deps={[]} />
      </TimeScale>
    </Chart>
  );
}
```

## Examples and snippets (reference files)

Read the reference matching the user's outcome. Each contains a complete TypeScript
recipe, data and integration contracts, reasons for the architecture, failure modes,
and acceptance checks. Combine references when a task spans several outcomes; do
not load every reference for a simple chart.

| User request                                                                         | Reference                                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| WebSocket candles, updating the current bar, stale history, excessive chart renders  | [Market data and live updates](references/market-data-and-live-updates.md)       |
| Older history on scroll, viewport jumps, symbol/interval changes, late API responses | [History and range selection](references/history-and-range-selection.md)         |
| Candles plus volume, moving averages, oscillator panes, independent price scales     | [Price, volume, and indicators](references/price-volume-and-indicators.md)       |
| OHLC legend, hover details, missing data, tooltip positioning                        | [Hover legends and tooltips](references/hover-legends-and-tooltips.md)           |
| Executions and signals, stop/target levels, click-to-place price lines               | [Trade markers and price levels](references/trade-markers-and-price-levels.md)   |
| Compare assets with different prices, fixed-baseline returns, toggle comparisons     | [Performance comparison](references/performance-comparison.md)                   |
| Separate charts that share scrolling, zooming, and a crosshair                       | [Synchronized charts](references/synchronized-charts.md)                         |
| Trading-session shading, pane backgrounds, custom drawing that follows zoom          | [Session overlays and primitives](references/session-overlays-and-primitives.md) |
| Options strikes, yield maturities, choosing a numeric or custom horizontal axis      | [Numeric axes and chart types](references/numeric-axes-and-chart-types.md)       |

If no reference matches the request, tell the user that the skill has no recipe
for it. Then build the solution from the public components and the upstream
`lightweight-charts` API, applying the Quick Start rules and the edge cases below.

### Skill compatibility

The recipes are verified against the reference versions below. These are the
tested baseline, not the latest available releases.

If an installed version differs from the reference version, compare it with the
compatibility range. Inside the range, recipes apply as written. Outside it,
tell the user about the mismatch before writing code, because breaking API
changes can affect the recipes, and verify every API the recipe uses against
the installed package.

| Dependency or environment             | Reference version | Compatibility range and checks                                                                                                                       |
| ------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lightweight-charts-react-components` | `2.6.1`           | Recipe target: `>=2.6.1 <3`. Other versions require checking installed exports, chart API refs, and reactive data behavior before adapting a recipe. |
| `lightweight-charts`                  | `5.2.1`           | Declared peer: `>=5.0.8 <6`.                                                                                                                         |
| React and React DOM                   | `19.2.6`          | Declared peers: `>=18.2 <20`. Keep `react` and `react-dom` on matching versions and use the application's existing React instance.                   |
| Node.js                               | —                 | Package engines: `>=18.14.0`. The app's build tools can require a newer version.                                                                     |
| Module system                         | ESM               | ESM `import` entry only; there is no CommonJS `require` entry.                                                                                       |
| Rendering                             | Browser           | Charts need the DOM and canvas. Render them on the client, never during server rendering.                                                            |

## Common edge cases

- **Chart sizing:** Put DOM styles on `containerProps` and give the chart a
  nonzero height.
- **Required ancestors:** Headless chart children need a chart wrapper ancestor.
  `Markers`, `PriceLine`, and `SeriesPrimitive` belong inside their series;
  `PriceScale`, `Watermark`, and `PanePrimitive` require a `Pane`;
  `TimeScaleFitContentTrigger` requires a `TimeScale`.
- **API refs and readiness:** Use `ref.current?.api()` for the native API and
  `containerRef` for the div. For `Chart`, use `ChartApiRef<Time, IChartApi>`.
  `.api()` can initially return null; follow the recipe's readiness step before
  imperative setup.
- **Viewport resets:** To preserve scroll/zoom, keep the chart's key stable and
  live/history updates out of fit-trigger dependencies. Fit on initial load or a
  deliberate reset. See [range handling](references/history-and-range-selection.md).
- **Data updates:** Use `data` for React-owned updates, or `reactive={false}` and the
  series API when per-tick React renders are measurably costly. Avoid mixing both.
  Reactive `data` is always the complete dataset. With wrapper 2.6.1 and
  Lightweight Charts 5.2.1, `series.data()` reconstructs candle and line objects;
  the wrapper's earlier-item reference comparison therefore sends multi-bar tail
  updates through `setData()`, even when React keeps earlier references stable.
  Keep data immutable, but use the chart-owned `reactive={false}` recipe and
  explicit `series.update(bar)` when incremental writes are required. See
  [live updates](references/market-data-and-live-updates.md).

## Source

Adapted from [ukorvl/lightweight-charts-react-components](https://github.com/ukorvl/lightweight-charts-react-components/tree/0368191127568e48aef6f7bda2ff3900e8e24756/skills/lightweight-charts-react-components)
at commit `0368191127568e48aef6f7bda2ff3900e8e24756`. Original author: ukorvl.
The [MIT license](LICENSE) and all nine reference recipes are retained. Local
corrections in [live updates](references/market-data-and-live-updates.md) reject
malformed timestamps and explain the tested versions' reactive-update limitation;
[session overlays](references/session-overlays-and-primitives.md) clarifies the
primitive update callback.
The other seven references and MIT notice are unchanged. This catalog copy adds
source attribution and operational boundaries; it does not imply TradingView
endorsement.

Recipes generate application code and can change dependencies. Follow the user's
requested scope and the host's approval policy. Feed access belongs to the app's
separately authorized adapter; keep credentials out of client code. Trade markers
are visual annotations, not order execution or server-side alerts. Use synthetic
data for local checks and report browser/feed behavior that remains untested.
