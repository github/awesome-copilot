# Configuration File System

The Awesome Copilot repository now supports a configuration file system that allows you to easily manage which prompts, instructions, chat modes, and collections are included in your project.

## Quick Start

### 1. Generate a Configuration File

```bash
# Generate default configuration file
node awesome-copilot.js init

# Or generate with a specific name
node awesome-copilot.js init my-project.config.yml
```

This creates a YAML configuration file with all available items set to `false` by default.

### 2. Enable Desired Items

Edit the configuration file to set items to `true` that you want to include:

```yaml
version: "1.0"
project:
  name: "My Project"
  description: "A project using awesome-copilot customizations"
  output_directory: ".github"
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
node awesome-copilot.js apply

# Or apply specific configuration file  
node awesome-copilot.js apply my-project.config.yml
```

This will copy the enabled files to your project's `.github` directory (or the directory specified in the config).

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
.github/
├── copilot/
│   ├── *.prompt.md             # Prompts for /awesome-copilot commands
│   └── *.chatmode.md           # Chat modes for VS Code
└── instructions/
    └── *.instructions.md       # Instructions that auto-apply to coding
```

## NPM Scripts

You can also use npm scripts instead of the CLI:

```bash
# Generate configuration
npm run config:init

# Apply configuration
npm run config:apply

# Access CLI
npm run config help
```

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
  output_directory: ".github"
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
  output_directory: ".github"
collections:
  frontend-web-dev: true
  csharp-dotnet-development: true
  database-data-management: true
chatmodes:
  architect: true
  specification: true
```

## Migration from Manual Approach

If you were previously copying files manually:

1. Remove manually copied files from your `.github` directory
2. Run `node awesome-copilot.js init` to create a config file
3. Edit the config to enable the same items you were using manually
4. Run `node awesome-copilot.js apply` to get a clean, managed setup

## Benefits

- **Centralized Management**: One file controls all your Copilot customizations
- **Version Control Friendly**: Config file tracks what's enabled in your project
- **Easy Updates**: Re-run apply command after pulling awesome-copilot updates
- **Collection Support**: Enable entire curated sets with one setting
- **Clean Organization**: Files are organized in proper directory structure