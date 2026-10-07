---
title: "レッスン 0 - 前提条件とセットアップ"
description: "ワークショップの前提条件を確認し、GitHub Copilot CLI をインストールしてサインインし、空のプロジェクトフォルダーでモデルを選びます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

ターミナルにエージェントを導入します。必要なものが揃っていることを確認し、GitHub Copilot CLI をインストールしてサインインし、空のフォルダーから最初のリクエストを送る準備をします。

このレッスンでは、次の内容を学習します。

- ワークショップの前提条件を確認する。
- GitHub Copilot CLI をインストールしてサインインする。
- プロジェクトフォルダーを作成して信頼する。
- セッションで使用するモデルを選ぶ。

## 前提条件

次のものが必要です。

- GitHub アカウント。[GitHub アカウントを作成する][github-signup]か、既存のアカウントを使用します。
- 有効な Copilot プラン。[Copilot Free または有料の Copilot プランを有効にします][copilot-plans]。組織からすでに Copilot へのアクセスが提供されている場合は、そのアカウントを使用します。
- インストール済みの [Git][git]。`git --version` を実行して確認します。
- macOS、Windows、Linux のいずれかを搭載したコンピューター。

[GitHub CLI][gh-cli] (`gh`) は必須ではありませんが、エージェントがリポジトリやプルリクエストを作成できるため、使用をお勧めします。

> [!NOTE]
> Copilot Business または Copilot Enterprise を使用する場合、エージェントセッションが動作するには、管理者が **Copilot CLI** ポリシーを有効にする必要があります。

## CLI のセットアップ

1. 使用するプラットフォーム向けの [GitHub Copilot CLI][install-cli] をインストールします。
2. プロジェクトフォルダーを作成し、そのフォルダーに移動します。

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. `copilot` を実行してサインインし、確認を求められたらフォルダーを信頼します。
4. `/model` を実行し、次のセクションの優先順位に従ってモデルを選びます。
5. 必要に応じて、まだインストールしていない [GitHub CLI][gh-cli] をインストールします。

![space-quiz というタイトルのターミナルウィンドウに表示された Copilot CLI の図。フォルダー内のファイルを信頼するかを確認し、Yes, proceed が選択されています。セッションのモデルを選ぶ /model と、すべてのスラッシュコマンドを表示する /help が案内されています。プロンプト行には Create a space exploration quiz. と表示されています。](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

CLI は、信頼の確認と `/model` などの開始時に使うコマンドをいくつか表示して起動します。

> [!TIP]
> いつでも `/` を入力して利用可能なすべてのコマンドを確認できます。完全なリファレンスを表示するには `/help` を実行します。

## モデルを選ぶ

`/model` を実行するときは、次の優先順位に従い、利用可能な最初の選択肢を選びます。

1. **GPT-6-Luna** (推奨)。
2. バランスのよい代替として **Auto**。
3. [利用可能なモデルの一覧][active-models]にある任意のモデル。

利用できるモデルは、プラン、組織のポリシー、製品のバージョンによって異なります。

## まとめと次のステップ

Copilot CLI をインストールしてサインインし、空の `space-quiz` フォルダーで起動しました。[レッスン 1: ターミナルからのクイズの構築][next-lesson]に進みます。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
