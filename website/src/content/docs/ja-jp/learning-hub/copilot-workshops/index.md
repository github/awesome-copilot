---
title: "GitHub Copilot のエージェントを実践で学ぶ"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

GitHub Copilot に最近追加された機能は、ソフトウェア開発ライフサイクル (SDLC) 全体を通して開発者を支援する強力なツールです。GitHub の Issue や pull request を使った作業、外部サービスとの連携、そしてもちろんコードの作成も含まれます。このラボでは、実際のユースケースを通して機能を試し、ツールを最大限に活用するためのヒントを紹介します。

> [!CAUTION]
> GitHub Copilot は決定論的ではなく確率的に動作するため、生成されるコードや変更されるファイルなどは毎回異なる場合があります。そのため、ラボ内のスクリーンショットやコード スニペットと、実際の結果に多少の違いが生じることがあります。これは想定される動作であり、この種のツールが持つ特性によるものです。
>
> 何かが壊れているように見える場合や正しく動作しない場合は、メンターに相談してください。

## 利用環境を選ぶ

GitHub Copilot は、どの環境で作業していても利用できます。希望する開発方法に合った利用環境を選び、共通の Tailspin Toys バックログに沿って演習を進めます。どの利用環境にも専用のセットアップ手順が用意されているため、選んだものからすぐに始められます。

### 🖥️ [VS Code](/ja-jp/learning-hub/copilot-workshops/vscode/)

**Visual Studio Code** と GitHub Codespaces 内で GitHub Copilot を使用します。普段使っているエディターを離れることなく、Copilot Chat のエージェント モード、MCP サーバー、カスタム エージェントを利用できます。AI 支援を IDE に直接組み込んで使いたい場合に最適です。

### 💻 [Copilot CLI](/ja-jp/learning-hub/copilot-workshops/cli/)

**GitHub Copilot CLI** は、ターミナルで動作するエージェント型アシスタントです。インストールして MCP サーバーに接続し、プラン モードでコードを生成できます。さらに、独自のスキル、カスタム エージェント、スラッシュ コマンドをすべてコマンド ラインから構築できます。

### 🤖 [Copilot App](/ja-jp/learning-hub/copilot-workshops/app/)

**GitHub Copilot app** は、Copilot CLI を基盤とするデスクトップ アプリケーションです。複数のエージェント セッションを並行して実行し、セッション モードの切り替え、キャンバスでの共同作業、GitHub Issue と pull request の管理をアプリ内で行えます。さらに **Agent Merge** を使用すると、リベース、レビュー フィードバックへの対応、CI の修正、マージまで、pull request の一連の作業を進められます。

### ☁️ [Copilot Cloud Agent](/ja-jp/learning-hub/copilot-workshops/cloud/)

**Copilot cloud agent** は、GitHub Issue の作業をバックグラウンドで進める非同期のペア プログラマーです。作業の割り当て、カスタム エージェントによる指示、エージェント ダッシュボードでの進捗確認、作成された pull request のレビューを行えます。

## シナリオ

架空の企業 Tailspin Toys に新しく参加した開発者として作業します。Tailspin Toys は、開発者をテーマにしたボード ゲームのクラウドファンディングを提供しています。これは巨大な市場です。チームのバックログはすでに GitHub Issue として登録されており、フィルタリングやページネーションなどの機能開発に加えて、アクセシビリティやコーディング規約などの品質改善にもすぐに取り組めます。サイトと Copilot の機能を確認しながら反復的に作業し、タスクを完了させます。

## はじめる

上から利用環境を選んで開始します。どの利用環境も、開発に必要なセットアップから始まります。