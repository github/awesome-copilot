# Publishing Skills

How to publish and share your skills.

## Skill Format

```markdown
---
name: skill-name
description: What this skill does
triggers:
  - trigger phrase 1
  - trigger phrase 2
---

# Skill Title

Content...
```

## Publishing to GitHub

### 1. Create Repository

```bash
git init skills-repo
cd skills-repo
mkdir -p skills/your-skill-name
```

### 2. Structure

```
skills-repo/
├── SKILL.md
└── skills/
    └── your-skill/
        ├── SKILL.md
        └── references/
            └── guide.md
```

### 3. Commit and Push

```bash
git add .
git commit -m "Add your-skill skill"
git remote add origin https://github.com/username/skills-repo.git
git push -u origin main
```

## Using Published Skills

### In Claude Code / Hermes

```
skill_view(name="your-skill-name")
```

### From GitHub

```
Load skill from Luckycat133/skills-repo/your-skill
```

## Best Practices

1. **Clear triggers**: Include common phrases users might say
2. **Step-by-step**: Use numbered lists for procedures
3. **Code examples**: Provide working code snippets
4. **Verification**: Include commands to test the setup
5. **Update regularly**: Keep content current

## Categories

Organize skills by category:
- `devops/` - Infrastructure, CI/CD
- `frontend/` - UI, React, CSS
- `backend/` - APIs, databases
- `migration/` - Tool migrations
- `general/` - Generic helpers
