# Issue Scout Interview

Ask these six questions in order, in a single message when the AI CLI supports
batched prompts. Skip any question the user already answered in their request.

## Question 1: Experience Level

```
What's your experience level with this repository?
- [ ] First-time contributor
- [ ] Some familiarity
- [ ] Experienced with the codebase
```

## Question 2: Technical Skills

```
What languages/frameworks are you comfortable with?
(Select all that apply)
- [ ] JavaScript/TypeScript
- [ ] Python
- [ ] Rust
- [ ] Go
- [ ] Java/Kotlin
- [ ] C/C++
- [ ] Ruby
- [ ] Other: ___
```

## Question 3: Time Availability

```
How much time can you dedicate?
- [ ] Quick fix (< 2 hours)
- [ ] Weekend project (4-8 hours)
- [ ] Week-long (20-40 hours)
- [ ] Longer contribution (40+ hours)
```

## Question 4: Contribution Type

```
What type of contribution are you looking for?
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Tests
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Any suitable issue
```

## Question 5: Difficulty Preference

```
What difficulty level do you prefer?
- [ ] Beginner-friendly (good first issue)
- [ ] Intermediate
- [ ] Advanced
- [ ] Any difficulty
```

## Question 6: Special Requirements

```
Any special requirements?
- [ ] No active PRs (unclaimed work only)
- [ ] Must have reproduction case
- [ ] Must have clear acceptance criteria
- [ ] Avoid compiler/core subsystem
- [ ] Other: ___
```

## Internal Specification

Parse the answers into this structure before moving to Phase 2:

```
Experience: [level]
Languages: [list]
Scope: [time estimate]
Type: [contribution type]
Difficulty: [level]
Special: [requirements]
```

Treat "No active PRs (unclaimed work only)" as two hard filters: the issue must
be unassigned and must have no open linked pull request. If that box is not
selected, keep assigned and claimed issues eligible and score them as evidence.

## Prioritization Hints

Use the user's answers to choose weights in `scoring-rubric.md`:

- **First-time contributor** → "first contribution" weights, prioritizing
  Difficulty Fit, Contribution Feasibility, and Issue Quality.
- **Weekend project** → "weekend project" weights, prioritizing Scope Fit,
  Difficulty Fit, and Contribution Feasibility.
- **Portfolio contribution** → "portfolio contribution" weights, prioritizing
  Technical Fit, Issue Quality, and Contribution Feasibility.
- Otherwise use the default weights.

Record any assumption made about an implicit constraint so the final output can
distinguish evidence from inference.
