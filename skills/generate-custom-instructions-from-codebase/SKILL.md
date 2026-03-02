---
name: generate-custom-instructions-from-codebase
description: 'Migration and code evolution instructions generator for GitHub Copilot. Analyzes differences between two project versions (branches, commits, or releases) to create precise instructions allowing Copilot to maintain consistency during technology migrations, major refactoring, or framework version upgrades.'
---

# Migration and Code Evolution Instructions Generator

## Configuration Variables

```
${MIGRATION_TYPE="Framework Version|Architecture Refactoring|Technology Migration|Dependencies Update|Pattern Changes"}
<!-- Type of migration or evolution -->

${SOURCE_REFERENCE="branch|commit|tag"}
<!-- Source reference point (before state) -->

${TARGET_REFERENCE="branch|commit|tag"}  
<!-- Target reference point (after state) -->

${ANALYSIS_SCOPE="Entire project|Specific folder|Modified files only"}
<!-- Scope of analysis -->

${CHANGE_FOCUS="Breaking Changes|New Conventions|Obsolete Patterns|API Changes|Configuration"}
<!-- Main aspect of changes -->

${AUTOMATION_LEVEL="Conservative|Balanced|Aggressive"}
<!-- Level of automation for Copilot suggestions -->

${GENERATE_EXAMPLES="true|false"}
<!-- Include transformation examples -->

${VALIDATION_REQUIRED="true|false"}
<!-- Require validation before application -->
```

## Generated Prompt

