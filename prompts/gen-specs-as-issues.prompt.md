---
description: 'This workflow guides you through a systematic approach to identify missing features, prioritize them, and create detailed specifications for implementation.'
agent: 'agent'
---

# Product Manager Assistant: Feature Identification and Specification

This workflow guides you through a systematic approach to identify missing features, prioritize them, and create detailed specifications for implementation.

## 1. Project Understanding Phase

- Review the project structure to understand its organization
- Read the README.md and other documentation files to understand the project's core functionality
- Identify the existing implementation status by examining:
  - Main entry points (CLI, API, UI, etc.)
  - Core modules and their functionality
  - Tests to understand expected behavior
  - Any placeholder implementations

**Guiding Questions:**
- What is the primary purpose of this project?
- What user problems does it solve?
- What patterns exist in the current implementation?
- Which features are mentioned in documentation but not fully implemented?

## 2. Gap Analysis Phase

- Compare the documented capabilities ONLY against the actual implementation
- Identify "placeholder" code that lacks real functionality
- Look for features mentioned in documentation but missing robust implementation
- Consider the user journey and identify broken or missing steps
- Focus on core functionality first (not nice-to-have features)

**Output Creation:**
- Create a list of potential missing features (5-7 items)
- For each feature, note:
  - Current implementation status
  - References in documentation
  - Impact on user experience if missing

## 3. Prioritization Phase

- Apply a score to each identified gap:

**Scoring Matrix (1-5 scale):**
- User Impact: How many users benefit?
- Strategic Alignment: Fits core mission?
- Implementation Feasibility: Technical complexity?
- Resource Requirements: Development effort needed?
- Risk Level: Potential negative impacts?

**Priority = (User Impact × Strategic Alignment) / (Implementation Effort × Risk Level)**

**Output Creation:**
- Present the top 3 highest-priority missing features based on the scoring
- For each, provide:
  - Feature name
  - Current status
  - Impact if not implemented
  - Dependencies on other features

## 4. Specification Development Phase

- For each prioritized feature, develop a detailed but practical specification:
  - Begin with the philosophical approach: simplicity over complexity
  - Focus on MVP functionality first
  - Consider the developer experience
  - Keep the specification implementation-friendly

**For Each Feature Specification:**
1. **Overview & Scope**
   - What problem does it solve?
   - What's included and what's explicitly excluded?

2. **Technical Requirements**
   - Core functionality needed
   - User-facing interfaces (API, UI, CLI, etc.)
   - Integration points with existing code

3. **Implementation Plan**
   - Key modules/files to create or modify
   - Simple code examples showing the approach
   - Clear data structures and interfaces

4. **Acceptance Criteria**
   - How will we know when it's done?
   - What specific functionality must work?
   - What tests should pass?

## 5. GitHub Issue Creation Phase

- For each specification, create a GitHub issue:
  - Clear, descriptive title
  - Comprehensive specification in the body
  - Appropriate labels (enhancement, high-priority, etc.)
  - Explicitly mention MVP philosophy where relevant

**Issue Template Structure:**

# [Feature Name]

## Overview
[Brief description of the feature and its purpose]

## Scope
[What's included and what's explicitly excluded]

## Technical Requirements
[Specific technical needs and constraints]

## Implementation Plan
[Step-by-step approach with simple code examples]

## Acceptance Criteria
[Clear list of requirements to consider the feature complete]

## Priority
[Justification for prioritization]

## Dependencies
- **Blocks:** [List of issues blocked by this one]
- **Blocked by:** [List of issues this one depends on]

## Implementation Size
- **Estimated effort:** [Small/Medium/Large]
- **Sub-issues:** [Links to sub-issues if this is a parent issue]


## 5.5 Work Distribution Optimization

- **Independence Analysis**
  - Review each specification to identify truly independent components
  - Refactor specifications to maximize independent work streams
  - Create clear boundaries between interdependent components

- **Dependency Mapping**
  - For features with unavoidable dependencies, establish clear issue hierarchies
  - Create parent issues for the overall feature with sub-issues for components
  - Explicitly document "blocked by" and "blocks" relationships

- **Workload Balancing**
  - Break down large specifications into smaller, manageable sub-issues
  - Ensure each sub-issue represents 1-3 days of development work
  - Include sub-issue specific acceptance criteria

**Implementation Guidelines:**
- Use GitHub issue linking syntax to create explicit relationships
- Add labels to indicate dependency status (e.g., "blocked", "prerequisite")
- Include estimated complexity/effort for each issue to aid sprint planning

## 6. Final Review Phase

- Summarize all created specifications
- Highlight implementation dependencies between features
- Suggest a logical implementation order
- Note any potential challenges or considerations

Remember throughout this process:
- Favor simplicity over complexity
- Start with minimal viable implementations that work
- Focus on developer experience
- Build a foundation that can be extended later
- Consider the open-source community and contribution model

This workflow embodiment of our approach should help maintain consistency in how features are specified and prioritized, ensuring that software projects evolve in a thoughtful, user-centered way.
