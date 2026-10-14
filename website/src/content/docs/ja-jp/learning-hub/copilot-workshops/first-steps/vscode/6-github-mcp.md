---
title: "レッスン 6 - Copilot に GitHub を扱うツールを提供する"
description: "Copilot に Issue やプルリクエストの操作を依頼する前に、VS Code の GitHub MCP サーバーを有効にしてレビューします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Copilot に Issue の作成やプルリクエストの操作を依頼する*前に*、GitHub MCP サーバーを有効にします。これらのツールを使うと、Copilot はチャットから直接 GitHub のデータを読み書きできます。

このレッスンでは、次の内容を学習します。

- GitHub MCP サーバーを有効にする。
- サーバーが要求するツールとアクセス許可をレビューする。
- チャットで GitHub のツールが利用できることを確認する。

## GitHub MCP を有効にする

1. VS Code の **Settings** を開き、使用中のバージョンに組み込みの **GitHub MCP** サーバーが含まれる場合は、有効にします。
2. そうでない場合は、[MCP サーバーの設定手順][mcp-servers]に従って、信頼できる GitHub MCP サーバーをインストールします。
3. 承認する前に、サーバーが要求するツールとアクセス許可をレビューします。
4. Copilot Chat のツールピッカーに GitHub のツールが表示されることを確認します。

## まとめと次のステップ

Copilot が GitHub を扱うツールを利用できるようになりました。[レッスン 7: Issue の計画と実装][next-lesson]に進みます。

[mcp-servers]: https://code.visualstudio.com/docs/copilot/chat/mcp-servers
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/7-issues-and-sessions/