```
"Analyze code evolution between two project states to generate precise migration instructions for GitHub Copilot. These instructions will guide Copilot to automatically apply the same transformation patterns during future modifications. Follow this methodology:

### Phase 1: Comparative State Analysis

#### Structural Changes Detection
- Compare folder structure between ${SOURCE_REFERENCE} and ${TARGET_REFERENCE}
- Identify moved, renamed, or deleted files
- Analyze changes in configuration files
- Document new dependencies and removed ones

#### Code Transformation Analysis
${MIGRATION_TYPE == "Framework Version" ? 
  "- Identify API changes between framework versions
   - Analyze new features being used
   - Document obsolete methods/properties
   - Note syntax or convention changes" : ""}

${MIGRATION_TYPE == "Architecture Refactoring" ? 
  "- Analyze architectural pattern changes
   - Identify new abstractions introduced
   - Document responsibility reorganization
   - Note changes in data flows" : ""}

${MIGRATION_TYPE == "Technology Migration" ? 
  "- Analyze replacement of one technology with another
   - Identify functional equivalences
   - Document API and syntax changes
   - Note new dependencies and configurations" : ""}

#### Transformation Pattern Extraction
- Identify repetitive transformations applied
- Analyze conversion rules from old to new format
- Document exceptions and special cases
- Create before/after correspondence matrix

### Phase 2: Migration Instructions Generation

Create a `.github/copilot-migration-instructions.md` file with this structure:

\`\`\`markdown
# GitHub Copilot Migration Instructions

## Migration Context
- **Type**: ${MIGRATION_TYPE}
- **From**: ${SOURCE_REFERENCE} 
- **To**: ${TARGET_REFERENCE}
- **Date**: [GENERATION_DATE]
- **Scope**: ${ANALYSIS_SCOPE}

## Automatic Transformation Rules

### 1. Mandatory Transformations
${AUTOMATION_LEVEL != "Conservative" ? 
  "[AUTOMATIC_TRANSFORMATION_RULES]
   - **Old Pattern**: [OLD_CODE]
   - **New Pattern**: [NEW_CODE]
   - **Trigger**: When to detect this pattern
   - **Action**: Transformation to apply automatically" : ""}

### 2. Transformations with Validation
${VALIDATION_REQUIRED == "true" ? 
  "[TRANSFORMATIONS_WITH_VALIDATION]
   - **Detected Pattern**: [DESCRIPTION]
   - **Suggested Transformation**: [NEW_APPROACH]
   - **Required Validation**: [VALIDATION_CRITERIA]
   - **Alternatives**: [ALTERNATIVE_OPTIONS]" : ""}

### 3. API Correspondences
${CHANGE_FOCUS == "API Changes" || MIGRATION_TYPE == "Framework Version" ? 
  "[API_CORRESPONDENCE_TABLE]
   | Old API   | New API   | Notes     | Example        |
   | --------- | --------- | --------- | -------------- |
   | [OLD_API] | [NEW_API] | [CHANGES] | [CODE_EXAMPLE] | " : ""} |

### 4. New Patterns to Adopt
[DETECTED_EMERGING_PATTERNS]
- **Pattern**: [PATTERN_NAME]
- **Usage**: [WHEN_TO_USE] 
- **Implementation**: [HOW_TO_IMPLEMENT]
- **Benefits**: [ADVANTAGES]

### 5. Obsolete Patterns to Avoid
[DETECTED_OBSOLETE_PATTERNS]
- **Obsolete Pattern**: [OLD_PATTERN]
- **Why Avoid**: [REASONS]
- **Alternative**: [NEW_PATTERN]
- **Migration**: [CONVERSION_STEPS]

## File Type Specific Instructions

${GENERATE_EXAMPLES == "true" ? 
  "### Configuration Files
   [CONFIG_TRANSFORMATION_EXAMPLES]
   
   ### Main Source Files
   [SOURCE_TRANSFORMATION_EXAMPLES]
   
   ### Test Files
   [TEST_TRANSFORMATION_EXAMPLES]" : ""}

## Validation and Security

### Automatic Control Points
- Verifications to perform after each transformation
- Tests to run to validate changes
- Performance metrics to monitor
- Compatibility checks to perform

### Manual Escalation
Situations requiring human intervention:
- [COMPLEX_CASES_LIST]
- [ARCHITECTURAL_DECISIONS]
- [BUSINESS_IMPACTS]

## Migration Monitoring

### Tracking Metrics
- Percentage of code automatically migrated
- Number of manual validations required
- Error rate of automatic transformations
- Average migration time per file

### Error Reporting
How to report incorrect transformations to Copilot:
- Feedback patterns to improve rules
- Exceptions to document
- Adjustments to make to instructions

\`\`\`

### Phase 3: Contextual Examples Generation

${GENERATE_EXAMPLES == "true" ? 
  "#### Transformation Examples
   For each identified pattern, generate:
   
   \`\`\`
   // BEFORE (${SOURCE_REFERENCE})
   [OLD_CODE_EXAMPLE]
   
   // AFTER (${TARGET_REFERENCE}) 
   [NEW_CODE_EXAMPLE]
   
   // COPILOT INSTRUCTIONS
   When you see this pattern [TRIGGER], transform it to [NEW_PATTERN] following these steps: [STEPS]
   \`\`\`" : ""}

### Phase 4: Validation and Optimization

#### Instructions Testing
- Apply instructions on test code
- Verify transformation consistency
- Adjust rules based on results
- Document exceptions and edge cases

#### Iterative Optimization  
${AUTOMATION_LEVEL == "Aggressive" ? 
  "- Refine rules to maximize automation
   - Reduce false positives in detection
   - Improve transformation accuracy
   - Document lessons learned" : ""}

### Final Result

Migration instructions that enable GitHub Copilot to:
1. **Automatically apply** the same transformations during future modifications
2. **Maintain consistency** with newly adopted conventions  
3. **Avoid obsolete patterns** by automatically proposing alternatives
4. **Accelerate future migrations** by capitalizing on acquired experience
5. **Reduce errors** by automating repetitive transformations

These instructions transform Copilot into an intelligent migration assistant, capable of reproducing your technology evolution decisions consistently and reliably.
"
```

## Typical Use Cases

### Framework Version Migration
Perfect for documenting the transition from Angular 14 to Angular 17, React Class Components to Hooks, or .NET Framework to .NET Core. Automatically identifies breaking changes and generates corresponding transformation rules.

### Technology Stack Evolution  
Essential when replacing a technology entirely: jQuery to React, REST to GraphQL, SQL to NoSQL. Creates a comprehensive migration guide with pattern mappings.

### Architecture Refactoring
Ideal for large refactorings like Monolith to Microservices, MVC to Clean Architecture, or Component to Composable architecture. Preserves architectural knowledge for future similar transformations.

### Design Pattern Modernization
Useful for adopting new patterns: Repository Pattern, Dependency Injection, Observer to Reactive Programming. Documents the rationale and implementation differences.

## Unique Benefits

### 🧠 **Artificial Intelligence Enhancement**
Unlike traditional migration documentation, these instructions "train" GitHub Copilot to reproduce your technology evolution decisions automatically during future code modifications.

### 🔄 **Knowledge Capitalization**  
Transforms specific project experience into reusable rules, avoiding the loss of migration expertise and accelerating future similar transformations.

### 🎯 **Context-Aware Precision**
Instead of generic advice, generates instructions tailored to your specific codebase, with real before/after examples from your project evolution.

### ⚡ **Automated Consistency**
Ensures that new code additions automatically follow the new conventions, preventing architectural regression and maintaining code evolution coherence.
