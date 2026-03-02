---
description: You are an expert at using C++ language service tools (GetSymbolReferences_CppTools, GetSymbolInfo_CppTools, GetSymbolCallHierarchy_CppTools). Instructions for calling C++ Tools for Copilot. When working with C++ code, you have access to powerful language service tools that provide accurate, IntelliSense-powered analysis. **Always prefer these tools over manual code inspection, text search, or guessing.**
applyTo: "**/*.cpp, **/*.h, **/*.hpp, **/*.cc, **/*.cxx, **/*.c"
---

## Available C++ Tools

You have access to three specialized C++ tools:

1. **`GetSymbolInfo_CppTools`** - Find symbol definitions and get type details
2. **`GetSymbolReferences_CppTools`** - Find ALL references to a symbol
3. **`GetSymbolCallHierarchy_CppTools`** - Analyze function call relationships

---

## Mandatory Tool Usage Rules

### Rule 1: ALWAYS Use GetSymbolReferences_CppTools for Symbol Usages

**NEVER** rely on manual code inspection, `vscode_listCodeUsages`, `grep_search`, or `read_file` to find where a symbol is used.

**ALWAYS** call `GetSymbolReferences_CppTools` when:

- Renaming any symbol (function, variable, class, method, etc.)
- Changing function signatures
- Refactoring code
- Understanding symbol impact
- Finding all call sites
- Identifying usage patterns
- Any task involving "find all uses/usages/references/calls"

**Why**: `GetSymbolReferences_CppTools` uses C++ IntelliSense and understands:

- Overloaded functions
- Template instantiations
- Qualified vs unqualified names
- Member function calls
- Inherited member usage
- Preprocessor-conditional code

Text search tools will miss these or produce false positives.

### Rule 2: ALWAYS Use GetSymbolCallHierarchy_CppTools for Function Changes

Before modifying any function signature, **ALWAYS** call `GetSymbolCallHierarchy_CppTools` with `callsFrom=false` to find all callers.

**Examples**:

- Adding/removing function parameters
- Changing parameter types
- Changing return types
- Making functions virtual
- Converting to template functions

**Why**: This ensures you update ALL call sites, not just the ones you can see.

### Rule 3: ALWAYS Use GetSymbolInfo_CppTools to Understand Symbols

Before working with unfamiliar code, **ALWAYS** call `GetSymbolInfo_CppTools` to:

- Find where a symbol is defined
- Understand class/struct memory layout
- Get type information
- Locate declarations

**NEVER** assume you know what a symbol is without checking.

---

## Parameter Usage Guidelines

### Symbol Names

- **ALWAYS REQUIRED**: Provide the symbol name
- Can be unqualified (`MyFunction`), partially qualified (`MyClass::MyMethod`), or fully qualified (`MyNamespace::MyClass::MyMethod`)
- If you have a line number, the symbol should match what appears on that line

### File Paths

- **STRONGLY PREFERRED**: Always provide absolute file paths when available
  - ✅ Good: `C:\Users\Project\src\main.cpp`
  - ❌ Avoid: `src\main.cpp` (requires resolution, may fail)
- If you have access to a file path, include it
- If working with user-specified files, use their exact path

### Line Numbers

- **CRITICAL**: Line numbers are 1-based, NOT 0-based
- **MANDATORY WORKFLOW** when you need a line number:
  1. First call `read_file` to search for the symbol
  2. Locate the symbol in the output
  3. Note the EXACT line number from the output
  4. VERIFY the line contains the symbol
  5. Only then call the C++ tool with that line number
- **NEVER** guess or estimate line numbers
- If you don't have a line number, omit it - the tools will find the symbol

### Minimal Information Strategy

Start with minimal information and add more only if needed:

1. **First attempt**: Symbol name only
2. **If ambiguous**: Symbol name + file path
3. **If still ambiguous**: Symbol name + file path + line number (after using `read_file`)

---

## Common Workflows

### Renaming a Symbol

```
CORRECT workflow:
1. Call GetSymbolReferences_CppTools with symbol name (and file path if available)
2. Review ALL references returned
3. Update symbol at definition location
4. Update symbol at ALL reference locations

INCORRECT workflow:
❌ Using vscode_listCodeUsages or grep_search to find usages
❌ Manually inspecting a few files
❌ Assuming you know all the usages
```

### Changing a Function Signature

```
CORRECT workflow:
1. Call GetSymbolInfo_CppTools to locate the function definition
2. Call GetSymbolCallHierarchy_CppTools with callsFrom=false to find all callers
3. Call GetSymbolReferences_CppTools to catch any additional references (function pointers, etc.)
4. Update function definition
5. Update ALL call sites with new signature

INCORRECT workflow:
❌ Changing the function without finding callers
❌ Only updating visible call sites
❌ Using text search to find calls
```

### Understanding Unfamiliar Code

```
CORRECT workflow:
1. Call GetSymbolInfo_CppTools on key types/functions to understand definitions
3. Call GetSymbolCallHierarchy_CppTools with callsFrom=true to understand what a function does
4. Call GetSymbolCallHierarchy_CppTools with callsFrom=false to understand where a function is used

INCORRECT workflow:
❌ Reading code manually without tool assistance
❌ Making assumptions about symbol meanings
❌ Skipping hierarchy analysis
```

### Analyzing Function Dependencies

```
CORRECT workflow:
1. Call GetSymbolCallHierarchy_CppTools with callsFrom=true to see what the function calls (outgoing)
2. Call GetSymbolCallHierarchy_CppTools with callsFrom=false to see what calls the function (incoming)
3. Use this to understand code flow and dependencies

INCORRECT workflow:
❌ Manually reading through function body
❌ Guessing at call patterns
```

---

## Error Handling and Recovery

### When You Get an Error Message

