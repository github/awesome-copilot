---
name: discover
description: Deep analysis of a domain's AI readiness. Checks AI Discovery, robots.txt, security.txt, sitemap, meta tags, and structured data to produce a comprehensive readiness assessment.
argument-hint: domain to analyze (e.g., example.com)
---

# Deep AI Discovery Analysis

Perform a comprehensive AI readiness assessment of a domain.

## Instructions

1. **Get the domain** from `$ARGUMENTS` or ask the user
2. **Fetch all discovery endpoints** (attempt each, don't fail on 404):
   - `https://{domain}/.well-known/ai`
   - `https://{domain}/robots.txt`
   - `https://{domain}/.well-known/security.txt`
   - `https://{domain}/sitemap.xml`
   - `https://{domain}/` (home page — check meta tags)

3. **Analyze each layer**:

   **AI Discovery (/.well-known/ai)**
   - Present? Valid JSON? Spec version?
   - Organization identity complete?
   - Knowledge and feed endpoints linked?
   - Policies declared?
   - Content hashes or signatures?

   **Crawling (robots.txt)**
   - AI-specific user-agent rules?
   - Overly restrictive vs. permissive?
   - Consistency with AI Discovery policies?

   **Security (security.txt)**
   - Present? Contact info?
   - Relevant to AI interaction trust?

   **Content Structure (sitemap.xml)**
   - Present? How many URLs?
   - Content types and organization?

   **HTML Meta (home page)**
   - `<meta>` tags for description, keywords?
   - Open Graph / Twitter Card data?
   - JSON-LD structured data?
   - `<link rel="ai-discovery">` header?

4. **Score and report**:

```
## AI Readiness Report: {domain}

### Discovery Layer
{Findings for /.well-known/ai}

### Crawling Layer
{Findings for robots.txt}

### Security Layer
{Findings for security.txt}

### Content Structure
{Findings for sitemap.xml}

### HTML Meta
{Findings for structured data, meta tags}

### Overall Assessment
- AI Readiness: {High / Medium / Low / None}
- Strongest signal: {what they do well}
- Biggest gap: {what's missing}
- Recommendation: {1-2 actionable suggestions}
```

5. **If low readiness**, offer: "Want me to help create AI Discovery for this domain? Use `/rootz-ai-discovery:create`."
