---
title: "レッスン 7 - Issue の計画と実装"
description: "GitHub のツールを使って Copilot Chat から Issue を作成し、新しいチャットセッションで 1 つ実装します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

GitHub MCP を有効にすると、Copilot はチャットから直接 Issue を作成し、読むことができます。

このレッスンでは、次の内容を学習します。

- Copilot Chat から、範囲を絞った GitHub Issue を 3 つ作成する。
- 1 つの Issue 用に新しいチャットセッションを開始する。
- Issue を実装して確認する。

## Issue を作成する

次のプロンプトを送信します。

```plaintext
Review the space quiz and suggest three focused feature ideas. Use the GitHub tools to create a separate issue for each with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

## 1 つの Issue を実装する

1. アクティビティバーの **GitHub** ビューを開き、新しい Issue を確認します。
2. Issue を 1 つ選び、Copilot Chat の **+** ボタンを選択して、その Issue 用の新しいセッションを開始します。
3. Agent モードで Issue を実装します。元のセッションは比較用に残しておきます。
4. プルリクエストを作成する前に、[レッスン 3][lesson-3] の統合ブラウザーでのスモークテストを実行します。

## まとめと次のステップ

Issue を作成し、専用のセッションで 1 つ実装しました。[レッスン 8: レビューとマージ][next-lesson]に進みます。

[lesson-3]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/8-review-and-merge/
