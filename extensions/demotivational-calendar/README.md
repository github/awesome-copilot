# The Daily Letdown

A personal Copilot desktop canvas: a daily tear-off calendar with large day and
month typography and 366 original, gently demotivational English quotes.
No year is displayed. Each month/day always has the same quote, including
February 29. The calendar opens on the local date and follows midnight while
viewing today. Previous/next navigation wraps from December to January.

Ask Copilot to open **The Daily Letdown** or the **demotivational calendar**.
The canvas ID is `demotivational-calendar`; its `get_today` action returns
today's day, English month, and quote.

Installed under `~/.copilot/extensions/demotivational-calendar/`. New Copilot
sessions discover the extension automatically. If it was installed while a
session was already running, reload extensions or start a new session.

The renderer is a self-contained `index.html` and works offline. No packages,
external fonts, network services, or personal data storage are required.
The extension serves it on a loopback-only ephemeral port and closes the
server when the canvas closes.

Run the focused checks with `node --test calendar.test.mjs`.
