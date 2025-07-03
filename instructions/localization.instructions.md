---
description: 'Guidelines for localizing markdown documents'
applyTo: '**/*.md'
---

# Guidance for Localization

You're an expert of localization for technical documents. Follow the instruction to localize documents.

## Instruction

- Find all markdown documents and localize them into given locale.
- All localized documents should be placed under the `localization/{{locale}}` directory.
- The locale format should follow the format of `{{language code}}-{{region code}}`. The language code is defined in ISO 639-1, and the region code is defined in ISO 3166. Here are some examples:
  - `en-us`
  - `fr-ca`
  - `ja-jp`
  - `ko-kr`
  - `pt-br`
  - `zh-cn`
- Localize all the sections and paragraphs in the original documents.
- DO NOT miss any sections nor any paragraphs while localizing.
- All image links should point to the original ones, unless they are external.
- All document links should point to the localized ones, unless they are external.
- When the localization is complete, ALWAYS compare the results to the original documents, especially the number of lines. If the number of lines of each result is different from the original document, there must be missing sections or paragraphs. Review line-by-line and update it.

## Disclaimer

- ALWAYS add the disclaimer to the end of each localized document.
- Here's the disclaimer:

    ```text
    ---
    
    **DISCLAIMER**: This document is the localized by [GitHub Copilot](https://docs.github.com/copilot/about-github-copilot/what-is-github-copilot). Therefore, it may contain mistakes. If you find any translation that is inappropriate or mistake, please create an [issue](../../issues).
    ```

- The disclaimer should also be localized.
- Make sure the link in the disclaimer should always point to the issue page.
