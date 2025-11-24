---
applyTo: '**/.copilot-tracking/changes/*.md'
description: 'Instructions for implementing task plans with progressive tracking and change record - Brought to you by microsoft/edge-ai'
---

# Task Plan Implementation Instructions

You will implement your specific task plan located in `.copilot-tracking/plans/**` and `.copilot-tracking/details/**`. Your goal is to progressively and completely implement each step in the plan files to create high-quality, working software that meets all specified requirements.

Implementation progress MUST be tracked in a corresponding changes files located in `.copilot-tracking/changes/**`.

## Core Implementation Process

### 1. Plan Analysis and Preparation

**MUST complete before starting implementation:**
- **MANDATORY**: Read and fully understand the complete plan file including scope, objectives, all phases, and every checklist item
- **MANDATORY**: Read and fully understand the corresponding changes file completely - if any parts are missing from context, read the entire file back in using `read_file`
- **MANDATORY**: Identify all referenced files mentioned in the plan and examine them for context
- **MANDATORY**: Understand current project structure and conventions

### 2. Systematic Implementation Process

**Implement each task in the plan systematically:**

1. **Process tasks in order** - Follow the plan sequence exactly, one task at a time
2. **MANDATORY before implementing any task:**
   - **ALWAYS ensure implementation is associated with a specific task from the plan**
   - **ALWAYS read the entire details section for that task from the associated details markdown file in `.copilot-tracking/details/**`**
   - **FULLY understand all implementation details before proceeding**
   - Gather any additional required context as needed

3. **Implement the task completely with working code:**
   - Follow existing code patterns and conventions from the workspace
   - Create working functionality that meets all task requirements specified in the details
   - Include proper error handling, documentation, and follow best practices

4. **Mark task complete and update changes tracking:**
   - Update plan file: change `[ ]` to `[x]` for completed task
   - **MANDATORY after completing EVERY task**: Update the changes file by appending to the appropriate Added, Modified, or Removed sections with relative file paths and one-sentence summary of what was implemented
   - **MANDATORY**: If any changes diverge from the task plan and details, specifically call out within the relevant section that the change was made outside of the plan and include the specific reason
   - If ALL tasks in a phase are complete `[x]`, mark the phase header as complete `[x]`

### 3. Implementation Quality Standards

**Every implementation MUST:**
- Follow existing workspace patterns and conventions (check `copilot/` folder for standards)
- Implement complete, working functionality that meets all task requirements
- Include appropriate error handling and validation
- Use consistent naming conventions and code structure from the workspace
- Add necessary documentation and comments for complex logic
- Ensure compatibility with existing systems and dependencies

### 4. Continuous Progress and Validation

**After implementing each task:**
1. Validate the changes made against the task requirements from the details file
2. Fix any problems before moving to the next task
3. **MANDATORY**: Update the plan file to mark completed tasks `[x]`
4. **MANDATORY after EVERY task completion**: Update the changes file by appending to Added, Modified, or Removed sections with relative file paths and one-sentence summary of what was implemented
5. Continue to the next unchecked task

**Continue until:**
- All tasks in the plan are marked complete `[x]`
- All specified files have been created or updated with working code
- All success criteria from the plan have been verified

### 5. Reference Gathering Guidelines

**When gathering external references:**
- Focus on practical implementation examples over theoretical documentation
- Validate that external sources contain actual usable patterns
- Adapt external patterns to match workspace conventions and standards

**When implementing from references:**
- Follow workspace patterns and conventions first, external patterns second
- Implement complete, working functionality rather than just examples
- Ensure all dependencies and configurations are properly integrated
- Ensure implementations work within the existing project structure

### 6. Completion and Documentation

**Implementation is complete when:**
- All plan tasks are marked complete `[x]`
- All specified files exist with working code
- All success criteria from the plan are verified
- No implementation errors remain

**Final step - update changes file with release summary:**
- Add Release Summary section only after ALL phases are marked complete `[x]`
- Document complete file inventory and overall implementation summary for release documentation

### 7. Problem Resolution

**When encountering implementation issues:**
- Document the specific problem clearly
- Try alternative approaches or search terms
- Use workspace patterns as fallback when external references fail
- Continue with available information rather than stopping completely
- Note any unresolved issues in the plan file for future reference

## Implementation Workflow

```
1. Read and fully understand plan file and all checklists completely
2. Read and fully understand changes file completely (re-read entire file if missing context)
3. For each unchecked task:
   a. Read entire details section for that task from details markdown file
   b. Fully understand all implementation requirements
   c. Implement task with working code following workspace patterns
   d. Validate implementation meets task requirements
   e. Mark task complete [x] in plan file
   f. Update changes file with Added, Modified, or Removed entries
   g. Call out any divergences from plan/details within relevant sections with specific reasons
4. Repeat until all tasks complete
5. Only after ALL phases are complete [x]: Add final Release Summary to changes file
```

## Success Criteria

Implementation is complete when:
- ✅ All plan tasks are marked complete `[x]`
- ✅ All specified files contain working code
- ✅ Code follows workspace patterns and conventions
- ✅ All functionality works as expected within the project
- ✅ Changes file is updated after every task completion with Added, Modified, or Removed entries
- ✅ Changes file documents all phases with detailed release-ready documentation and final release summary

## Template Changes File

Use the following as a template for the changes file that tracks implementation progress for releases.
Replace `{{ }}` with appropriate values. Create this file in `./.copilot-tracking/changes/` with filename: `YYYYMMDD-task-description-changes.md`

**IMPORTANT**: Update this file after EVERY task completion by appending to Added, Modified, or Removed sections.
**MANDATORY**: Always include the following at the top of the changes file: `<!-- markdownlint-disable-file -->`

<!-- <changes-template> -->
```markdown
<!-- markdownlint-disable-file -->
# Release Changes: {{task name}}

**Related Plan**: {{plan-file-name}}
**Implementation Date**: {{YYYY-MM-DD}}

## Summary

{{Brief description of the overall changes made for this release}}

## Changes

### Added

- {{relative-file-path}} - {{one sentence summary of what was implemented}}

### Modified

- {{relative-file-path}} - {{one sentence summary of what was changed}}

### Removed

- {{relative-file-path}} - {{one sentence summary of what was removed}}

## Release Summary

**Total Files Affected**: {{number}}

### Files Created ({{count}})

- {{file-path}} - {{purpose}}

### Files Modified ({{count}})

- {{file-path}} - {{changes-made}}

### Files Removed ({{count}})

- {{file-path}} - {{reason}}

### Dependencies & Infrastructure

- **New Dependencies**: {{list-of-new-dependencies}}
- **Updated Dependencies**: {{list-of-updated-dependencies}}
- **Infrastructure Changes**: {{infrastructure-updates}}
- **Configuration Updates**: {{configuration-changes}}

### Deployment Notes

{{Any specific deployment considerations or steps}}
```
<!-- </changes-template> -->
