---
title: "レッスン 6 - Playwright MCP による機能の検証"
description: "Customize から Playwright MCP を設定し、既存の機能用ワークツリーのフィルター機能をブラウザーで観察します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

すでに説明したように、コードを書く作業には、単にコードを書く以上のことが含まれます。データや外部サービスを操作し、Copilot で追加の自動化を利用できるようにする必要があります。そこで役立つのが MCP server です。MCP server を使うと、Copilot はアプリに組み込まれた機能を超えて、さらに多くのツールやサービスを利用できます。

このレッスンでは、次の内容を学習します。

- Model Context Protocol (MCP) の概要と、GitHub Copilot app での使用方法を理解する。
- Playwright MCP server を追加する。
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

MCP server は、サイドバーの **Customize** で管理します。リポジトリや Copilot CLI 向けに設定されたサーバーは App でも利用できる場合があるため、重複して追加する前に確認してください。[App のカスタマイズドキュメント][customize-app]で利用可能な選択肢を確認できます。

1. サイドバーで **Customize** を選択します。
2. **MCP** を選択し、**Installed** で既存の Playwright サーバーを確認します。
3. 必要な場合は利用可能なサーバーから **Playwright** を探すか、発行元が文書化したカスタムサーバーの追加手順を使用します。
4. 発行元、設定、インストールの確認内容をレビューしてから承認します。画面の案内に従ってサーバーを追加してください。組織のポリシーや前提条件の不足により、セットアップがブロックされる場合があります。
5. **Interactive** モードでフィルター機能のセッションに戻り、Playwright MCP のツールが利用できることを確認します。

セットアップが失敗した場合は、続行前に設定や権限の問題を解決します。

## Playwright で機能を確認するよう Copilot に依頼する

Issue と計画時の決定事項は、すでにコンテキストに含まれています。Copilot にサーバーの起動を依頼する前に、以前自分で起動した開発サーバーを停止してください。

1. 次のプロンプトを使い、新しい機能を検証するよう Copilot に依頼します。

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

  > [!NOTE]
  > 使用する MCP server を Copilot に明示する必要はありません。通常は現在のコンテキストに基づいて適切なものを見つけます。ただし、重要だと考える情報を Copilot に伝えても問題はありません。

  2. あとは動作を見守ります。

  Copilot はサーバーを起動してブラウザーを開き、Web サイトを操作します。完了するとサーバーを停止し、レポートを提供します。

## まとめと次のステップ

GitHub Copilot app から Playwright MCP server を使い、実際のブラウザーで機能を確認しました。学習した内容は次のとおりです。

- Model Context Protocol (MCP) の概要と、GitHub Copilot app での使用方法を学習した。
- Playwright MCP server を追加した。
- エージェントにブラウザーを操作させ、フィルター機能を確認した。

次は、スキルとブラウザーツールを専門家の役割で組み合わせる [QA カスタムエージェントを作成します][next-lesson]。

## リソース

- [MCP とは何か、なぜ注目されているのか][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [GitHub Copilot app での MCP server の構成][customize-app]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app