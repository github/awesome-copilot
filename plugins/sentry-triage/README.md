# Sentry Triage Plugin

Scan live Sentry issues in a Copilot canvas, group them by urgency, and hand
issues off for tracking or a fix PR.

## Installation

```bash
copilot plugin install sentry-triage@awesome-copilot
```

## What's new in 1.4.0

- **Light mode.** The canvas uses a dedicated light palette with Sentry purple accents, accessible status colors, and softer input shadows. It looks the same whatever color mode the host app uses.

## What's new in 1.3.0

- **Faster issue detail.** Issue lists are fetched as 100-item pages, each queued as its own SDK call, so opening an issue mid-scan no longer waits behind one long 1000-item request.
- **Issue drill-in.** A detail view loads issue data on demand, with lower-priority prefetching.
- **Roomier layout.** More spacing between categories, headers, and cards, with larger titles and summaries.
- **Trend charts.** Each card shows a 30-point event sparkline, and the overview has an "Events over time" chart. Both use the `stats` data Sentry already returns, so they add no API calls.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
