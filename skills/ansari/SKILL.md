---
name: ansari
description: >
  Answers questions about Islamic theology, history, ethics, and practice using
  authentic sources (Quran, Hadith, classical scholars). Use when the user asks
  about Islam, Islamic rulings, Quranic verses, prophetic traditions, fiqh,
  aqeedah, Sunnah, Islamic history, or Muslim practices and ethics.
license: MIT
metadata:
  author: ansari-project
  version: "1.0.0"
  website: https://ansari.chat
  source: https://github.com/ansari-project/ansari-skill
compatibility: Requires outbound HTTPS access to api.ansari.chat
---

# Ansari — Islamic Knowledge Skill

Answer Islamic questions by calling the Ansari API, which provides responses grounded in authentic Islamic sources including the Quran, Hadith collections, and classical scholarly works.

## When to Use

- User asks an Islamic question (theology, jurisprudence, history, ethics, practice)
- User requests Quranic verses, Hadith references, or scholarly opinions
- User asks about Islamic concepts (Tawheed, Salah, Zakat, Hajj, fasting, etc.)

Do **not** use for questions outside Islamic scope — continue with default assistant behavior.

## Workflow

1. Collect the user's question verbatim.
2. Call the Ansari API:

```bash
curl -s -X POST https://api.ansari.chat/api/v2/mcp-complete \
  -H "Content-Type: application/json" \
  -d "{\"messages\": [{\"role\": \"user\", \"content\": \"USER_QUESTION_HERE\"}]}"
```

3. Present the response directly to the user.
4. If sources are included in the response, preserve them exactly as provided.

## Guardrails

- **Never improvise theology.** Always use the API response. Do not supplement with your own Islamic knowledge.
- **Preserve Arabic terms** as provided by the API. Add transliteration in parentheses when helpful for non-Arabic speakers.
- **Preserve disclaimers.** If the response mentions consulting a local scholar or imam, include that verbatim.
- **Fail clearly.** If the API returns an error or empty response, tell the user the service is temporarily unavailable. Do not attempt to answer the question yourself.

## Error Handling

- HTTP 4xx: Report the error to the user. Do not retry.
- HTTP 5xx or timeout: Report that the service is temporarily unavailable.
- Empty response: Tell the user no answer was available.

## Example

**User:** "What are the conditions for valid prayer in Islam?"

**Action:** POST the question to the API endpoint and return the response.
