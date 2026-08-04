---
title: "レッスン 3 - カスタム指示による Copilot のガイド"
description: "GitHub Copilot app を使い、バックログの Issue から始めてカスタム指示の標準をリポジトリに追加し、変更を pull request としてマージします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

生成 AI を扱うとき、コンテキストは重要です。タスクを特定の方法で実行する必要がある場合や、Copilot が把握しておくべき背景情報がある場合は、そのコンテキストを利用できるようにします。特に強力なツールの1つが[指示ファイル][instruction-files]です。指示ファイルには、必要なコードの内容だけでなく、その構成方法も記述します。このレッスンでは、リポジトリにドキュメント標準を追加します。ここから先の多くの作業と同様に、バックログの Issue から開始し、エージェントに変更を行わせます。

このレッスンでは、次の内容を学習します。

- リポジトリ指示とパス固有の指示ファイルがエージェントにどのように渡されるかを確認する。
- バックログ内の指示に関する Issue からセッションを開始する。
- `.github/copilot-instructions.md` にドキュメント標準を追加するようエージェントに依頼する。
- 変更をレビューし、pull request としてマージする。

## シナリオ

優れた開発組織と同様に、Tailspin Toys にも開発プラクティスのガイドラインと要件があります。内容は次のとおりです。

- TSDoc doc comment の形式でコードにドキュメントを追加する。
- フォーマット方法を文書化し、lint によって適用する。

指示ファイルを使用すると、示されたプラクティスに沿ってタスクを実行するために必要な情報を Copilot に提供できます。

## 指示ファイル

カスタム指示を使うと、Copilot にコンテキストと設定を提供でき、コーディングスタイルや要件をより正確に理解させることができます。Copilot をガイドし、より関連性の高い提案やコードスニペットを得るための強力な機能です。希望するコーディング規約、ライブラリ、コードに含めるコメントの種類まで指定できます。リポジトリ全体に適用する指示や、タスクレベルのコンテキストとして特定のファイル種類に適用する指示を作成できます。

指示ファイルには2つの種類があります。

- `.github/copilot-instructions.md` は、リポジトリに対する**すべての**リクエストで Copilot に送信される単一の指示ファイルです。このファイルには、Copilot に送信するほとんどのチャットまたは CLI リクエストに関係する、プロジェクトレベルの情報を記載します。使用する技術スタック、構築するものの概要、ベストプラクティスなど、全体に適用するガイダンスを含められます。
- `.github/instructions/*.instructions.md` ファイルは、特定のタスクやファイル種類向けに作成できます。特定の言語 (TypeScript や Astro など) や、UI コンポーネントまたは新しい単体テスト一式の作成といったタスクに関するガイドラインを提供できます。

> [!NOTE]
> Copilot は AGENTS.md、CLAUDE.md、GEMINI.md を通じて指示のガイダンスを取り込むほかの標準もサポートしており、常に適切なコンテキストを提供できます。

### 指示ファイルを管理するためのベストプラクティス

指示ファイルの作成方法を詳しく説明することは、このワークショップの範囲外です。ただし、サンプルプロジェクトに含まれる例は、代表的なアプローチを示しています。概要は次のとおりです。

- `copilot-instructions.md` の指示は、構築するものの説明、プロジェクトの構造、全体的なコーディング標準など、プロジェクトレベルのガイダンスに絞ります。
- `*.instructions.md` ファイルは、ファイル種類 (単体テスト、Astro コンポーネント、データレイヤー) または特定のタスクに固有の指示を提供するために使用します。
- 自然言語を使います。ガイダンスは明確にし、コードの適切な例と不適切な例を提示します。

AI の使い方に唯一の方法がないのと同様に、指示ファイルの作成方法にも唯一の正解はありません。プロジェクトに最適な方法は、試行を重ねることで見つけられます。

> [!TIP]
> GitHub Copilot を使用するすべてのプロジェクトには、充実した指示ファイル一式を用意することをお勧めします。このプロジェクトのファイルを確認すると、多くのコードファイル種類に対応する指示ファイルがあることがわかります。
>
> テンプレートや出発点が必要な場合は、指示ファイル、カスタムエージェントなどのリソースが揃ったリポジトリ [awesome-copilot][awesome-copilot] を確認してください。

## このプロジェクトのカスタム指示ファイルを確認する

このリポジトリに含まれる指示ファイルを確認します。中心となる `copilot-instructions.md` が1つと、さまざまなタスクに対応する `*.instructions.md` ファイル一式があります。エディターまたは GitHub Web UI で開いてください。

