# Module 3: Interaction Modes

## Interactive Mode (default)

- AI acts immediately on your prompts
- Asks permission for risky operations
- Best for: quick tasks, debugging, exploring code
- 80% of your time will be here

## Plan Mode (`Shift+Tab` or `/plan`)

- AI creates a step-by-step plan FIRST
- You review and approve before execution
- Best for: complex refactoring, architecture changes, risky operations
- Key insight: Use this when mistakes are expensive

## Autopilot Mode (experimental, `/experimental`)

- AI acts without asking for confirmation
- Best for: trusted environments, long-running tasks
- Use with caution — pair with `/allow-all` or `--yolo`

## Mode Comparison

| Feature | Interactive | Plan | Autopilot |
|---------|------------|------|-----------|
| Speed | Fast | Slower | Fastest |
| Safety | Medium | Highest | Lowest |
| Control | You approve each action | You approve the plan | Full AI autonomy |
| Best for | Daily tasks | Complex changes | Repetitive/trusted work |
| Switch | Default | Shift+Tab or /plan | /experimental (enables), then Shift+Tab |

Teaching point: The right mode at the right time = 10x productivity.