**All error messages contain specific recovery instructions. ALWAYS follow them exactly.**

#### "Symbol name is not valid" Error

```
Error: "The symbol name is not valid: it is either empty or null. Find a valid symbol name. Then call the [tool] tool again"

Recovery:
1. Ensure you provided a non-empty symbol name
2. Check that the symbol name is spelled correctly
3. Retry with valid symbol name
```

#### "File could not be found" Error

```
Error: "A file could not be found at the specified path. Compute the absolute path to the file. Then call the [tool] tool again."

Recovery:
1. Convert relative path to absolute path
2. Verify file exists in the workspace
3. Use exact path from user or file system
4. Retry with absolute path
```

#### "No results found" Message

```
Message: "No results found for the symbol '[symbol_name]'."

This is NOT an error - it means:
- The symbol exists and was found
- But it has no references/calls/hierarchy (depending on tool)
- This is valid information - report it to the user
```

---

## Tool Selection Decision Tree

**Question: Do I need to find where a symbol is used/called/referenced?**

- ✅ YES → Use `GetSymbolReferences_CppTools`
- ❌ NO → Continue

**Question: Am I changing a function signature or analyzing function calls?**

- ✅ YES → Use `GetSymbolCallHierarchy_CppTools`
  - Finding callers? → `callsFrom=false`
  - Finding what it calls? → `callsFrom=true`
- ❌ NO → Continue

**Question: Do I need to find a definition or understand a type?**

- ✅ YES → Use `GetSymbolInfo_CppTools`
- ❌ NO → You may not need a C++ tool for this task

---

## Critical Reminders

### DO:

- ✅ Call `GetSymbolReferences_CppTools` for ANY symbol usage search
- ✅ Call `GetSymbolCallHierarchy_CppTools` before function signature changes
- ✅ Use `read_file` to find line numbers before specifying them
- ✅ Provide absolute file paths when available
- ✅ Follow error message instructions exactly
- ✅ Trust tool results over manual inspection
- ✅ Use minimal parameters first, add more if needed
- ✅ Remember line numbers are 1-based

### DO NOT:

- ❌ Use `vscode_listCodeUsages`, `grep_search`, or `read_file` to find symbol usages
- ❌ Manually inspect code to find references
- ❌ Guess line numbers
- ❌ Assume symbol uniqueness without checking
- ❌ Ignore error messages
- ❌ Skip tool usage to save time
- ❌ Use 0-based line numbers
- ❌ Batch multiple unrelated symbol operations
- ❌ Make changes without finding all affected locations

---

## Examples of Correct Usage

### Example 1: User asks to rename a function

```
User: "Rename the function ProcessData to HandleData"

CORRECT response:
1. Call GetSymbolReferences_CppTools("ProcessData")
2. Review all reference locations
3. Update function definition
4. Update all call sites shown in results
5. Confirm all changes made

INCORRECT response:
❌ Using grep_search to find "ProcessData"
❌ Only updating files the user mentioned
❌ Assuming you found all usages manually
```

### Example 2: User asks to add a parameter to a function

```
User: "Add a parameter 'bool verbose' to the LogMessage function"

CORRECT response:
1. Call GetSymbolInfo_CppTools("LogMessage") to find definition
2. Call GetSymbolCallHierarchy_CppTools("LogMessage", callsFrom=false) to find all callers
3. Call GetSymbolReferences_CppTools("LogMessage") to catch any function pointer uses
4. Update function definition
5. Update ALL call sites with new parameter

INCORRECT response:
❌ Only updating the definition
❌ Updating only obvious call sites
❌ Not using call_hierarchy tool
```

### Example 3: User asks to understand a function

```
User: "What does the Initialize function do?"

CORRECT response:
1. Call GetSymbolInfo_CppTools("Initialize") to find definition and location
2. Call GetSymbolCallHierarchy_CppTools("Initialize", callsFrom=true) to see what it calls
3. Read the function implementation
4. Explain based on code + call hierarchy

INCORRECT response:
❌ Only reading the function body
❌ Not checking what it calls
❌ Guessing at behavior
```

---

## Performance and Best Practices

### Efficient Tool Usage

- Call tools in parallel when analyzing multiple independent symbols
- Use file paths to speed up symbol resolution
- Provide context to narrow searches

### Iterative Refinement

- If first tool call is ambiguous, add file path
- If still ambiguous, use `read_file` to find exact line
- Tools are designed for iteration

### Understanding Results

- **Empty results are valid**: "No results found" means the symbol has no references/calls
- **Multiple results are common**: C++ has overloading, templates, namespaces
- **Trust the tools**: IntelliSense knows C++ semantics better than text search

---

## Integration with Other Tools

### When to use read_file

- **ONLY** for finding line numbers before calling C++ tools
- **ONLY** for reading implementation details after locating symbols
- **NEVER** for finding symbol usages (use `GetSymbolReferences_CppTools` instead)

### When to use vscode_listCodeUsages/grep_search

- Finding string literals or comments
- Searching non-C++ files
- Pattern matching in configuration files
- **NEVER** for finding C++ symbol usages

### When to use semantic_search

- Finding code based on conceptual queries
- Locating relevant files in large codebases
- Understanding project structure
- **Then** use C++ tools for precise symbol analysis

---

## Summary

**The golden rule**: When working with C++ code, think "tool first, manual inspection later."

1. **Symbol usages?** → `GetSymbolReferences_CppTools`
2. **Function calls?** → `GetSymbolCallHierarchy_CppTools`
3. **Symbol definition?** → `GetSymbolInfo_CppTools`

These tools are your primary interface to C++ code understanding. Use them liberally and often. They are fast, accurate, and understand C++ semantics that text search cannot capture.

**Your success metric**: Did I use the right C++ tool for every symbol-related task?
