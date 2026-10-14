---
title: "レッスン 7 - QA エージェントの作成と使用"
description: "テストのカバレッジ、quality-checks スキル、ブラウザーで直接得た証拠を組み合わせる、要件を起点とした QA プロファイルを作成します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

`quality-checks` スキルを使って自動チェックを実行し、Playwright MCP を使ってブラウザーでフィルター機能を確認しました。ここでは、明確に定義された QA プロセスを持つカスタムエージェントで、これらの機能を組み合わせます。

このレッスンでは、次の内容を学習します。

- カスタムエージェントが指示、スキル、MCP ツールと連携する仕組みを確認する。
- 再利用可能な品質保証 (QA) プロファイルを作成して確認する。
- QA エージェントを選択し、フィルター機能の Issue に照らして結果をレビューする。

## シナリオ

Tailspin Toys は、pull request (PR) を作成する前に、要件、コード品質、自動チェック、テストカバレッジ、ブラウザーでの動作を一貫してレビューしたいと考えています。カスタムエージェントは、その QA プロセスを調整し、再利用可能なレポートを提供できます。

## カスタムエージェントとは

カスタムエージェントは、Markdown プロファイルで定義された Copilot の特化バージョンです。プロファイルには、エージェントの目的、指示、利用可能なツールを記述します。このワークショップでは、`.github/agents/qa.agent.md` に QA の役割を定義し、アプリで選択します。

これまで作成したカスタマイズには、それぞれ異なる役割があります。リポジトリの指示はチームの規約を説明し、quality-checks スキルは繰り返し実行できるチェックをまとめます。Playwright MCP はブラウザーツールを提供します。QA プロファイルは、これらを使って要件を評価し、結果を報告する方法を Copilot に指示します。既存の機能を置き換えたり、別のエージェントセッションを要求したりするものではありません。

## QA プロファイルを作成する

機能の PR を開く前に、再利用可能な QA プロファイルを作成するよう Copilot に依頼します。このプロファイルには、QA が実行するチェックと、従う必要がある権限の境界の両方を定義します。

1. セッションが **Interactive** モードになっていることを確認します。
2. 次のプロンプトを Copilot に送信し、新しいカスタムエージェントを作成します。

    ```plaintext
    Create a custom agent named QA in .github/agents/qa.agent.md. It should check features against their issues and agreed requirements, follow the repository instructions, run the quality-checks skill, use Playwright MCP to verify behavior, and add tests when coverage is missing.

    Have it report each requirement as pass, fail, or blocked with supporting evidence. It must ask before changing implementation code, and it must not commit changes or open pull requests. Use the current model and available tools. Just create the profile for now so I can review it.
    ```

## プロファイルを確認する

新しいエージェントを使用する前にプロファイルをレビューし、Copilot が意図した QA ワークフローと権限の境界を反映していることを確認します。検証だけを求めているときに、不完全または範囲が広すぎるエージェントが機能を変更することを防げます。

1. **Changes** を開き、`.github/agents/qa.agent.md` を選択します。
2. フロントマターを読みます。`description` は必須です。`name` は任意ですが、含めるとエージェントに明確な表示名を付けられます。
3. プロファイルの指示を読み、QA が要件から開始し、リポジトリの指示に従い、`quality-checks` スキルを実行し、Playwright MCP を使用することを確認します。
4. QA が裏付けとなる証拠を報告し、実装コードを変更する前に確認し、変更をコミットしたり pull request を開いたりしないことを確認します。
5. 生成されたプロファイルにこれらの責任や境界が欠けている場合は、続行する前に通常の Copilot エージェントに修正を依頼します。

## Issue に対して QA を実行する

プロファイルをレビューしたら、現在のセッションで QA を選択します。これにより、QA はすでにコンテキストに含まれているフィルター機能の Issue と計画時の決定事項を使用できます。レビューを開始する前に、アクティブなエージェントを確認します。

1. 現在のセッションで、プロンプトボックスのエージェントピッカーを開きます。
2. **QA** を選択し、実行プロンプトを送る前に、アプリがアクティブなエージェントとして **QA** を明示していることを確認します。
3. 次のプロンプトを送信し、QA に機能のレビューを依頼します。

    ```plaintext
    Review the filtering feature against the issue and the decisions in our plan. Is it ready for a PR?
    ```

4. QA が正しい Issue と計画上の決定事項を使用していることを確認します。求められた場合は、Issue の URL や不足しているコンテキストを提供してください。
5. 作業が完了したら、提供されたレポートを確認します。

## まとめと次のステップ

再利用可能な専門家の役割をワークフローに追加し、その作業をレビューしました。このレッスンでは、次のことを行いました。

- カスタムエージェントが指示、スキル、MCP ツールと連携する仕組みを確認した。
- 要件から開始する再利用可能な QA プロファイルを作成して確認した。
- QA エージェントを選択し、フィルター機能の Issue に照らして結果をレビューした。

レビューに必要な実装、スキルの更新、QA プロファイル、テスト、検証レポートがそろいました。[レッスン 8 - 機能の PR を作成してマージする][next-lesson]で、これらをまとめて Agent Merge を使います。

## リソース

- [カスタムエージェントの選択を含む GitHub Copilot App のカスタマイズ][customize-app]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/8-create-pull-request/
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
