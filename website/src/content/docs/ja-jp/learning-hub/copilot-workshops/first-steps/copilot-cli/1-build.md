---
title: "レッスン 1 - ターミナルからのクイズの構築"
description: "詳細なリクエストを 1 回送って Space Quiz 全体を Copilot CLI に作成してもらい、その後、範囲を絞った改善を 1 つ加えます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

詳細なリクエストを 1 回送ってプロジェクト全体の作成を依頼し、承認する前にエージェントの提案をレビューします。その後、小さく範囲を限定した変更を 1 つ加えます。

このレッスンでは、次の内容を学習します。

- 依存関係のないクイズを `index.html` に構築する。
- セッションからブラウザーでクイズを開く。
- 範囲を絞った変更を 1 つ加え、確認する。

## クイズの構築

Copilot CLI のセッションで、次のプロンプトを送信します。

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with an emoji reaction at the end. Single index.html, no server or dependencies. Accessible, keyboard-navigable, and respects prefers-color-scheme.
```

1. 提案された計画を読み、ファイルの変更を承認します。
2. ブラウザーで `index.html` を開き、数問に回答します。セッションから起動するには、macOS では `!open index.html`、Windows では `!start index.html`、Linux では `!xdg-open index.html` を実行します。

## 小さな変更を加えて確認する

範囲を限定したリクエストがどのように処理されるかを確認するため、改善を 1 つに絞って依頼します。

```plaintext
The results screen feels flat. Give it a stronger sense of arrival: animate the score counting up and make the emoji reaction larger. Change nothing else.
```

1. ブラウザーでページを再読み込みし、最後まで回答します。
2. まだ何も Git に記録されていないため、差分の比較対象がないことを確認します。プロジェクトを公開した後は、比較できるようになります。

## まとめと次のステップ

クイズを構築し、範囲を限定したリクエストで改善しました。[レッスン 2: プロジェクトの指示の記録][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
