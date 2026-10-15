---
title: "レッスン 0 - 前提条件とセットアップ"
description: "ワークショップの前提条件を確認し、GitHub Copilot app をインストールして、そのワークスペースに慣れます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Space Quiz を構築する前に、必要なものが揃っていることを確認し、GitHub Copilot app をインストールして、そのワークスペースに慣れます。

このレッスンでは、次の内容を学習します。

- ワークショップの前提条件を確認する。
- GitHub Copilot app をインストールしてサインインする。
- セッションで使用するモデルを選ぶ。
- アプリの主な作業領域を把握する。
- 簡単なチャットを試す。

## 前提条件

次のものが必要です。

- GitHub アカウント。[GitHub アカウントを作成する][github-signup]か、既存のアカウントを使用します。
- 有効な Copilot プラン。[Copilot Free または有料の Copilot プランを有効にします][copilot-plans]。組織からすでに Copilot へのアクセスが提供されている場合は、そのアカウントを使用します。
- macOS、Windows、Linux のいずれかを搭載したコンピューター。

アプリには Git が同梱されているため、ほかにインストールするものはありません。

> [!NOTE]
> Copilot Business または Copilot Enterprise を使用する場合、エージェントセッションが動作するには、管理者が **Copilot CLI** ポリシーを有効にする必要があります。

## アプリをインストールして設定する

1. 使用するオペレーティングシステム向けの [GitHub Copilot app][download-app] をダウンロードしてインストールします。
2. アプリを開きます。
3. **Sign in to GitHub** を選択して認証します。
4. テーマを選び、**Finish** を選択します。

## モデルを選ぶ

モデルを選ぶときは、次の優先順位に従い、利用可能な最初の選択肢を選びます。

1. **GPT-6-Luna** (推奨)。
2. バランスのよい代替として **Auto**。
3. [利用可能なモデルの一覧][active-models]にある任意のモデル。

利用できるモデルは、プラン、組織のポリシー、製品のバージョンによって異なります。

## アプリの構成を把握する

アプリは、開発ワークフローを 1 か所にまとめています。

- **New**: プロジェクトのセッションを開始するか、簡単な質問には **Chat** を選びます。
- **Pull requests**: すべてのリポジトリのプルリクエストをレビューし、状況を確認します。
- **Issues**: 自分に割り当てられた Issue、自分が作成した Issue、自分がメンションされた Issue を探します。
- **Automations**: リポジトリで繰り返すエージェントの作業にスケジュールを設定します。
- **Customize**: テーマやモデルを変更し、Canvas 拡張機能を管理します。
- **Projects**: リポジトリを開きます。各リポジトリの下には、そのセッションが表示されます。

## 簡単なチャットを試す

すべての質問にワークスペースが必要なわけではありません。**New** から、プロジェクトではなく **Chat** を選びます。チャットにはリポジトリが接続されておらず、ファイルを編集できません。そのため、実際のセッションを始める前に質問したり、説明を求めたり、アプローチを検討したりする最も手軽な方法です。

チャットで次のプロンプトを送信します。

```plaintext
How does the GitHub Copilot app use worktrees?
```

## まとめと次のステップ

前提条件を確認し、アプリをインストールしてモデルを選び、主な作業領域を確認しました。[レッスン 1: Space Quiz のワークスペースの作成][next-lesson]に進みます。

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
