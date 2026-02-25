---
name: model-recommendation
description: 'Analyze chatmode or prompt files and recommend optimal AI models based on task complexity, required capabilities, and cost-efficiency'
---

# AI Model Recommendation for Copilot Chat Modes and Prompts

## Mission

Analyze `.agent.md` or `.prompt.md` files to understand their purpose, complexity, and required capabilities, then recommend the most suitable AI model(s) from GitHub Copilot's available options. Provide rationale based on task characteristics, model strengths, cost-efficiency, and performance trade-offs.

## Scope & Preconditions

- **Input**: Path to a `.agent.md` or `.prompt.md` file
- **Available Models**: GPT-4.1, GPT-5, GPT-5 mini, GPT-5 Codex, Claude Sonnet 3.5, Claude Sonnet 4, Claude Sonnet 4.5, Claude Opus 4.1, Gemini 2.5 Pro, Gemini 2.0 Flash, Grok Code Fast 1, o3, o4-mini (with deprecation dates)
- **Model Auto-Selection**: Available in VS Code (Sept 2025+) - selects from GPT-4.1, GPT-5 mini, GPT-5, Claude Sonnet 3.5, Claude Sonnet 4.5 (excludes premium multipliers > 1)
- **Context**: GitHub Copilot subscription tiers (Free: 2K completions + 50 chat/month with 0x models only; Pro: unlimited 0x + 1000 premium/month; Pro+: unlimited 0x + 5000 premium/month)

## Inputs

Required:

- `${input:filePath:Path to .agent.md or .prompt.md file}` - Absolute or workspace-relative path to the file to analyze

Optional:

- `${input:subscriptionTier:Pro}` - User's Copilot subscription tier (Free, Pro, Pro+) - defaults to Pro
- `${input:priorityFactor:Balanced}` - Optimization priority (Speed, Cost, Quality, Balanced) - defaults to Balanced

## Workflow

### 1. File Analysis Phase

**Read and Parse File**:

- Read the target `.agent.md` or `.prompt.md` file
- Extract frontmatter (description, mode, tools, model if specified)
- Analyze body content to identify:
  - Task complexity (simple/moderate/complex/advanced)
  - Required reasoning depth (basic/intermediate/advanced/expert)
  - Code generation needs (minimal/moderate/extensive)
  - Multi-turn conversation requirements
  - Context window needs (small/medium/large)
  - Specialized capabilities (image analysis, long-context, real-time data)

**Categorize Task Type**:

Identify the primary task category based on content analysis:

1. **Simple Repetitive Tasks**:

   - Pattern: Formatting, simple refactoring, adding comments/docstrings, basic CRUD
   - Characteristics: Straightforward logic, minimal context, fast execution preferred
   - Keywords: format, comment, simple, basic, add docstring, rename, move

2. **Code Generation & Implementation**:

   - Pattern: Writing functions/classes, implementing features, API endpoints, tests
   - Characteristics: Moderate complexity, domain knowledge, idiomatic code
   - Keywords: implement, create, generate, write, build, scaffold

3. **Complex Refactoring & Architecture**:

   - Pattern: System design, architectural review, large-scale refactoring, performance optimization
   - Characteristics: Deep reasoning, multiple components, trade-off analysis
   - Keywords: architect, refactor, optimize, design, scale, review architecture

4. **Debugging & Problem-Solving**:

   - Pattern: Bug fixing, error analysis, systematic troubleshooting, root cause analysis
   - Characteristics: Step-by-step reasoning, debugging context, verification needs
   - Keywords: debug, fix, troubleshoot, diagnose, error, investigate

5. **Planning & Research**:

   - Pattern: Feature planning, research, documentation analysis, ADR creation
   - Characteristics: Read-only, context gathering, decision-making support
   - Keywords: plan, research, analyze, investigate, document, assess

6. **Code Review & Quality Analysis**:

   - Pattern: Security analysis, performance review, best practices validation, compliance checking
   - Characteristics: Critical thinking, pattern recognition, domain expertise
   - Keywords: review, analyze, security, performance, compliance, validate

7. **Specialized Domain Tasks**:

   - Pattern: Django/framework-specific, accessibility (WCAG), testing (TDD), API design
   - Characteristics: Deep domain knowledge, framework conventions, standards compliance
   - Keywords: django, accessibility, wcag, rest, api, testing, tdd

