---
name: plantuml-ascii
description: "Generate ASCII art diagrams using PlantUML text mode. Use when user asks to create ASCII diagrams, text-based diagrams, terminal-friendly diagrams, or mentions plantuml ascii, text diagram, ascii art diagram. Supports: Converting PlantUML diagrams to ASCII art, Creating sequence diagrams, class diagrams, flowcharts in ASCII format, Generating Unicode-enhanced ASCII art with -utxt flag"
license: MIT
allowed-tools: Bash, Write, Read
---

# PlantUML ASCII Art Diagram Generator

## Overview

Create text-based ASCII art diagrams using PlantUML. Perfect for documentation in terminal environments, README files, emails, or any scenario where graphical diagrams aren't suitable.

## What is PlantUML ASCII Art?

PlantUML can generate diagrams as plain text (ASCII art) instead of images. This is useful for:

- Terminal-based workflows
- Git commits/PRs without image support
- Documentation that needs to be version-controlled
- Environments where graphical tools aren't available

## Installation

```bash
# macOS
brew install plantuml

# Linux (varies by distro)
sudo apt-get install plantuml  # Ubuntu/Debian
sudo yum install plantuml      # RHEL/CentOS

# Or download JAR directly
wget https://github.com/plantuml/plantuml/releases/download/v1.2024.0/plantuml-1.2024.0.jar
```

## Output Formats

| Flag    | Format        | Description                          |
| ------- | ------------- | ------------------------------------ |
| `-txt`  | ASCII         | Pure ASCII characters                |
| `-utxt` | Unicode ASCII | Enhanced with box-drawing characters |

## Basic Workflow

### 1. Create PlantUML Diagram File

```plantuml
@startuml
participant Bob
actor Alice

Bob -> Alice : hello
Alice -> Bob : Is it ok?
@enduml
```

### 2. Generate ASCII Art

```bash
# Standard ASCII output
plantuml -txt diagram.puml

# Unicode-enhanced output (better looking)
plantuml -utxt diagram.puml

# Using JAR directly
java -jar plantuml.jar -txt diagram.puml
java -jar plantuml.jar -utxt diagram.puml
```

### 3. View Output

Output is saved as `diagram.atxt` (ASCII) or `diagram.utxt` (Unicode).

## Diagram Types Supported

### Sequence Diagram

```plantuml
@startuml
actor User
participant "Web App" as App
database "Database" as DB

User -> App : Login Request
App -> DB : Validate Credentials
DB --> App : User Data
App --> User : Auth Token
@enduml
```

### Class Diagram

```plantuml
@startuml
class User {
  +id: int
  +name: string
  +email: string
  +login(): bool
}

class Order {
  +id: int
  +total: float
  +items: List
  +calculateTotal(): float
}

User "1" -- "*" Order : places
@enduml
```

### Activity Diagram

```plantuml
@startuml
start
:Initialize;
if (Is Valid?) then (yes)
  :Process Data;
  :Save Result;
else (no)
  :Log Error;
  stop
endif
:Complete;
stop
@enduml
```

### State Diagram

```plantuml
@startuml
[*] --> Idle
Idle --> Processing : start
Processing --> Success : complete
Processing --> Error : fail
Success --> [*]
Error --> Idle : retry
@enduml
```

### Component Diagram

```plantuml
@startuml
[Client] as client
[API Gateway] as gateway
[Service A] as svcA
[Service B] as svcB
[Database] as db

client --> gateway
gateway --> svcA
gateway --> svcB
svcA --> db
svcB --> db
@enduml
```

### Use Case Diagram

```plantuml
@startuml
actor "User" as user
actor "Admin" as admin

rectangle "System" {
  user -- (Login)
  user -- (View Profile)
  user -- (Update Settings)
  admin -- (Manage Users)
  admin -- (Configure System)
}
@enduml
```

### Deployment Diagram

```plantuml
@startuml
actor "User" as user
node "Load Balancer" as lb
node "Web Server 1" as ws1
node "Web Server 2" as ws2
database "Primary DB" as db1
database "Replica DB" as db2

user --> lb
lb --> ws1
lb --> ws2
ws1 --> db1
ws2 --> db1
db1 --> db2 : replicate
@enduml
```

## Command-Line Options

```bash
# Specify output directory
plantuml -txt -o ./output diagram.puml

# Process all files in directory
plantuml -txt ./diagrams/

# Include dot files (hidden files)
plantuml -txt -includeDot diagrams/

# Verbose output
plantuml -txt -v diagram.puml

# Specify charset
plantuml -txt -charset UTF-8 diagram.puml
```

## Ant Task Integration

```xml
<target name="generate-ascii">
  <plantuml dir="./src" format="txt" />
</target>

<target name="generate-unicode-ascii">
  <plantuml dir="./src" format="utxt" />
</target>
```

## Tips for Better ASCII Diagrams

1. **Keep it simple**: Complex diagrams don't render well in ASCII
2. **Short labels**: Long text breaks ASCII alignment
3. **Use Unicode (`-utxt`)**: Better visual quality with box-drawing chars
4. **Test before sharing**: Verify in terminal with fixed-width font
5. **Consider alternatives**: For complex diagrams, use Mermaid.js or graphviz

## Example Output Comparison

**Standard ASCII (`-txt`)**:

```
     ,---.          ,---.
     |Bob|          |Alice|
     `---'          `---'
      |   hello      |
      |------------->|
      |              |
      |  Is it ok?   |
      |<-------------|
      |              |
```

**Unicode ASCII (`-utxt`)**:

```
┌─────┐        ┌─────┐
│ Bob │        │Alice│
└─────┘        └─────┘
  │   hello      │
  │─────────────>│
  │              │
  │  Is it ok?   │
  │<─────────────│
  │              │
```

## Quick Reference

```bash
# Create sequence diagram in ASCII
cat > seq.puml << 'EOF'
@startuml
Alice -> Bob: Request
Bob --> Alice: Response
@enduml
EOF

plantuml -txt seq.puml
cat seq.atxt

# Create with Unicode
plantuml -utxt seq.puml
cat seq.utxt
```

## Troubleshooting

**Problem**: Garbled Unicode characters

- **Solution**: Ensure terminal supports UTF-8 and has proper font

**Problem**: Diagram looks misaligned

- **Solution**: Use fixed-width font (Courier, Monaco, Consolas)

**Problem**: Command not found

- **Solution**: Install PlantUML or use Java JAR directly

**Problem**: Output file not created

- **Solution**: Check file permissions, ensure PlantUML has write access
