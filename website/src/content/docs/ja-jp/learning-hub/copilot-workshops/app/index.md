---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[**GitHub Copilot app**](https://docs.github.com/copilot/concepts/agents/github-copilot-app) は Copilot CLI を基盤とするデスクトップアプリケーションで、エージェント主導の開発を単一の作業用ワークスペースで実現します。並列エージェントセッション、切り替え可能なセッションモード、共有キャンバス、GitHub Issue と pull request のネイティブ管理機能を備えています。さらに、リベース、レビューのフィードバック、CI の修正、マージまで pull request を導く **Agent Merge** も利用できます。

一連のレッスンでは、アプリをインストールしてプロジェクトを設定した後、アプリのワークスペースと、テンプレートによって用意されたバックログを確認します。まず、星評価を追加する小さな変更に取り組みます。次に、Issue に基づいてカスタム指示の標準を追加し、分離されたエージェントセッションでフィルター機能を構築して、再利用可能なスキルで検証します。Playwright MCP server を追加して実際のブラウザーで機能を確認した後、段階的にマージの自動化を進め、最後は **Agent Merge** で pull request をマージします。最後に、共有キャンバスで共同作業し、繰り返し発生する作業を自動化します。アイデアから機能のマージまで、開発の一連の流れを体験できます。

## レッスン

| レッスン | トピック | 説明 |
|--------|-------|-------------|
| [0. 前提条件][ex0] | セットアップ | Node.js をインストールし、Tailspin Toys プロジェクトの自分用コピーを作成します |
| [1. Copilot app のインストール][ex1] | セットアップ | アプリをインストールしてプロジェクトを接続し、ワークスペースを確認します |
| [2. 最初のエージェントセッションの実行][ex2] | 最初の変更 | セッションを開始し、最初の pull request として小さな変更をリリースします |
| [3. カスタム指示による Copilot のガイド][ex3] | コンテキスト | Issue に基づいてドキュメント標準を追加し、マージします |
| [4. Autopilot による機能の構築][ex4] | コア機能 | Plan と Autopilot を使ってフィルター機能を構築し、スキルで検証します |
| [5. Playwright MCP によるテスト][ex5] | 外部ツール | Playwright MCP server を追加し、ブラウザーで機能を確認します |
| [6. Agent Merge によるマージ][ex6] | マージ | Agent Merge でフィルター機能の pull request を修正してマージします |
| [7. キャンバスを使った計画][ex7] | コラボレーション | 共有キャンバスを作成し、作業の計画と追跡に使用します |
| [8. 振り返りと次のステップ][ex8] | まとめ | 繰り返し発生するタスクを自動化し、次に学ぶ内容を確認します |

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
[ex3]: /ja-jp/learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /ja-jp/learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /ja-jp/learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /ja-jp/learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /ja-jp/learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /ja-jp/learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students