8. **Advanced Reasoning & Multi-Step Workflows**:
   - Pattern: Algorithmic optimization, complex data transformations, multi-phase workflows
   - Characteristics: Advanced reasoning, mathematical/algorithmic thinking, sequential logic
   - Keywords: algorithm, optimize, transform, sequential, reasoning, calculate

**Extract Capability Requirements**:

Based on `tools` in frontmatter and body instructions:

- **Read-only tools** (search, fetch, usages, githubRepo): Lower complexity, faster models suitable
- **Write operations** (edit/editFiles, new): Moderate complexity, accuracy important
- **Execution tools** (runCommands, runTests, runTasks): Validation needs, iterative approach
- **Advanced tools** (context7/\*, sequential-thinking/\*): Complex reasoning, premium models beneficial
- **Multi-modal** (image analysis references): Requires vision-capable models

### 2. Model Evaluation Phase

**Apply Model Selection Criteria**:

For each available model, evaluate against these dimensions:

#### Model Capabilities Matrix

| Model                   | Multiplier | Speed    | Code Quality | Reasoning | Context | Vision | Best For                                          |
| ----------------------- | ---------- | -------- | ------------ | --------- | ------- | ------ | ------------------------------------------------- |
| GPT-4.1                 | 0x         | Fast     | Good         | Good      | 128K    | ✅     | Balanced general tasks, included in all plans     |
| GPT-5 mini              | 0x         | Fastest  | Good         | Basic     | 128K    | ❌     | Simple tasks, quick responses, cost-effective     |
| GPT-5                   | 1x         | Moderate | Excellent    | Advanced  | 128K    | ✅     | Complex code, advanced reasoning, multi-turn chat |
| GPT-5 Codex             | 1x         | Fast     | Excellent    | Good      | 128K    | ❌     | Code optimization, refactoring, algorithmic tasks |
| Claude Sonnet 3.5       | 1x         | Moderate | Excellent    | Excellent | 200K    | ✅     | Code generation, long context, balanced reasoning |
| Claude Sonnet 4         | 1x         | Moderate | Excellent    | Advanced  | 200K    | ❌     | Complex code, robust reasoning, enterprise tasks  |
| Claude Sonnet 4.5       | 1x         | Moderate | Excellent    | Expert    | 200K    | ✅     | Advanced code, architecture, design patterns      |
| Claude Opus 4.1         | 10x        | Slow     | Outstanding  | Expert    | 1M      | ✅     | Large codebases, architectural review, research   |
| Gemini 2.5 Pro          | 1x         | Moderate | Excellent    | Advanced  | 2M      | ✅     | Very long context, multi-modal, real-time data    |
| Gemini 2.0 Flash (dep.) | 0.25x      | Fastest  | Good         | Good      | 1M      | ❌     | Fast responses, cost-effective (deprecated)       |
| Grok Code Fast 1        | 0.25x      | Fastest  | Good         | Basic     | 128K    | ❌     | Speed-critical simple tasks, preview (free)       |
| o3 (deprecated)         | 1x         | Slow     | Good         | Expert    | 128K    | ❌     | Advanced reasoning, algorithmic optimization      |
| o4-mini (deprecated)    | 0.33x      | Fast     | Good         | Good      | 128K    | ❌     | Reasoning at lower cost (deprecated)              |

#### Selection Decision Tree

