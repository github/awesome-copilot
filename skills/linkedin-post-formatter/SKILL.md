---
name: linkedin-post-formatter
description: 'Format and draft compelling LinkedIn posts using Unicode bold/italic styling, visual separators, structured sections, and engagement-optimized patterns. USE FOR: draft LinkedIn post, format text for LinkedIn, create social media post, write thought leadership post, convert content to LinkedIn format, LinkedIn carousel text, Unicode bold italic formatting.'
---

# LinkedIn Post Formatter

Transform raw content, ideas, or technical material into polished, engagement-optimized LinkedIn posts using Unicode typography and proven structural patterns.

## Overview

LinkedIn only supports plain text — no Markdown rendering, no rich formatting. This skill uses Unicode Mathematical Alphanumeric Symbols to simulate bold, italic, and bold-italic text that renders natively in the LinkedIn editor without any external tools.

## Unicode Typography Reference

When converting plain text into Unicode-styled LinkedIn text, first load and use `references/unicode-charmap.md` as the authoritative character mapping reference.

Apply these character mappings to create visual emphasis in plain text:

### Bold (Mathematical Sans-Serif Bold)

Use bold for key phrases, section headers, and emphasis words.

| Plain | Unicode Bold |
|-------|-------------|
| A-Z   | 𝗔-𝗭         |
| a-z   | 𝗮-𝘇         |
| 0-9   | 𝟬-𝟵         |

### Italic (Mathematical Sans-Serif Italic)

Use italic for subtle emphasis, technical terms, or quotes.

| Plain | Unicode Italic |
|-------|---------------|
| A-Z   | 𝘈-𝘡           |
| a-z   | 𝘢-𝘻           |

### Bold-Italic (Mathematical Sans-Serif Bold Italic)

Use sparingly for maximum emphasis.

| Plain | Unicode Bold-Italic |
|-------|-------------------|
| A-Z   | 𝘼-𝙕               |
| a-z   | 𝙖-𝙯               |

## Visual Separators

Use these characters to create visual structure:

- **Section divider**: `━━━━━━━━━━━━━━━━━━━━━━` (box-drawing heavy horizontal)
- **Bullet points**: `◈` (diamond with dot) or `◎` (bullseye)
- **Arrow flow**: `↓` for vertical flow, `→` for horizontal continuation
- **Sub-points**: `↳` for indented sub-items
- **Numbered items**: Use bold Unicode digits `𝟭. 𝟮. 𝟯.` etc.

## Post Structure Patterns

### Pattern 1: Hook → Content → CTA (General Purpose)

```
[Bold hook line — provocative statement or question]

[1-2 lines of context setting the stage]

━━━━━━━━━━━━━━━━━━━━━━

[Main content with bold section headers]
[Bullet points using ◈ or numbered with bold digits]

━━━━━━━━━━━━━━━━━━━━━━

[Bold takeaway or summary]

[Call to action — repost, comment, or grab resource]

#Hashtags
```

### Pattern 2: Listicle (Numbered Insights)

```
[Bold opening line with a strong claim]

[Setup line explaining what follows]

𝟭. [Bold item title]
   [Supporting detail]

𝟮. [Bold item title]
   [Supporting detail]

...

𝗧𝗵𝗲 𝗸𝗲𝘆 𝘁𝗮𝗸𝗲𝗮𝘄𝗮𝘆: [Summary in italic]

#Hashtags
```

### Pattern 3: Story → Lesson (Thought Leadership)

```
[Italic opening with a personal or observed moment]

[2-3 short paragraphs telling the story]

━━━━━━━━━━━━━━━━━━━━━━

𝗧𝗵𝗲 𝗹𝗲𝘀𝘀𝗼𝗻:

[Bold lesson or principle extracted from the story]

[CTA]

#Hashtags
```

### Pattern 4: Resource Share (Cheatsheet/Guide/Tool)

```
[Hook: "If you do X, you cannot miss this..."]

[Brief description of what the resource covers]

━━━━━━━━━━━━━━━━━━━━━━

[Bold section count]. [Bold section titles as numbered list]

━━━━━━━━━━━━━━━━━━━━━━

𝗧𝗵𝗲 𝗿𝗲𝗮𝗹 𝘁𝗮𝗸𝗲𝗮𝘄𝗮𝘆:

[Why this resource matters — bold key phrase]

[Grab it / Share it CTA]

♻️ 𝗥𝗲𝗽𝗼𝘀𝘁 if this is useful to your network.

#Hashtags
```

## Formatting Rules

1. **Line breaks matter**: LinkedIn collapses multiple blank lines. Use single blank lines between paragraphs.
2. **Hook above the fold**: The first 2-3 lines must compel the reader to click "see more." Front-load value.
3. **Short paragraphs**: 1-3 sentences max per paragraph. Wall of text kills engagement.
4. **Bold sparingly**: Bold key phrases and headers, not entire paragraphs.
5. **Italic for nuance**: Use italic for technical terms, internal thoughts, or subtle emphasis.
6. **Hashtags at the end**: 5-8 relevant hashtags on the last line. No mid-post hashtags.
7. **No emojis in body** unless the user explicitly requests them. Exception: one strategic emoji in CTA (♻️ for repost).
8. **Character limit**: LinkedIn posts can be up to 3000 characters. Aim for 1500-2500 for optimal engagement.
9. **No URLs in body**: LinkedIn suppresses reach for posts with links. Add links in comments instead. Mention "link in comments" or "grab it below" as CTA.

## Engagement Optimization

- **Opening hooks that work**: Questions, bold claims, "If you do X...", contrarian takes, surprising stats.
- **Closing CTAs that work**: "♻️ 𝗥𝗲𝗽𝗼𝘀𝘁 if...", "Save this for later", "Tag someone who needs this", "What's your take? 👇"
- **Whitespace is your friend**: Dense text gets scrolled past. Airy, scannable layout wins.
- **The "see more" hook**: LinkedIn truncates posts after ~210 characters on desktop. Make sure the first 2 lines create enough curiosity to click.

## Process

1. Analyze the source content (text, HTML, image, or idea).
2. Identify the best post structure pattern (Hook→Content→CTA, Listicle, Story→Lesson, Resource Share).
3. Extract the core message and 3-5 key points.
4. Apply Unicode bold/italic formatting to headers and emphasis words using `references/unicode-charmap.md`.
5. Add visual separators between sections.
6. Write a compelling hook for the opening.
7. Add a CTA and hashtags at the end.
8. Verify the post is copy-paste ready for LinkedIn.
