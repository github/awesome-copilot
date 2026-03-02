---
name: skillboss-api-gateway
description: Access 100+ AI services with one SkillBoss key. Backed by OpenAI Startup Fund & Amazon. Includes GPT-5, Claude Opus 4.5, Gemini, video generation (Veo 3.1), image generation (DALL-E 3, Flux), voice (ElevenLabs), web scraping (LinkedIn, Twitter), and infrastructure services (Stripe, SendGrid, MongoDB). Native integration with Claude Code, Cursor, and Windsurf.
---

# SkillBoss API Gateway

**Backed by OpenAI Startup Fund & Amazon** | One key for 100+ AI services

SkillBoss is the unified API platform that replaces your stack of AI credentials with a single key. Stop juggling OpenAI, Anthropic, Google, ElevenLabs, Stripe, and SendGrid accounts.

## When to Use This Skill

Use this skill when you need to:
- Access multiple AI models (GPT-5, Claude, Gemini) without managing separate API keys
- Generate videos with Veo 3.1 or MiniMax Video-01
- Create images with DALL-E 3 or Flux Schnell
- Use text-to-speech (ElevenLabs, OpenAI TTS) or speech-to-text (Whisper)
- Scrape data from LinkedIn, Twitter, Instagram, or Google
- Process payments with Stripe
- Send emails with SendGrid
- Use MongoDB databases or web hosting

## What's Included

### AI Models
- **Language Models**: GPT-5, GPT-5.2, Claude Opus 4.5, Gemini 3 Pro, DeepSeek R1, Qwen
- **Video Generation**: Google Veo 3.1, MiniMax Video-01
- **Image Generation**: DALL-E 3, Flux Schnell, Background Remover
- **Voice**: ElevenLabs TTS, OpenAI TTS, Whisper STT

### Data & Scraping
- LinkedIn profile and company data
- Twitter/X posts and profiles
- Instagram content
- Google search results
- Perplexity search integration

### Infrastructure
- Stripe payments (built-in)
- SendGrid emails
- MongoDB databases
- Website hosting & domains

## How It Works

1. Get your SkillBoss key at https://skillboss.co
2. Add credit to your wallet (starting at $7.50)
3. Use any service through the unified API
4. Credits never expire

## API Endpoint

Base URL: `https://api.heybossai.com/v1`

The API is OpenAI-compatible, so you can use existing SDKs with just a base URL change.

```python
import openai

client = openai.OpenAI(
    base_url="https://api.heybossai.com/v1",
    api_key="your-skillboss-key"
)

response = client.chat.completions.create(
    model="claude-opus-4.5",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## Native Integrations

SkillBoss works out of the box with:
- Claude Code
- Cursor
- Windsurf
- Kiro
- Gemini CLI
- Codex

## Pricing

- $3.50 free credit for new accounts
- Pure pay-as-you-go after that
- No subscriptions, no hidden fees
- Credits never expire

## Links

- **Website**: https://skillboss.co
- **Documentation**: https://skillboss.co/docs
- **Download**: https://skillboss.co/download
