---
title: "レッスン 9 - 開発の流れを信頼できたら作業を委任する"
description: "Space Quiz の新機能を /delegate に任せ、実行中も作業を続けながら、CLI からクラウドセッションの進行を確認します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

機能を 1 つ公開しました。望ましい成果物がどのようなものかを把握できたので、まったく新しいアイデアは、逐一見守りながら進めるよりも、自分の作業と並行して進めてもらう価値があります。このレッスンでは、**共有できるミッションレポート**の作成を委任します。クイズの結果を、プレイヤーが投稿できるカードにする機能です。

このレッスンでは、次の内容を学習します。

- `/delegate` で新機能の作成を委任する。
- 委任した作業の実行中も、メインのセッションで作業を続ける。
- 委任した作業の結果を受け入れる前に比較する。

> [!NOTE]
> `/delegate` とクラウドセッションには、対象となる有料の Copilot プランが必要です。Business と Enterprise では、管理者によるアクセスの有効化も必要な場合があります。

## 新機能の作成を委任する

`/delegate` を実行し、次のタスクを渡します。

```plaintext
Delegate this: add a shareable mission report to the space quiz. At the end of a run, generate a compact summary card with the score, a rank title based on the percentage, and the slowest question. Add a Copy result button that puts a short plain-text version on the clipboard. Keep it in the single index.html with no dependencies, keep it keyboard accessible, and report back with what changed.
```

1. 委任したタスクの実行中も、メインのセッションで作業を続けます。
2. 委任した作業の結果を受け入れる前に、自分のセッションの内容と比較します。
3. より大規模で要件が明確な Issue については、**クラウドセッション**を開始し、CLI から進行を確認します。

## まとめと次のステップ

機能全体の作成を委任し、結果をレビューしました。[レッスン 10: 振り返りと次のステップ][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