```
START
  │
  ├─ Task Complexity?
  │   ├─ Simple/Repetitive → GPT-5 mini, Grok Code Fast 1, GPT-4.1
  │   ├─ Moderate → GPT-4.1, Claude Sonnet 4, GPT-5
  │   └─ Complex/Advanced → Claude Sonnet 4.5, GPT-5, Gemini 2.5 Pro, Claude Opus 4.1
  │
  ├─ Reasoning Depth?
  │   ├─ Basic → GPT-5 mini, Grok Code Fast 1
  │   ├─ Intermediate → GPT-4.1, Claude Sonnet 4
  │   ├─ Advanced → GPT-5, Claude Sonnet 4.5
  │   └─ Expert → Claude Opus 4.1, o3 (deprecated)
  │
  ├─ Code-Specific?
  │   ├─ Yes → GPT-5 Codex, Claude Sonnet 4.5, GPT-5
  │   └─ No → GPT-5, Claude Sonnet 4
  │
  ├─ Context Size?
  │   ├─ Small (<50K tokens) → Any model
  │   ├─ Medium (50-200K) → Claude models, GPT-5, Gemini
  │   ├─ Large (200K-1M) → Gemini 2.5 Pro, Claude Opus 4.1
  │   └─ Very Large (>1M) → Gemini 2.5 Pro (2M), Claude Opus 4.1 (1M)
  │
  ├─ Vision Required?
  │   ├─ Yes → GPT-4.1, GPT-5, Claude Sonnet 3.5/4.5, Gemini 2.5 Pro, Claude Opus 4.1
  │   └─ No → All models
  │
  ├─ Cost Sensitivity? (based on subscriptionTier)
  │   ├─ Free Tier → 0x models only: GPT-4.1, GPT-5 mini, Grok Code Fast 1
  │   ├─ Pro (1000 premium/month) → Prioritize 0x, use 1x judiciously, avoid 10x
  │   └─ Pro+ (5000 premium/month) → 1x freely, 10x for critical tasks
  │
  └─ Priority Factor?
      ├─ Speed → GPT-5 mini, Grok Code Fast 1, Gemini 2.0 Flash
      ├─ Cost → 0x models (GPT-4.1, GPT-5 mini) or lower multipliers (0.25x, 0.33x)
      ├─ Quality → Claude Sonnet 4.5, GPT-5, Claude Opus 4.1
      └─ Balanced → GPT-4.1, Claude Sonnet 4, GPT-5
```

### 3. Recommendation Generation Phase

**Primary Recommendation**:

- Identify the single best model based on task analysis and decision tree
- Provide specific rationale tied to file content characteristics
- Explain multiplier cost implications for user's subscription tier

**Alternative Recommendations**:

- Suggest 1-2 alternative models with trade-off explanations
- Include scenarios where alternatives might be preferred
- Consider priority factor overrides (speed vs. quality vs. cost)

**Auto-Selection Guidance**:

- Assess if task is suitable for auto model selection (excludes premium models > 1x)
- Explain when manual selection is beneficial vs. letting Copilot choose
- Note any limitations of auto-selection for the specific task

**Deprecation Warnings**:

- Flag if file currently specifies a deprecated model (o3, o4-mini, Claude Sonnet 3.7, Gemini 2.0 Flash)
- Provide migration path to recommended replacement
- Include timeline for deprecation (e.g., "o3 deprecating 2025-10-23")

**Subscription Tier Considerations**:

- **Free Tier**: Recommend only 0x multiplier models (GPT-4.1, GPT-5 mini, Grok Code Fast 1)
- **Pro Tier**: Balance between 0x (unlimited) and 1x (1000/month) models
- **Pro+ Tier**: More freedom with 1x models (5000/month), justify 10x usage for exceptional cases

### 4. Integration Recommendations

**Frontmatter Update Guidance**:

If file does not specify a `model` field:

```markdown
## Recommendation: Add Model Specification

Current frontmatter:
\`\`\`yaml

---

description: "..."
tools: [...]

---

\`\`\`

Recommended frontmatter:
\`\`\`yaml

---

description: "..."
model: "[Recommended Model Name]"
tools: [...]

---

\`\`\`

Rationale: [Explanation of why this model is optimal for this task]
```

If file already specifies a model:

```markdown
## Current Model Assessment

Specified model: `[Current Model]` (Multiplier: [X]x)

Recommendation: [Keep current model | Consider switching to [Recommended Model]]

Rationale: [Explanation]
```

**Tool Alignment Check**:

Verify model capabilities align with specified tools:

- If tools include `context7/*` or `sequential-thinking/*`: Recommend advanced reasoning models (Claude Sonnet 4.5, GPT-5, Claude Opus 4.1)
- If tools include vision-related references: Ensure model supports images (flag if GPT-5 Codex, Claude Sonnet 4, or mini models selected)
- If tools are read-only (search, fetch): Suggest cost-effective models (GPT-5 mini, Grok Code Fast 1)

### 5. Context7 Integration for Up-to-Date Information

**Leverage Context7 for Model Documentation**:

When uncertainty exists about current model capabilities, use Context7 to fetch latest information:

```markdown
**Verification with Context7**:

Using `context7/get-library-docs` with library ID `/websites/github_en_copilot`:

- Query topic: "model capabilities [specific capability question]"
- Retrieve current model features, multipliers, deprecation status
- Cross-reference against analyzed file requirements
```

**Example Context7 Usage**:

```
If unsure whether Claude Sonnet 4.5 supports image analysis:
→ Use context7 with topic "Claude Sonnet 4.5 vision image capabilities"
→ Confirm feature support before recommending for multi-modal tasks
```

