# Configuration File System

The Awesome Copilot repository supports a configuration file system that allows you to easily manage which prompts, instructions, chat modes, and collections are included in your project.

## Installation

### Via Git Clone (Required)
```bash
# Clone the repository
git clone https://github.com/AstroSteveo/awesome-copilot
cd awesome-copilot

# Install dependencies
npm install

# Now you can use the CLI tool
node awesome-copilot.js help
```

**Note:** The `awesome-copilot` package is not yet published to npm, so you must clone the repository to use the CLI tool.

## Quick Start

### 1. Initialize Your Project

Navigate to your project directory where you want to add awesome-copilot customizations, then run:

```bash
# Initialize with default configuration
node /path/to/awesome-copilot/awesome-copilot.js init

# Or initialize with a specific name
node /path/to/awesome-copilot/awesome-copilot.js init my-project.config.yml
```

**Tip:** You can create an alias or add the awesome-copilot directory to your PATH for easier access:
```bash
# Add to your ~/.bashrc or ~/.zshrc
alias awesome-copilot="node /path/to/awesome-copilot/awesome-copilot.js"
```

This creates:
- Configuration file (`awesome-copilot.config.yml`)
- `.awesome-copilot/` directory structure
- VS Code settings pointing to `.awesome-copilot/` directories
- `.gitignore` entry to exclude generated files

### 2. Enable Desired Items

Edit the configuration file to set items to `true` that you want to include:

```yaml
version: "1.0"
project:
  name: "My Project"
  description: "A project using awesome-copilot customizations"
  output_directory: ".awesome-copilot"
prompts:
  create-readme: true
  editorconfig: true
  generate-tests: false
instructions:
  typescript-best-practices: true
  testing-standards: true
  react: false
chatmodes:
  architect: true
  dba: false
  specification: true
collections:
  frontend-web-dev: true
  csharp-dotnet-development: false
```

### 3. Apply Configuration

```bash
# Apply default configuration file
node /path/to/awesome-copilot/awesome-copilot.js apply

# Or apply specific configuration file  
node /path/to/awesome-copilot/awesome-copilot.js apply my-project.config.yml
```

This will copy the enabled files to your project's `.awesome-copilot` directory (or the directory specified in the config).

## Configuration File Format

### Top-level Structure

```yaml
version: "1.0"                    # Required: Config format version
project:                          # Optional: Project metadata
  name: "My Project"              # Project name
  description: "Project desc"     # Project description  
  output_directory: ".github"     # Where to copy files (default: .github)
prompts: {}                       # Enable/disable prompts
instructions: {}                  # Enable/disable instructions
chatmodes: {}                     # Enable/disable chat modes
collections: {}                   # Enable/disable collections
```

### Individual Items

Set any item to `true` to include it, `false` to exclude it:

```yaml
prompts:
  create-readme: true             # Include this prompt
  generate-tests: false           # Exclude this prompt
```

### Collections

Collections are special - when you enable a collection, it automatically includes all items in that collection:

```yaml
collections:
  frontend-web-dev: true          # Includes all prompts, instructions, and chat modes in this collection
```

## Output Structure

When you apply a configuration, files are organized as follows:

```
.awesome-copilot/
├── prompts/
│   └── *.prompt.md             # Prompts for /awesome-copilot commands
├── chatmodes/
│   └── *.chatmode.md           # Chat modes for VS Code
└── instructions/
    └── *.instructions.md       # Instructions that auto-apply to coding
```

VS Code automatically detects these files through the generated `.vscode/settings.json` configuration.

## NPM Scripts

If you've cloned the repository locally, you can also use npm scripts:

```bash
# Initialize configuration
npm run config:init

# Apply configuration
npm run config:apply

# Access CLI help
npm run config help
```

## VS Code Integration

The `node awesome-copilot.js init` command automatically configures VS Code to detect your customizations:

- Creates `.vscode/settings.json` with proper file locations
- Points to `.awesome-copilot/` directories instead of framework directories
- Maintains separation between your project and the awesome-copilot framework

No manual VS Code configuration needed!

## Examples

### Frontend React Project

```yaml
version: "1.0"
project:
  name: "React Frontend"
  output_directory: ".github"
collections:
  frontend-web-dev: true
prompts:
  create-readme: true
  editorconfig: true
chatmodes:
  specification: true
```

### Backend .NET Project

```yaml
version: "1.0"
project:
  name: ".NET API"
  output_directory: ".awesome-copilot"
collections:
  csharp-dotnet-development: true
instructions:
  testing-standards: true
prompts:
  create-specification: true
```

### Full Stack Project

```yaml
version: "1.0"
project:
  name: "Full Stack App"
  output_directory: ".awesome-copilot"
collections:
  frontend-web-dev: true
  csharp-dotnet-development: true
  database-data-management: true
chatmodes:
  architect: true
  specification: true
```

## Migration from Manual Approach

If you were previously copying files manually or using an older version:

1. Remove manually copied files from your `.github` directory
2. Clone awesome-copilot repository: `git clone https://github.com/AstroSteveo/awesome-copilot`
3. Run `node /path/to/awesome-copilot/awesome-copilot.js init` to create a clean setup
4. Edit the config to enable the same items you were using manually
5. Run `node /path/to/awesome-copilot/awesome-copilot.js apply` to get a clean, managed setup

The new approach uses `.awesome-copilot/` directory instead of `.github/` for better separation.

## Benefits

- **Centralized Management**: One file controls all your Copilot customizations
- **VS Code Integration**: Automatic configuration, no manual setup required
- **Clear Separation**: Framework files separated from your project files
- **Version Control Friendly**: Config file tracks what's enabled, generated files are ignored
- **Easy Updates**: Re-run apply command after awesome-copilot updates
- **Collection Support**: Enable entire curated sets with one setting
- **Minimal Footprint**: Only enabled files are copied to your project