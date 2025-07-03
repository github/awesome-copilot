---
mode: "agent"
description: "Add new language to a NextJS with next-intl application"
---

This is a guide to add a new language to a Next.js project using next-intl for internationalization, following steps from https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing.

- For i18n, the application uses next-intl.
- All translations are in the directory `./messages`.
- The UI component is `src/components/language-toggle.tsx`.
- Routing and middleware configuration are handled in:
  - `src/i18n/routing.ts`
  - `src/middleware.ts`

When adding a new language:

- Translate all the content of `en.json` to the new language. The goal is to have all the JSON entries in the new language for a complete translation.
- Add the path in `routing.ts` and `middleware.ts`.
- Add the language to `language-toggle.tsx`.
