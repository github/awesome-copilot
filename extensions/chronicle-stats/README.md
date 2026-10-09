# My AI Usage

See your local Copilot token usage by day, model, and session, and get tips to use it more efficiently.

![My AI Usage activity view](https://raw.githubusercontent.com/github/awesome-copilot/main/extensions/chronicle-stats/assets/activity.png)

## Requirements

- GitHub Copilot app with canvas support
- Node 22.13+ (uses `node:sqlite`)
- Signed in to Copilot for Insights

## Usage

1. `copilot plugin install chronicle-stats@awesome-copilot`
2. In the Copilot app, open **Canvases** and open **My AI Usage**.

## Privacy

Reads your local session store read-only. Insights run through your Copilot session and are saved to `~/.copilot/extensions/chronicle-stats/artifacts/.private/` by default, or `$COPILOT_HOME/extensions/chronicle-stats/artifacts/.private/` when `COPILOT_HOME` is set.

## Troubleshooting

- **Storage busy**: quit all Copilot processes, back up and delete `.write-lock` in the folder above, then reopen.
- **Invalid store**: back up `insights.json`, then restore a good copy. Don't replace it with an empty file.
