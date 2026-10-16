---
title: Mermaid delivery sample
---

This synthetic example contains no project or customer data.

## Approval flow

The document owner submits a draft. A reviewer either approves it or requests changes.

```mermaid
flowchart LR
    Draft[Draft] --> Review{Approved?}
    Review -->|Yes| Publish[Publish]
    Review -->|No| Revise[Revise]
    Revise --> Draft
```

## Japanese labels

```mermaid
flowchart LR
    Input[入力] --> Check{確認済み?}
    Check -->|はい| Output[出力]
    Check -->|いいえ| Return[差戻し]
```

## Tall diagram

This diagram exercises scaling and the explicit page-break rule.

```mermaid
flowchart TD
    Receive[Receive request] --> Validate[Validate input]
    Validate --> Read[Read Markdown]
    Read --> Parse[Parse blocks]
    Parse --> Render[Render SVG]
    Render --> Fallback[Render PNG fallback]
    Fallback --> Package[Package document]
    Package --> Inspect[Inspect package]
    Inspect --> Preview[Preview in Word]
    Preview --> Deliver[Deliver document]
```

## Ordinary content

| Item | Expected result |
| ---- | --------------- |
| SVG  | SVG retained    |
| PNG  | PNG retained    |
| Text | Both languages  |

- Keep the Markdown source.
- Check the document in Word.

> Vector output is not an editable Office flowchart.
