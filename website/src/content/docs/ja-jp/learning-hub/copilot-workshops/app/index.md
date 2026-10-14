---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

[**GitHub Copilot app**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) は Copilot CLI を基盤とするデスクトップアプリケーションで、エージェント主導の開発を単一の作業用ワークスペースで実現します。並列エージェントセッション、切り替え可能なセッションモード、共有キャンバス、GitHub Issue と pull request のネイティブ管理機能を備えています。さらに、リベース、レビューのフィードバック、継続的インテグレーション (CI) の修正、マージまで pull request を導く **Agent Merge** も利用できます。

このワークショップでは、Tailspin Toys の1つの連続したワークフローに取り組みます。

1. プロジェクトを準備し、アプリをインストールしてリポジトリを接続し、ワークスペースと用意されたバックログを確認します。
2. 星評価に対象を絞った変更を加えてブラウザーでレビューし、最初の pull request (PR) を手動でマージします。
3. フィルター機能の Issue から開始し、**Plan** モードでアプローチを定義して、**Autopilot** モードで構築した後、**Interactive** モードでレビューします。
4. リポジトリの指示を更新し、フィルター機能の作業に適用します。
5. 既存の `quality-checks` スキルをカスタマイズし、プロジェクトのチェックに使用します。
6. Playwright Model Context Protocol (MCP) server を追加し、ブラウザーでフィルター機能を確認します。
7. 品質保証 (QA) カスタムエージェントを作成し、要件、カバレッジ、検証の証拠をレビューします。
8. フィルター機能の変更全体をレビューし、2つ目の PR に Agent Merge を使用します。
9. 既存の Database Explorer キャンバスを使用してから、リポジトリに保存するトリアージキャンバスを作成してテストします。

ワークショップの焦点を絞るため、作成する PR は2つです。1つ目は星評価、2つ目はフィルター機能と、指示・スキル・QA プロファイル・テストの更新です。それぞれ更新済みの `main` から開始します。フィルター機能と品質に関するワークフローでは1つのセッション、worktree、ブランチを共有するため、各ツールを確認しながら、それまでの作業を活用できます。最後のキャンバス演習はそのセッション内に保持し、PR ワークフローを繰り返すのではなく、共有サーフェスの作成とテストに集中します。

## レッスン

| レッスン | トピック | 説明 |
|--------|-------|-------------|
| [0. 前提条件][ex0] | セットアップ | Node.js をインストールし、Tailspin Toys プロジェクトの自分用コピーを作成します |
| [1. Copilot app のインストール][ex1] | セットアップ | アプリをインストールしてプロジェクトを接続し、ワークスペースを確認します |
| [2. 星評価の追加で小さな成果を得る][ex2] | 最初の変更 | 既存の評価と null の場合の表示を追加し、PR 1 をマージします |
| [3. エージェントモード: Plan と Autopilot][ex3] | エージェントモード | Issue から機能を計画し、Autopilot で構築して、Interactive モードでレビューします |
| [4. カスタム指示による Copilot のガイド][ex4] | コンテキスト | 指示を確認して更新し、フィルター機能に適用します |
| [5. quality-checks スキルのカスタマイズと使用][ex5] | 繰り返し実行できるチェック | 既存のスキルを確認し、報告形式を変更して実行します |
| [6. Playwright MCP による機能の検証][ex6] | ブラウザーでの観察 | Customize から MCP を設定し、フィルターの動作を確認します |
| [7. QA エージェントの作成と使用][ex7] | 要件とカバレッジ | 専門家のプロファイルを作成して選択し、最終検証の証拠を収集します |
| [8. 機能の PR の作成とマージ][ex8] | レビューとマージ | フィルター機能、指示、スキル、QA プロファイル、テストをレビューし、2つ目の PR に Agent Merge を使用します |
| [9. キャンバスの確認と作成][ex9] | コラボレーション | Database Explorer を使用してから、リポジトリに保存するトリアージキャンバスを作成してテストします |
| [10. 振り返りと次のステップ][ex10] | まとめ | ワークフロー、成果物、追加のリソースを振り返ります |

## 前提条件

このワークショップに参加する前に、次のものを用意してください。

- [ ] 有効な **Copilot Student、Pro、Pro+、Business、Enterprise** のいずれかのプランが設定された GitHub アカウント
- [ ] **macOS、Linux、Windows** のいずれかを実行するコンピューター
- [ ] コンピューターに[インストールされた Git][install-git]

> [!TIP]
> 有料プランを利用していない場合、認証済みの学生は [GitHub Education][callout-student-plan-education] を通じて GitHub Copilot を無料で利用できます。**Copilot Student** プランには、このワークショップで使用するエージェント、MCP、コードレビュー、Copilot CLI の各機能が含まれているため、すべてのハーネスを完了できます。

> [!NOTE]
> Copilot app は codespace ではなく自分のコンピューターで実行するため、[レッスン 0][ex0] では、アプリをインストールする前に Node.js をインストールし、プロジェクトの自分用コピーを作成します。

> [!NOTE]
> Copilot Business または Copilot Enterprise を使用している場合、アプリを使用するには管理者が **Copilot CLI** ポリシーを有効にする必要があります。

## はじめる

[**レッスン 0「前提条件」から始める →**][ex0]

[ex0]: /ja-jp/learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /ja-jp/learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /ja-jp/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /ja-jp/learning-hub/copilot-workshops/app/3-agent-modes/
[ex4]: /ja-jp/learning-hub/copilot-workshops/app/4-custom-instructions/
[ex5]: /ja-jp/learning-hub/copilot-workshops/app/5-agent-skills/
[ex6]: /ja-jp/learning-hub/copilot-workshops/app/6-mcp-playwright/
[ex7]: /ja-jp/learning-hub/copilot-workshops/app/7-qa-agent/
[ex8]: /ja-jp/learning-hub/copilot-workshops/app/8-create-pull-request/
[ex9]: /ja-jp/learning-hub/copilot-workshops/app/9-canvases/
[ex10]: /ja-jp/learning-hub/copilot-workshops/app/10-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students