## Output Expectations

### Report Structure

Generate a structured markdown report with the following sections:

```markdown
# AI Model Recommendation Report

**File Analyzed**: `[file path]`
**File Type**: [chatmode | prompt]
**Analysis Date**: [YYYY-MM-DD]
**Subscription Tier**: [Free | Pro | Pro+]

---

## File Summary

**Description**: [from frontmatter]
**Mode**: [ask | edit | agent]
**Tools**: [tool list]
**Current Model**: [specified model or "Not specified"]

## Task Analysis

### Task Complexity

- **Level**: [Simple | Moderate | Complex | Advanced]
- **Reasoning Depth**: [Basic | Intermediate | Advanced | Expert]
- **Context Requirements**: [Small | Medium | Large | Very Large]
- **Code Generation**: [Minimal | Moderate | Extensive]
- **Multi-Modal**: [Yes | No]

### Task Category

[Primary category from 8 categories listed in Workflow Phase 1]

### Key Characteristics

- Characteristic 1: [explanation]
- Characteristic 2: [explanation]
- Characteristic 3: [explanation]

## Model Recommendation

### 🏆 Primary Recommendation: [Model Name]

**Multiplier**: [X]x ([cost implications for subscription tier])
**Strengths**:

- Strength 1: [specific to task]
- Strength 2: [specific to task]
- Strength 3: [specific to task]

**Rationale**:
[Detailed explanation connecting task characteristics to model capabilities]

**Cost Impact** (for [Subscription Tier]):

- Per request multiplier: [X]x
- Estimated usage: [rough estimate based on task frequency]
- [Additional cost context]

### 🔄 Alternative Options

#### Option 1: [Model Name]

- **Multiplier**: [X]x
- **When to Use**: [specific scenarios]
- **Trade-offs**: [compared to primary recommendation]

#### Option 2: [Model Name]

- **Multiplier**: [X]x
- **When to Use**: [specific scenarios]
- **Trade-offs**: [compared to primary recommendation]

### 📊 Model Comparison for This Task

| Criterion        | [Primary Model] | [Alternative 1] | [Alternative 2] |
| ---------------- | --------------- | --------------- | --------------- |
| Task Fit         | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐        | ⭐⭐⭐          |
| Code Quality     | [rating]        | [rating]        | [rating]        |
| Reasoning        | [rating]        | [rating]        | [rating]        |
| Speed            | [rating]        | [rating]        | [rating]        |
| Cost Efficiency  | [rating]        | [rating]        | [rating]        |
| Context Capacity | [capacity]      | [capacity]      | [capacity]      |
| Vision Support   | [Yes/No]        | [Yes/No]        | [Yes/No]        |

## Auto Model Selection Assessment

**Suitability**: [Recommended | Not Recommended | Situational]

[Explanation of whether auto-selection is appropriate for this task]

**Rationale**:

- [Reason 1]
- [Reason 2]

**Manual Override Scenarios**:

- [Scenario where user should manually select model]
- [Scenario where user should manually select model]

## Implementation Guidance

### Frontmatter Update

[Provide specific code block showing recommended frontmatter change]

### Model Selection in VS Code

**To Use Recommended Model**:

1. Open Copilot Chat
2. Click model dropdown (currently shows "[current model or Auto]")
3. Select **[Recommended Model Name]**
4. [Optional: When to switch back to Auto]

**Keyboard Shortcut**: `Cmd+Shift+P` → "Copilot: Change Model"

### Tool Alignment Verification

[Check results: Are specified tools compatible with recommended model?]

✅ **Compatible Tools**: [list]
⚠️ **Potential Limitations**: [list if any]

## Deprecation Notices

[If applicable, list any deprecated models in current configuration]

⚠️ **Deprecated Model in Use**: [Model Name] (Deprecation date: [YYYY-MM-DD])

**Migration Path**:

- **Current**: [Deprecated Model]
- **Replacement**: [Recommended Model]
- **Action Required**: Update `model:` field in frontmatter by [date]
- **Behavioral Changes**: [any expected differences]

## Context7 Verification

[If Context7 was used for verification]

**Queries Executed**:

- Topic: "[query topic]"
- Library: `/websites/github_en_copilot`
- Key Findings: [summary]

## Additional Considerations

### Subscription Tier Recommendations

[Specific advice based on Free/Pro/Pro+ tier]

### Priority Factor Adjustments

[If user specified Speed/Cost/Quality/Balanced, explain how recommendation aligns]

### Long-Term Model Strategy

[Advice for when to re-evaluate model selection as file evolves]

---

## Quick Reference

**TL;DR**: Use **[Primary Model]** for this task due to [one-sentence rationale]. Cost: [X]x multiplier.

**One-Line Update**:
\`\`\`yaml
model: "[Recommended Model Name]"
\`\`\`
```

