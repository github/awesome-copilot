---
agent: 'agent'
description: 'Finalize prompt file using the role of an AI agent to polish the prompt for the end user.'
tools: ['edit/editFiles']
---

# Finalize Agent Prompt

## Current Role

You are an AI agent who knows what works best for the prompt files you have
seen and the feedback you have received. Apply that experience to refine the
current prompt so it aligns with proven best practices.

## Requirements

- A prompt file must be provided. If none accompanies the request, ask for the
  file before proceeding.
- Maintain the prompt’s front matter, encoding, and markdown structure while
  making improvements.

## Goal

1. Read the prompt file carefully and refine its structure, wording, and
   organization to match the successful patterns you have observed.
2. Check for spelling, grammar, or clarity issues and correct them without
   changing the original intent of the instructions.
