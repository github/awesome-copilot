# SynergyMesh Copilot Configuration

This directory contains GitHub Copilot and VS Code configuration files optimized for the [SynergyMesh](https://github.com/synergynet/synergymesh) project - a TypeScript library for web-based multi-user natural user interface applications.

## 📁 Contents

```
synergymesh-copilot-config/
├── .github/
│   ├── copilot-instructions.md      # Project-specific Copilot instructions
│   └── prompts/
│       ├── create-synergymesh-app.prompt.md    # Create new app
│       ├── add-network-event.prompt.md         # Add Socket.io events
│       ├── implement-touch-gesture.prompt.md   # Implement gestures
│       ├── debug-synergymesh.prompt.md         # Debug issues
│       └── add-content.prompt.md               # Add content/data
└── .vscode/
    ├── settings.json        # Editor settings
    ├── extensions.json      # Recommended extensions
    ├── tasks.json           # Build and run tasks
    └── launch.json          # Debug configurations
```

## 🚀 Installation

Copy the configuration files to your SynergyMesh project:

```bash
# Clone or download this configuration
# Then copy to your SynergyMesh project root

# Copy GitHub Copilot instructions
cp -r synergymesh-copilot-config/.github /path/to/synergymesh/

# Copy VS Code settings
cp -r synergymesh-copilot-config/.vscode /path/to/synergymesh/
```

Or use the install links below for individual prompts:

## 📝 Available Prompts

| Prompt | Description | Install |
|--------|-------------|---------|
| [Create SynergyMesh App](.github/prompts/create-synergymesh-app.prompt.md) | Create a new multi-touch collaborative application | Copy to `.github/prompts/` |
| [Add Network Event](.github/prompts/add-network-event.prompt.md) | Add Socket.io real-time events | Copy to `.github/prompts/` |
| [Implement Touch Gesture](.github/prompts/implement-touch-gesture.prompt.md) | Add new touch gesture support | Copy to `.github/prompts/` |
| [Debug SynergyMesh](.github/prompts/debug-synergymesh.prompt.md) | Diagnose touch and networking issues | Copy to `.github/prompts/` |
| [Add Content](.github/prompts/add-content.prompt.md) | Add items and data to apps | Copy to `.github/prompts/` |

## 🛠️ VS Code Tasks

After installing, use these tasks from the Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task"):

- **Build** - Compile TypeScript with Webpack
- **Start All (Dev)** - Start both dev server and networking server
- **Start Dev Server** - Start Webpack dev server only
- **Start Networking Server** - Start Socket.io server only
- **Generate Docs** - Generate TypeDoc documentation

## 🐛 Debug Configurations

Available in the Debug panel (`F5`):

- **Launch Chrome** - Start app in Chrome with debugger
- **Debug Server** - Debug the Node.js server
- **Full Stack Debug** - Debug both client and server

## 📚 Copilot Instructions Coverage

The `copilot-instructions.md` includes guidance for:

- ✅ TypeScript development standards
- ✅ Multi-touch event handling patterns
- ✅ Socket.io networking conventions
- ✅ D3.js v3 integration
- ✅ Application structure and organization
- ✅ Content management
- ✅ Testing and debugging

## 🔗 Related Resources

- [SynergyMesh Repository](https://github.com/synergynet/synergymesh)
- [SynergyMesh Wiki](https://github.com/jamcnaughton/synergymesh/wiki)
- [awesome-copilot](https://github.com/github/awesome-copilot) - Source of base configurations

## 📄 License

MIT License - Same as SynergyMesh project