### Output Quality Standards

- **Specific**: Tie all recommendations directly to file content, not generic advice
- **Actionable**: Provide exact frontmatter code, VS Code steps, clear migration paths
- **Contextualized**: Consider subscription tier, priority factor, deprecation timelines
- **Evidence-Based**: Reference model capabilities from Context7 documentation when available
- **Balanced**: Present trade-offs honestly (speed vs. quality vs. cost)
- **Up-to-Date**: Flag deprecated models, suggest current alternatives

## Quality Assurance

### Validation Steps

- [ ] File successfully read and parsed
- [ ] Frontmatter extracted correctly (or noted if missing)
- [ ] Task complexity accurately categorized (Simple/Moderate/Complex/Advanced)
- [ ] Primary task category identified from 8 options
- [ ] Model recommendation aligns with decision tree logic
- [ ] Multiplier cost explained for user's subscription tier
- [ ] Alternative models provided with clear trade-off explanations
- [ ] Auto-selection guidance included (recommended/not recommended/situational)
- [ ] Deprecated model warnings included if applicable
- [ ] Frontmatter update example provided (valid YAML)
- [ ] Tool alignment verified (model capabilities match specified tools)
- [ ] Context7 used when verification needed for latest model information
- [ ] Report includes all required sections (summary, analysis, recommendation, implementation)

### Success Criteria

- Recommendation is justified by specific file characteristics
- Cost impact is clear and appropriate for subscription tier
- Alternative models cover different priority factors (speed vs. quality vs. cost)
- Frontmatter update is ready to copy-paste (no placeholders)
- User can immediately act on recommendation (clear steps)
- Report is readable and scannable (good structure, tables, emoji markers)

### Failure Triggers

- File path is invalid or unreadable → Stop and request valid path
- File is not `.agent.md` or `.prompt.md` → Stop and clarify file type
- Cannot determine task complexity from content → Request more specific file or clarification
- Model recommendation contradicts documented capabilities → Use Context7 to verify current info
- Subscription tier is invalid (not Free/Pro/Pro+) → Default to Pro and note assumption

## Advanced Use Cases

### Analyzing Multiple Files

If user provides multiple files:

1. Analyze each file individually
2. Generate separate recommendations per file
3. Provide summary table comparing recommendations
4. Note any patterns (e.g., "All debug-related modes benefit from Claude Sonnet 4.5")

### Comparative Analysis

If user asks "Which model is better between X and Y for this file?":

1. Focus comparison on those two models only
2. Use side-by-side table format
3. Declare a winner with specific reasoning
4. Include cost comparison for subscription tier

### Migration Planning

If file specifies a deprecated model:

1. Prioritize migration guidance in report
2. Test current behavior expectations vs. replacement model capabilities
3. Provide phased migration if breaking changes expected
4. Include rollback plan if needed

## Examples

### Example 1: Simple Formatting Task

**File**: `format-code.prompt.md`
**Content**: "Format Python code with Black style, add type hints"
**Recommendation**: GPT-5 mini (0x multiplier, fastest, sufficient for repetitive formatting)
**Alternative**: Grok Code Fast 1 (0.25x, even faster, preview feature)
**Rationale**: Task is simple and repetitive; premium reasoning not needed; speed prioritized

### Example 2: Complex Architecture Review

**File**: `architect.agent.md`
**Content**: "Review system design for scalability, security, maintainability; analyze trade-offs; provide ADR-level recommendations"
**Recommendation**: Claude Sonnet 4.5 (1x multiplier, expert reasoning, excellent for architecture)
**Alternative**: Claude Opus 4.1 (10x, use for very large codebases >500K tokens)
**Rationale**: Requires deep reasoning, architectural expertise, design pattern knowledge; Sonnet 4.5 excels at this

### Example 3: Django Expert Mode

**File**: `django.agent.md`
**Content**: "Django 5.x expert with ORM optimization, async views, REST API design; uses context7 for up-to-date Django docs"
**Recommendation**: GPT-5 (1x multiplier, advanced reasoning, excellent code quality)
**Alternative**: Claude Sonnet 4.5 (1x, alternative perspective, strong with frameworks)
**Rationale**: Domain expertise + context7 integration benefits from advanced reasoning; 1x cost justified for expert mode

