---
title: "レッスン 11 - Canvas を試す"
description: "Repository Issues Kanban Canvas をインストールし、Issue カードからセッションを開始します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

**Canvas** は、ユーザーとエージェントが同じ計画、ボード、チェックリスト、ダッシュボードを更新できる、共有された双方向の作業領域です。リポジトリの Issue を視覚的なワークフローにする Kanban Canvas を試します。

このレッスンでは、次の内容を学習します。

- Canvas 拡張機能をインストールする。
- Canvas を Space Quiz リポジトリに接続する。
- Issue を作業中の状態に移す。
- Issue から作成されたセッションを確認する。

## Repository Issues Kanban Canvas をインストールする

1. [Canvas 拡張機能ギャラリー][canvas-gallery]を確認します。
2. [Repository Issues Kanban 拡張機能][kanban-extension]を開きます。
3. **Install in GitHub Copilot app** を選択し、インストールを承認します。
4. アプリで **Customize**、**Canvas** の順に開きます。
5. 拡張機能がインストールされていることを確認します。

## Canvas から作業を開始する

1. Canvas の **New session** を選択します。
2. `space-quiz` プロジェクトを選びます。
3. Issue ボードを確認します。
4. Issue カードを作業中の列に移動します。
5. 自動的に生成されたセッションを開きます。
6. 選択した Issue がセッションのコンテキストとして利用できることを確認します。

![Backlog、Plan、Ready、Implement のレーンがある Repository Issues Kanban Canvas の図。Issue 13 の Review screen を Backlog から Plan レーンへドラッグしており、Issue 12 の Per-question timer は Backlog に残っています。](/images/learning-hub/copilot-workshops/first-steps-app-canvas-kanban.svg)

カードをレーンにドロップすると、Canvas はその Issue を、Issue がすでに読み込まれた新しいセッションに渡します。

> [!NOTE]
> 現在の Repository Issues Kanban 拡張機能では、ポインターを使ったドラッグアンドドロップでカードを移動します。この操作を使えない場合は、ボードの Issue 番号を控え、**Issues** からその Issue を開いて **New session** を選択します。カードを移動せずに、同じ Issue に基づくセッションを作成できます。

Canvas は、エージェントが Issue に基づいて作業する状態を保ちながら、作業を視覚的に選び、開始する方法を提供します。

## まとめと次のステップ

共有された視覚的な作業領域を使って、エージェントセッションを開始しました。[レッスン 12: 振り返りと次のステップ][next-lesson]に進みます。

[canvas-gallery]: https://awesome-copilot.github.com/extensions/
[kanban-extension]: https://awesome-copilot.github.com/extension/accessibility-kanban/
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/12-review/
