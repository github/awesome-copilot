---
title: "レッスン 0 - 前提条件とセットアップ"
description: "ワークショップの前提条件を確認し、VS Code の Copilot Chat の動作を確認して GitHub Pull Requests and Issues 拡張機能を追加し、モデルを選びます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

エディターで Copilot を使います。Copilot は VS Code に同梱されているため、チャット用に何かをインストールする必要はありません。GitHub 拡張機能を追加し、空のフォルダーを開きます。

このレッスンでは、次の内容を学習します。

- ワークショップの前提条件を確認する。
- VS Code で Copilot Chat が応答することを確認する。
- GitHub Pull Requests and Issues 拡張機能をインストールする。
- 空のプロジェクトフォルダーを開き、モデルを選ぶ。

## 前提条件

次のものが必要です。

- GitHub アカウント。[GitHub アカウントを作成する][github-signup]か、既存のアカウントを使用します。
- 有効な Copilot プラン。[Copilot Free または有料の Copilot プランを有効にします][copilot-plans]。組織からすでに Copilot へのアクセスが提供されている場合は、そのアカウントを使用します。
- [Visual Studio Code][vscode]。
- インストール済みの [Git][git]。ターミナルで `git --version` を実行して確認します。

## VS Code のセットアップ

1. [VS Code][vscode] をインストールし、GitHub にサインインします。Copilot と Copilot Chat は組み込まれているため、タイトルバーから **Chat** ビューを開き、応答することを確認します。
2. **Extensions** ビューを開き、公式の [GitHub Pull Requests and Issues][pr-extension] 拡張機能をインストールして、Issue とプルリクエストがサイドバーに表示されるようにします。
3. `space-quiz` という名前の空のフォルダーを作成し、**File** > **Open Folder** を選択して開きます。
4. **Chat** ビューのモデルピッカーを使い、次のセクションの優先順位に従ってモデルを選びます。

## モデルを選ぶ

利用可能な最初の選択肢を選びます。

1. **GPT-6-Luna** (推奨)。
2. バランスのよい代替として **Auto**。
3. [利用可能なモデルの一覧][active-models]にある任意のモデル。

利用できるモデルは、プラン、組織のポリシー、製品のバージョンによって異なります。

## まとめと次のステップ

VS Code に Copilot Chat、GitHub 拡張機能、空の `space-quiz` フォルダーが揃いました。[レッスン 1: ワークスペースでの構築][next-lesson]に進みます。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[vscode]: https://code.visualstudio.com/
[git]: https://git-scm.com/downloads
[pr-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
