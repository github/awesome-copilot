---
title: "レッスン 4 - Issue の並行作業"
description: "バックログを作成し、サイドパネルから Issue をチャットに追加して /diff で変更をレビューし、専用の worktree で 2 つ目のセッションを開始します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

バックログと実装の流れをターミナルで管理し、独立した作業には別々のセッションを開きます。

このレッスンでは、次の内容を学習します。

- 範囲を絞った GitHub Issue を 3 つ作成する。
- サイドパネルから Issue をチャットに追加して実装する。
- `/diff` で変更をレビューする。
- 分離された worktree で 2 つ目のセッションを開始する。

## バックログを作成する

次のプロンプトを送信します。

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## このセッションで最初の Issue に取り組む

1. <kbd>Left arrow</kbd> キーを押してサイドパネルを開き、<kbd>Tab</kbd> を押して **Issues** タブに移動します。
2. 最初の Issue を選択状態にして <kbd>c</kbd> を押し、コンテキストとしてチャットに追加します。先に Issue 全文を読むには、代わりに <kbd>Enter</kbd> を押します。
3. エージェントに Issue の実装を依頼します。

![ターミナルに表示された Copilot CLI のサイドパネルの図。Current、Sessions、Issues、Pull requests、Gists のタブのうち Issues が選択されています。space-quiz リポジトリの未解決 Issue の検索フィルターに、Add a score screen at the end of the quiz という Issue が 1 件表示されています。Left arrow でパネルを開き、Tab でタブを移動するというヒントがあり、下部には検索用のスラッシュ、詳細表示の Enter、開くための o、worktree の w、チャットの c、すべてを表示する a が並んでいます。](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

サイドパネルの上部にはすべてのタブが並び、下部のヒントには現在選択されている項目に対して操作するキーが表示されます。

## `/diff` で変更をレビューする

プロジェクトを公開したので、動作を確認済みのバージョンと比較できます。`/diff` は、そのバージョンに対してこの Issue で何が変わったかを正確に表示します。これが、そのまま他の人にレビューを依頼する内容になります。

1. `/diff` を実行し、変更されたすべてのファイルを読みます。
2. 問題がある箇所の修正を依頼し、再び `/diff` を実行します。
3. Git を直接確認したいときは、いつでも `!git status` または `!git diff` を実行します。

## 2 つ目の Issue に並行して取り組む

1. もう一度サイドパネルを開き、**Sessions** タブに切り替えます。
2. 最初のセッションを残したまま、2 つ目の Issue 用の別のセッションを開始します。
3. 新しいセッションで `/worktree` を実行し、現在の場所でブランチを切り替えるのではなく、分離された worktree を使用するようにします。これで、両方のセッションを互いに干渉せず同時に実行できます。
4. <kbd>c</kbd> で 2 つ目の Issue をそのセッションに追加します。
5. ひとまずその状態でセッションを置いておきます。次のレッスンでは、コードを書く前にこの Issue の計画を立てます。

![Copilot CLI で /worktree を実行した後の出力の図。issue-13-review-screen ブランチで worktree ../space-quiz-13 を作成し、main を変更せずにこのセッションがそこで作業するようになったことを示しています。](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree` は、専用のブランチとチェックアウトにセッションを移すため、最初のセッションは影響を受けずに作業を続けられます。

## まとめと次のステップ

最初の Issue を実装して `/diff` でレビューし、専用の worktree で 2 つ目のセッションを開始しました。[レッスン 5: 編集前の計画][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
