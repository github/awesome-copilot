# Skill Image Gen

Generate images using AI directly from your coding workflow. Supports **OpenAI (gpt-image-2)** and **Google Gemini (Nano Banana)**.

## What it does

Use natural language to generate images — icons, sprites, textures, mockups, artwork — without leaving your editor. The skill handles API calls, file saving, and guides you through setup on first use.

## Providers

| Provider | Model | Strengths |
|---|---|---|
| OpenAI | gpt-image-2 | High quality, excellent text rendering |
| Google Gemini | gemini-2.0-flash-exp | Fast, free tier available |

## Setup

BYO API key. On first use, the skill walks you through:

1. Choosing a provider
2. Getting an API key ([OpenAI](https://platform.openai.com/api-keys) · [Gemini](https://aistudio.google.com/apikey))
3. Setting the environment variable (`SKILL_IMAGE_GEN_OPENAI_KEY` or `SKILL_IMAGE_GEN_GEMINI_KEY`)

## Usage

Ask Copilot to generate an image:

- "Generate a pixel art treasure chest"
- "Create a seamless grass texture for my game"
- "Make a minimalist logo for my app"

## Links

- **Source repo**: [adamd9/skill-image-gen](https://github.com/adamd9/skill-image-gen)
- **License**: MIT
