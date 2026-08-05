---
title: "レッスン 5 - Playwright MCP server によるテスト"
description: "Playwright MCP server を GitHub Copilot app に追加し、実際のブラウザーでフィルター機能を手動テストするようエージェントに依頼します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

前のレッスンでは、プロジェクトの自動テストスイートを使ってフィルター機能を作成し、検証しました。テストによってコードの検証を自動化できますが、エージェント自身が動作を確認できるようにすることも効果的です。実際に作成している UI で問題を見つけた場合に、エージェントが対応できるようになります。MCP を使って AI エージェントに外部機能へのアクセスを提供する方法を確認し、Copilot が構築中のサイトを直接操作できるように Playwright MCP server を追加します。

このレッスンでは、次の内容を学習します。

- Model Context Protocol (MCP) の概要と、GitHub Copilot app での使用方法を理解する。
- アプリの設定から Playwright MCP server を追加する。
- エージェントにブラウザーを操作させ、フィルター機能を確認する。

## シナリオ

単体テストとエンドツーエンドテストは重要ですが、UI の更新を検証するには、実際に UI を操作する必要があります。変更作業をさらに自動化し、更新が期待どおりに動作するという確信を高めるために、ユーザーと同じ方法で Copilot が作業中の Web サイトを使用できるようにします。

## Model Context Protocol (MCP) とは

[Model Context Protocol (MCP)][mcp-blog-post] は、AI エージェントが外部のツールやサービスと通信するための手段を提供します。MCP を使うと、AI エージェントは外部のツールやサービスとリアルタイムで通信できます。その結果、最新情報へのアクセス (resources を使用) や、ユーザーに代わる操作 (tools を使用) が可能になります。

これらの tools と resources には、AI エージェントと外部のツールやサービスをつなぐ MCP server を通じてアクセスします。MCP server は、AI エージェントと外部ツール (既存の API や NPM パッケージなどのローカルツール) 間の通信を管理します。各 MCP server は、AI エージェントがアクセスできる異なる tools と resources のセットを表します。

よく使われる既存の MCP server には、次のものがあります。

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server): GitHub リポジトリを管理するための API セットにアクセスできます。AI エージェントは、新しいリポジトリの作成、既存のリポジトリの更新、Issue と pull request の管理などを行えます。
- [**Playwright MCP Server**][playwright-mcp-server]: Playwright を使ったブラウザー自動化機能を提供します。AI エージェントは、Web ページへの移動、フォームへの入力、ボタンの選択などを行えます。

さまざまな tools と resources にアクセスできる MCP server がほかにも多数あります。GitHub は、エコシステム内での発見と貢献を促進するために [MCP registry](https://github.com/mcp) をホストしています。

> [!CAUTION]
> MCP server は、プロジェクト内のほかの依存関係と同様に扱ってください。使用する前にソースコードを慎重に確認し、発行元を検証して、セキュリティ上の影響を考慮します。信頼できる MCP server だけを使用し、機密性の高いリソースや操作へのアクセスを許可するときは注意してください。

## Playwright MCP server を追加する

MCP server はアプリの設定から追加して管理します。アプリには一般的なサーバーのカタログが含まれているため、[Playwright MCP server][playwright-mcp-server] は数回の操作で追加できます。

1. <kbd>Ctrl</kbd>+<kbd>,</kbd> を選択して、Copilot app の設定ページを開きます。
2. **MCP servers** を選択します。
3. 検索ダイアログに `Playwright` と入力します。
4. **Popular MCP servers** の一覧から **Playwright** を選択します。
5. **Add server** を選択し、利用可能な MCP server の一覧に追加します。
6. <kbd>Esc</kbd> を選択して設定ダイアログを閉じます。

これで Playwright MCP server を追加できました。

## Playwright で機能を確認するよう Copilot に依頼する

Playwright MCP server を使って機能を手動テストするよう Copilot に依頼します。

1. 次のプロンプトを使い、新しい機能を検証するよう Copilot に依頼します。

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

Copilot は Playwright MCP server を通じてブラウザーを起動し、各手順を実行して、確認結果を報告します。タスクの実行中、システム上で実際にブラウザーが開く様子を確認できます。

2. Issue の受け入れ条件と照らし合わせて概要を読みます。問題がある場合は、pull request を作成する前に追加の質問をするか、コードを修正するよう依頼します。
3. 次のレッスンでこの作業を完了するため、セッションを開いたままにします。

これで Copilot は、ユーザーと同じように機能を確認し、ブラウザーでも動作を検証しました。

## まとめと次のステップ

GitHub Copilot app から Playwright MCP server を使い、実際のブラウザーで機能を確認しました。学習した内容は次のとおりです。

- Model Context Protocol (MCP) の概要と、アプリで MCP tools を利用する仕組みを学習した。
- アプリの設定から Playwright MCP server を追加した。
- エージェントにブラウザーを操作させ、フィルター機能を確認した。

機能の構築と検証が完了し、動作することも確認できました。次は、**Agent Merge** を使って pull request の作成とマージをエージェントに任せ、機能をリリースします。[レッスン 6「Agent Merge によるマージ」][next-lesson]に進んでください。

## リソース

- [MCP とは何か、なぜ注目されているのか][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [GitHub Copilot app での MCP server の構成][customize-app]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app