### Example 4: Free Tier User with Planning Mode

**File**: `plan.agent.md`
**Content**: "Research and planning mode with read-only tools (search, fetch, githubRepo)"
**Subscription**: Free (2K completions + 50 chat requests/month, 0x models only)
**Recommendation**: GPT-4.1 (0x, balanced, included in Free tier)
**Alternative**: GPT-5 mini (0x, faster but less context)
**Rationale**: Free tier restricted to 0x models; GPT-4.1 provides best balance of quality and context for planning tasks

## Knowledge Base

### Model Multiplier Cost Reference

| Multiplier | Meaning                                          | Free Tier | Pro Usage | Pro+ Usage |
| ---------- | ------------------------------------------------ | --------- | --------- | ---------- |
| 0x         | Included in all plans, no premium count          | ✅        | Unlimited | Unlimited  |
| 0.25x      | 4 requests = 1 premium request                   | ❌        | 4000 uses | 20000 uses |
| 0.33x      | 3 requests = 1 premium request                   | ❌        | 3000 uses | 15000 uses |
| 1x         | 1 request = 1 premium request                    | ❌        | 1000 uses | 5000 uses  |
| 1.25x      | 1 request = 1.25 premium requests                | ❌        | 800 uses  | 4000 uses  |
| 10x        | 1 request = 10 premium requests (very expensive) | ❌        | 100 uses  | 500 uses   |

### Model Changelog & Deprecations (October 2025)

**Deprecated Models** (Effective 2025-10-23):

- ❌ o3 (1x) → Replace with GPT-5 or Claude Sonnet 4.5 for reasoning
- ❌ o4-mini (0.33x) → Replace with GPT-5 mini (0x) for cost, GPT-5 (1x) for quality
- ❌ Claude Sonnet 3.7 (1x) → Replace with Claude Sonnet 4 or 4.5
- ❌ Claude Sonnet 3.7 Thinking (1.25x) → Replace with Claude Sonnet 4.5
- ❌ Gemini 2.0 Flash (0.25x) → Replace with Grok Code Fast 1 (0.25x) or GPT-5 mini (0x)

**Preview Models** (Subject to Change):

- 🧪 Claude Sonnet 4.5 (1x) - Preview status, may have API changes
- 🧪 Grok Code Fast 1 (0.25x) - Preview, free during preview period

**Stable Production Models**:

- ✅ GPT-4.1, GPT-5, GPT-5 mini, GPT-5 Codex (OpenAI)
- ✅ Claude Sonnet 3.5, Claude Sonnet 4, Claude Opus 4.1 (Anthropic)
- ✅ Gemini 2.5 Pro (Google)

### Auto Model Selection Behavior (Sept 2025+)

**Included in Auto Selection**:

- GPT-4.1 (0x)
- GPT-5 mini (0x)
- GPT-5 (1x)
- Claude Sonnet 3.5 (1x)
- Claude Sonnet 4.5 (1x)

**Excluded from Auto Selection**:

- Models with multiplier > 1 (Claude Opus 4.1, deprecated o3)
- Models blocked by admin policies
- Models unavailable in subscription plan (1x models in Free tier)

**When Auto Selects**:

- Copilot analyzes prompt complexity, context size, task type
- Chooses from eligible pool based on availability and rate limits
- Applies 10% multiplier discount on auto-selected models
- Shows selected model on hover over response in Chat view

## Context7 Query Templates

Use these query patterns when verification needed:

**Model Capabilities**:

```
Topic: "[Model Name] code generation quality capabilities"
Library: /websites/github_en_copilot
```

**Model Multipliers**:

```
Topic: "[Model Name] request multiplier cost billing"
Library: /websites/github_en_copilot
```

**Deprecation Status**:

```
Topic: "deprecated models October 2025 timeline"
Library: /websites/github_en_copilot
```

**Vision Support**:

```
Topic: "[Model Name] image vision multimodal support"
Library: /websites/github_en_copilot
```

**Auto Selection**:

```
Topic: "auto model selection behavior eligible models"
Library: /websites/github_en_copilot
```

---

**Last Updated**: 2025-10-28
**Model Data Current As Of**: October 2025
**Deprecation Deadline**: 2025-10-23 for o3, o4-mini, Claude Sonnet 3.7 variants, Gemini 2.0 Flash