1. レビューパネルが表示されていない場合は、右上の **Toggle review panel** を選択して開きます。

   ![Create PR の右側にある Toggle review panel ボタンを矢印で示した GitHub Copilot app の上部ツールバー](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. **+** を選択し、レビューパネルに新しい項目を追加します。
3. **File** を選択します。
4. `copilot-instructions.md` を検索します。
5. ファイル一覧から `copilot-instructions.md` を選択して開きます。
6. ファイルを確認します。プロジェクトの簡単な説明に加えて、**Agent notes**、**Code standards**、**Scripts**、**Repository Structure** などのセクションがあります。**Code standards** の下には、ネストされた **GitHub Actions Workflows** のガイダンスがあります。これらは Copilot とのすべてのやり取りに適用されます。
7. **Show folder view** を選択して、フォルダーナビゲーターを開きます。

   ![GitHub Copilot app でファイルを開いたレビューパネルにある Show folder view ボタン](/images/learning-hub/copilot-workshops/app-show-folder-view.png)

8. `.github/instructions` フォルダーに移動し、ファイルを確認します。Astro ファイル、Drizzle データレイヤー、テストなどに対応する指示があります。
9. `.github/instructions/unit-tests.instructions.md` を開きます。先頭の `applyTo` フィールドに注目してください。これはリポジトリのルートを基準とする glob で、指示を適用するファイルを決定します。ここでは、TypeScript のテストファイル (`**/*.test.ts` に一致するファイルなど) が対象になります。
10. このプロジェクトで単体テストを作成するための固有の指示を確認します。
11. 最後に `.github/instructions/drizzle.instructions.md` を開き、末尾まで移動します。ほかの指示ファイル (`unit-tests.instructions.md` など) と、プロジェクト内の既存ファイルへのリンクに注目してください。これにより、大きな指示セットを小さく再利用可能なファイルに分割し、コード生成時に参照する例を Copilot に提示できます。そこに記載されたパスは、リポジトリのルートではなく指示ファイルを基準とします。

> [!NOTE]
> `copilot-instructions.md` の **Code formatting requirements** セクションにはプロジェクトのコーディング標準が記載されていますが、コード内のドキュメントはまだ必須ではありません。次の手順で、TSDoc doc comment とファイルコメントヘッダーの規則を追加します。

## 指示に関する Issue から開始する

前のレッスンでは、直接入力したプロンプトからセッションを開始しました。しかし、多くの作業は Issue から始まります。指示ファイルを更新するために登録された Issue に基づいて新しいセッションを作成し、更新を依頼します。

> [!NOTE]
> 指示ファイルは Copilot が生成するコードに大きな影響を与えるため、Copilot を明確にガイドする内容になっていることを慎重に確認してください。このレッスンのように、Copilot で最初のバージョンを作成した後、自分でレビューして更新内容が要件を満たすことを確認する方法が効果的です。

1. サイドバーで **My work** を選択します。
2. **Update our repository coding standards** というタイトルの Issue を選択して開きます。
3. 右上の **New session** を選択し、Issue に基づく新しいセッションを開始します。

   ![GitHub Copilot app の Issue ビューで、右上の New session ボタンを矢印で示した画面](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. 次のプロンプトを使い、Issue に記載された要件を満たすように指示ファイルを更新することを Copilot に依頼します。

  ```plaintext
  Following this issue, make the updates to the instructions files in this project to meet the requirements documented. Don't create the PR quite yet!
  ```

Copilot が更新を行います。

## 変更をレビューする

Copilot が行った更新を読み、更新された指示に基づいて生成するコード例も提示させます。

1. 右上の **Changes** を選択してコードの変更を開きます。

   ![GitHub Copilot app のセッションパネルにあるタブで、Changes タブを矢印で示した画面](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. 更新された指示ファイルをレビューします。コードにドキュメントとコメントを追加するためのガイドラインが含まれていることを確認します。

> [!NOTE]
> AI は決定論的ではなく確率的に動作するため、実際のテキストは異なります。

3. 次のプロンプトを使い、Copilot が今後生成するコード例を作成するよう依頼します。

  ```plaintext
  Do not make any updates, but show me what the code would look like. Based on the new instructions, if I asked Copilot to create a new library component to return all Publishers what would that code look like?
  ```

4. Copilot が提案するコードをレビューします。更新された指示で求めたとおり、TSDoc doc comment とファイルヘッダーコメントが含まれていることを確認します。

これでプロジェクトの指示ファイルを更新し、その効果を確認できました。

## pull request を作成してマージする

指示ファイルはリポジトリのアセットとなり、チームのほかのメンバーと共有されます。ほかのアセットと同様に、作業内容を含む PR を作成します。

1. 右上隅にある **Create PR** を選択します。
2. 求められた場合は **Sign in with your browser** を選択し、画面の指示に従って認証します。
3. Copilot が PR の作成を開始します。

PR が作成されると、Copilot はリポジトリで実行する必要があるワークフローを監視します。しばらくすると、右上のボタンが **Ready to merge** に変わります。これは PR をマージする準備が整ったことを示します。

4. **Ready to merge** を選択します。
5. 新しいダイアログウィンドウで **Merge pull request** を選択し、pull request をマージします。

> [!NOTE]
> 標準がデフォルトブランチにマージされると、すべてのメンバーと新しいセッションでプロジェクトの一部として利用できます。次のレッスンで最新のデフォルトブランチからフィルター機能のセッションを開始すると、エージェントは自動的にこの標準に従います。生成された TypeScript に、依頼していなくても TSDoc doc comment が含まれます。指示が生成コードを形作ることを示す、小さいながらも実際的な例です。

## まとめと次のステップ

アプリが指示ファイルからコンテキストを取得する仕組みを確認し、セッションを使ってリポジトリ全体の標準を追加してマージしました。具体的には、次の作業を行いました。

- リポジトリの `copilot-instructions.md` とパス固有の `*.instructions.md` ファイルを確認した。
- バックログ内の指示に関する Issue からセッションを開始した。
- `.github/copilot-instructions.md` にドキュメント標準を追加するようエージェントに依頼した。
- 変更をレビューし、pull request としてマージした。

次は、新しいセッションでフィルター機能を構築し、先ほどマージした標準が適用される様子を確認します。[レッスン 4「Autopilot による機能の構築」][next-lesson]に進んでください。

## リソース

- [GitHub Copilot をカスタマイズするための指示ファイル][instruction-files]
- [GitHub Copilot app のカスタマイズ][customize-app]
- [カスタム指示を作成するためのベストプラクティス][instructions-best-practices]
- [Awesome Copilot - 指示ファイルなどのリソース集][awesome-copilot]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/4-build-filtering/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/enterprise-cloud@latest/copilot/using-github-copilot/coding-agent/best-practices-for-using-copilot-to-work-on-tasks#adding-custom-instructions-to-your-repository
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests