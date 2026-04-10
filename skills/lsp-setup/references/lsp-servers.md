# Known LSP Servers for Copilot CLI

Reference data for the `lsp-setup` skill. Each section contains install commands per OS and a ready-to-use config snippet.

> **Config snippet format**: Each snippet below shows the object to insert as a value under the top-level `lspServers` key. A complete config file looks like: `{ "lspServers": { <snippet here> } }`. When adding multiple languages, merge their snippets as sibling keys under `lspServers`.

---

## TypeScript / JavaScript

**Server**: [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server)

### Install

| OS      | Command                                               |
|---------|-------------------------------------------------------|
| Any     | `npm install -g typescript typescript-language-server` |

### Config snippet

```json
{
  "typescript": {
    "command": "typescript-language-server",
    "args": ["--stdio"],
    "fileExtensions": {
      ".ts": "typescript",
      ".tsx": "typescriptreact",
      ".js": "javascript",
      ".jsx": "javascriptreact"
    }
  }
}
```

---

## Java

**Server**: [Eclipse JDT Language Server (jdtls)](https://github.com/eclipse-jdtls/eclipse.jdt.ls)

Requires **Java 21+** on `JAVA_HOME` or `$PATH`.

### Install

| OS      | Command                           |
|---------|-----------------------------------|
| macOS   | `brew install jdtls`              |
| Linux   | Check distro repos for `jdtls` or `eclipse.jdt.ls`; alternatively download from https://download.eclipse.org/jdtls/milestones/ |
| Windows | Download from https://download.eclipse.org/jdtls/milestones/ and add `bin/` to `PATH` |

On macOS with Homebrew, the binary is installed as `jdtls` on `$PATH`.

### Config snippet

```json
{
  "java": {
    "command": "jdtls",
    "args": [],
    "fileExtensions": {
      ".java": "java"
    }
  }
}
```

> **Note**: The `jdtls` wrapper script handles `--stdio` mode internally. If using a manual install, you may need to invoke the launcher jar directly — see the [jdtls README](https://github.com/eclipse-jdtls/eclipse.jdt.ls#running-from-command-line-with-wrapper-script) for details.

---

## Python

**Server**: [pyright](https://github.com/microsoft/pyright)

### Install

| OS      | Command                    |
|---------|----------------------------|
| Any     | `npm install -g pyright`   |
| Any     | `pip install pyright`      |

### Config snippet

```json
{
  "python": {
    "command": "pyright-langserver",
    "args": ["--stdio"],
    "fileExtensions": {
      ".py": "python"
    }
  }
}
```

---

## Go

**Server**: [gopls](https://github.com/golang/tools/tree/master/gopls)

### Install

| OS      | Command                                    |
|---------|--------------------------------------------|
| Any     | `go install golang.org/x/tools/gopls@latest` |
| macOS   | `brew install gopls`                       |

### Config snippet

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "fileExtensions": {
      ".go": "go"
    }
  }
}
```

---

## Rust

**Server**: [rust-analyzer](https://github.com/rust-lang/rust-analyzer)

### Install

| OS      | Command                        |
|---------|--------------------------------|
| Any     | `rustup component add rust-analyzer` |
| macOS   | `brew install rust-analyzer`   |
| Linux   | Distribution package or `rustup` |
| Windows | `rustup component add rust-analyzer` or download from GitHub releases |

### Config snippet

```json
{
  "rust": {
    "command": "rust-analyzer",
    "args": [],
    "fileExtensions": {
      ".rs": "rust"
    }
  }
}
```

---

## C / C++

**Server**: [clangd](https://clangd.llvm.org/)

### Install

| OS      | Command                                |
|---------|----------------------------------------|
| macOS   | `brew install llvm` (clangd included) or Xcode command line tools |
| Linux   | `apt install clangd` / `dnf install clang-tools-extra` |
| Windows | Download LLVM from https://releases.llvm.org/ |

### Config snippet

```json
{
  "cpp": {
    "command": "clangd",
    "args": ["--background-index"],
    "fileExtensions": {
      ".c": "c",
      ".h": "c",
      ".cpp": "cpp",
      ".cxx": "cpp",
      ".cc": "cpp",
      ".hpp": "cpp",
      ".hxx": "cpp"
    }
  }
}
```

---

## C# (.NET)

**Server**: [Roslyn Language Server](https://github.com/dotnet/roslyn) (via `dotnet dnx`)

### Install

| OS      | Command                                                        |
|---------|----------------------------------------------------------------|
| Any     | Requires the [.NET SDK](https://dot.net/download) installed    |

### Config snippet

```json
{
  "csharp": {
    "command": "dotnet",
    "args": ["dnx", "roslyn-language-server", "--yes", "--prerelease", "--", "--stdio", "--autoLoadProjects"],
    "fileExtensions": {
      ".cs": "csharp"
    }
  }
}
```

---

## Ruby

**Server**: [solargraph](https://github.com/castwide/solargraph)

### Install

| OS      | Command                   |
|---------|---------------------------|
| Any     | `gem install solargraph`  |

### Config snippet

```json
{
  "ruby": {
    "command": "solargraph",
    "args": ["stdio"],
    "fileExtensions": {
      ".rb": "ruby",
      ".rake": "ruby",
      ".gemspec": "ruby"
    }
  }
}
```

---

## PHP

**Server**: [intelephense](https://github.com/bmewburn/vscode-intelephense)

### Install

| OS      | Command                                    |
|---------|--------------------------------------------|
| Any     | `npm install -g intelephense`              |

### Config snippet

```json
{
  "php": {
    "command": "intelephense",
    "args": ["--stdio"],
    "fileExtensions": {
      ".php": "php"
    }
  }
}
```

---

## Kotlin

**Server**: [kotlin-language-server](https://github.com/fwcd/kotlin-language-server)

### Install

| OS      | Command                                           |
|---------|---------------------------------------------------|
| macOS   | `brew install kotlin-language-server`             |
| Any     | Download from GitHub releases and add to `PATH`   |

### Config snippet

```json
{
  "kotlin": {
    "command": "kotlin-language-server",
    "args": [],
    "fileExtensions": {
      ".kt": "kotlin",
      ".kts": "kotlin"
    }
  }
}
```

---

## Swift

**Server**: [sourcekit-lsp](https://github.com/swiftlang/sourcekit-lsp) (bundled with Swift toolchain)

### Install

| OS      | Command                                                        |
|---------|----------------------------------------------------------------|
| macOS   | Included with Xcode; binary at `xcrun sourcekit-lsp`          |
| Linux   | Included with Swift toolchain; install from https://swift.org  |

### Config snippet

```json
{
  "swift": {
    "command": "sourcekit-lsp",
    "args": [],
    "fileExtensions": {
      ".swift": "swift"
    }
  }
}
```

> On macOS you may need to use the full path: `/usr/bin/sourcekit-lsp` or set `command` to `xcrun` with `args: ["sourcekit-lsp"]`.

---

## Lua

**Server**: [lua-language-server](https://github.com/LuaLS/lua-language-server)

### Install

| OS      | Command                              |
|---------|--------------------------------------|
| macOS   | `brew install lua-language-server`   |
| Linux   | Download from GitHub releases        |
| Windows | Download from GitHub releases        |

### Config snippet

```json
{
  "lua": {
    "command": "lua-language-server",
    "args": [],
    "fileExtensions": {
      ".lua": "lua"
    }
  }
}
```

---

## YAML

**Server**: [yaml-language-server](https://github.com/redhat-developer/yaml-language-server)

### Install

| OS      | Command                                      |
|---------|----------------------------------------------|
| Any     | `npm install -g yaml-language-server`        |

### Config snippet

```json
{
  "yaml": {
    "command": "yaml-language-server",
    "args": ["--stdio"],
    "fileExtensions": {
      ".yaml": "yaml",
      ".yml": "yaml"
    }
  }
}
```

---

## Bash / Shell

**Server**: [bash-language-server](https://github.com/bash-lsp/bash-language-server)

### Install

| OS      | Command                                       |
|---------|-----------------------------------------------|
| Any     | `npm install -g bash-language-server`         |

### Config snippet

```json
{
  "bash": {
    "command": "bash-language-server",
    "args": ["start"],
    "fileExtensions": {
      ".sh": "shellscript",
      ".bash": "shellscript",
      ".zsh": "shellscript"
    }
  }
}
```
