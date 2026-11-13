# Investigation and Planning Templates

Use these templates after the ranked shortlist. Keep the same evidence rules:
mark what was verified, what is inferred, and what still needs investigation.

## Investigation Mode

**Trigger:** User says "Investigate #[NUMBER]".

**Action:** Provide a detailed contribution brief.

**Output format:**
```
🔍 ISSUE #[NUMBER] — DEEP INVESTIGATION

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PROBLEM
[Clear description of the issue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 WHY IT MATCHES
• [Match point 1]
• [Match point 2]
• [Match point 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 RELEVANT CODE
• src/path/file1.ts: [What it does]
• src/path/file2.ts: [What it does]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 RELEVANT TESTS
• tests/path/test1.ts: [What it tests]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 RELATED
• PR #[NUMBER]: [Description]
• Commit [HASH]: [Description]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 IMPLEMENTATION SCOPE
1. [Step 1]
2. [Step 2]
3. [Step 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ POTENTIAL DIFFICULTIES
• [Difficulty 1]
• [Difficulty 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍💻 MAINTAINER EXPECTATIONS
[If known]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ ESTIMATED EFFORT: [X-Y] hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 RECOMMENDED FIRST STEPS
1. [Step 1]
2. [Step 2]
3. [Step 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIDENCE: [HIGH/MEDIUM/LOW]
[Reason for confidence level]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Want me to create an implementation plan?
   Say: "Plan this issue"
```

## Implementation Planning

**Trigger:** User says "Plan this issue" or "How should I approach this?".

**Action:** Provide a step-by-step implementation plan.

**Output format:**
```
📋 IMPLEMENTATION PLAN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 PROBLEM ANALYSIS
[What needs to be fixed/implemented]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ VERIFIED FACTS
• [Fact from code inspection]
• [Fact from tests]
• [Fact from documentation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔮 LIKELY IMPLEMENTATION
• [Probable approach]
• [Expected file locations]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❓ NEEDS INVESTIGATION
• [Uncertain aspect]
• [Potential edge cases]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 STEP-BY-STEP PLAN

Step 1: [First step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

Step 2: [Second step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

Step 3: [Third step]
├─ Why: [Rationale]
├─ Files: [Specific files]
└─ Time: [Estimate]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FILES TO MODIFY
• src/path/file1.ts: [What to change]
• src/path/file2.ts: [What to change]
• tests/path/test.ts: [What tests to add]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 TESTING APPROACH
1. [How to verify the fix]
2. [Edge cases to test]
3. [Regression prevention]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ POTENTIAL CHALLENGES
• [Challenge 1]: [Mitigation]
• [Challenge 2]: [Mitigation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ TIME ESTIMATE
• Implementation: [X] hours
• Testing: [Y] hours
• Total: [X+Y] hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CONFIDENCE: [HIGH/MEDIUM/LOW]
[Brief explanation]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to start? Say: "Start working on this"
```
