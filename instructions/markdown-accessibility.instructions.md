---
description: 'Markdown accessibility guidelines based on GitHub''s 5 best practices for inclusive documentation'
applyTo: '**/*.md'
---

# Markdown Accessibility Review Guidelines

When reviewing markdown files, check for the following accessibility issues based on GitHub's [5 tips for making your GitHub profile page accessible](https://github.blog/developer-skills/github/5-tips-for-making-your-github-profile-page-accessible/). Flag violations and suggest fixes with clear explanations of the accessibility impact.

## 1. Descriptive Links

- Flag generic link text such as "click here," "here," "this," "read more," or "link."
- Link text must make sense when read out of context, because assistive technology can present links as an isolated list.
- Flag multiple links on the same page that share identical text but point to different destinations.
- Bare URLs in prose should be converted to descriptive links.

Bad: `Read my blog post [here](https://example.com)`
Good: `Read my blog post "[Crafting an accessible resume](https://example.com)"`

## 2. Image Alt Text

- Flag images with empty alt text (e.g., `![](path/to/image.png)`) unless they are explicitly decorative.
- Flag alt text that is a filename (e.g., `img_1234.jpg`) or generic placeholder (e.g., `screenshot`, `image`).
- Alt text should be succinct and descriptive. Include any text visible in the image.
- Use "screenshot of" where relevant, but do not prefix with "image of" since screen readers announce that automatically.
- For complex images (charts, infographics), suggest summarizing the data in alt text and providing longer descriptions via `<details>` tags or linked content.
- When suggesting alt text improvements, present them as recommendations for the author to review. Alt text requires understanding of visual content and context that only the author can properly assess.

## 3. Heading Hierarchy

- There must be only one H1 (`#`) per document, used as the page title. Note: in projects where H1 is auto-generated from front matter, start content at H2.
- Headings must follow a logical hierarchy and never skip levels (e.g., `##` followed by `####` is a violation).
- Flag bold text (`**text**`) used as a visual substitute for a proper heading.
- Proper heading structure allows assistive technology users to navigate by section and helps sighted users scan content.

## 4. Plain Language

- Flag unnecessarily complex or jargon-heavy language that could be simplified.
- Favor short sentences, common words, and active voice.
- Flag long, dense paragraphs that could be broken into smaller sections or lists.
- When suggesting plain language improvements, present them as recommendations for the author to review. Language decisions require understanding of audience, context, and tone.

## 5. Lists and Emoji Usage

### Lists

- Flag emoji or special characters used as bullet points instead of proper markdown list syntax (`-`, `*`, `+`, or `1.`).
- Flag sequential items in plain text that should be structured as a proper list.
- Proper list markup allows screen readers to announce list context (e.g., "item 1 of 3").

### Emoji

- Flag multiple consecutive emoji, which are disruptive to screen reader users since each emoji name is read aloud in full (e.g., "rocket" "sparkles" "fire").
- Flag emoji used to convey meaning that is not also communicated in text.
- Emoji should be used sparingly and thoughtfully.

## Review Priority

When multiple issues exist, prioritize in this order:

1. Missing or empty alt text on images
2. Skipped heading levels or heading hierarchy issues
3. Non-descriptive link text
4. Emoji used as bullet points or list markers
5. Plain language improvements

## Review Tone

- Explain the accessibility impact of each issue, specifying which users are affected (e.g., screen reader users, people with cognitive disabilities, non-native speakers).
- Do not remove personality or voice from the writing. Accessibility and engaging content are not mutually exclusive.
- Keep suggestions actionable and specific.