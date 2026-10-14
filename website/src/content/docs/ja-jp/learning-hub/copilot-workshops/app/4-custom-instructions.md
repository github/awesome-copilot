---
title: "レッスン 4 - カスタム指示による Copilot のガイド"
description: "リポジトリの指示を確認し、ドキュメント標準を追加して、フィルター機能のコードに適用します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

生成 AI を扱うとき、コンテキストは重要です。タスクを特定の方法で実行する必要がある場合、そのガイダンスを Copilot が利用できるようにします。[指示ファイル][instruction-files]には、必要なコードの内容だけでなく、その構成方法も記述します。フィルター機能を構築したので、Copilot が使用した指示を確認し、ドキュメント標準を追加して、コードに適用します。

このレッスンでは、次の内容を学習します。

- リポジトリの指示とパス固有の指示ファイルがエージェントにどのように渡されるかを確認する。
- コーディング標準に従うよう指示ファイルを更新する。
- 指示ファイルがコードに与える影響を確認する。

## シナリオ

優れた開発組織と同様に、Tailspin Toys にも開発プラクティスのガイドラインと要件があります。内容は次のとおりです。

- コメントはコードを言い換えるのではなく、意図や自明ではない判断を説明する。
- `db/` と `src/lib/` のエクスポートされた関数には、目的、パラメーター、戻り値を TSDoc/JSDoc で記載し、注入可能な `db` 引数があればそれも説明する。
- 再利用可能な Astro コンポーネントには `Props` の契約を文書化し、関連コードが変わったらコメントも最新に保つ。
- 既存のフォーマットと lint のガイダンスを保持する。

指示ファイルを使用すると、示されたプラクティスに沿ってタスクを実行するために必要な情報を Copilot に提供できます。

## 指示ファイル

カスタム指示を使うと、Copilot にコンテキストと設定を提供でき、コーディングスタイルや要件をより正確に理解させることができます。Copilot をガイドし、より関連性の高い提案やコードスニペットを得るための強力な機能です。希望するコーディング規約、ライブラリ、コードに含めるコメントの種類まで指定できます。リポジトリ全体に適用する指示や、タスクレベルのコンテキストとして特定のファイル種類に適用する指示を作成できます。

指示ファイルには2つの種類があります。

- `.github/copilot-instructions.md` は、リポジトリに対する**すべての**リクエストで Copilot に送信される単一の指示ファイルです。このファイルには、Copilot に送信するほとんどのチャットまたは CLI リクエストに関係する、プロジェクトレベルの情報を記載します。使用する技術スタック、構築するものの概要、ベストプラクティスなど、全体に適用するガイダンスを含められます。
- `.github/instructions/*.instructions.md` ファイルは、特定のタスクやファイル種類向けに作成できます。特定の言語 (TypeScript や Astro など) や、UI コンポーネントまたは新しい単体テスト一式の作成といったタスクに関するガイドラインを提供できます。

> [!NOTE]
> ほかの指示形式やサポート状況はハーネスによって異なります。特定の形式を利用する前に、[カスタム指示のサポートリファレンス][custom-instructions-support]を確認してください。

## このプロジェクトのカスタム指示ファイルを確認する

作業を始めやすくするため、スタータープロジェクトには一連の指示ファイルがあらかじめ含まれています。変更を加える前に既存の内容を確認し、その影響を把握します。

1. 前のレッスンのセッションに戻ります。
2. レビューパネルが表示されていない場合は、右上の **Toggle review panel** を選択して開きます。

   ![Create PR の右側にある Toggle review panel ボタンを矢印で示した GitHub Copilot app の上部ツールバー](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

3. **+** アイコンの「Open in panel」を選択し、新しいキャンバスを開きます。
4. **Files** を選択します。
5. **Gear** アイコンを選択し、**Show hidden files** にチェックが付いていることを確認します。
6. `.github/copilot-instructions.md` に移動します。
7. ファイルを確認します。プロジェクトの簡単な説明に加えて、**Agent notes**、**Code standards**、**Scripts**、**Repository Structure** などのセクションがあります。**Code standards** の下には、ネストされた **GitHub Actions Workflows** のガイダンスがあります。これらは Copilot とのすべてのやり取りに適用されます。
8. `.github/instructions` フォルダーに移動し、ファイルを確認します。Astro ファイル、Drizzle データレイヤー、テストなどに対応する指示があります。
9. `.github/instructions/unit-tests.instructions.md` を開きます。先頭の `applyTo` フィールドに注目してください。これはリポジトリのルートを基準とする glob で、指示を適用するファイルを決定します。ここでは、TypeScript のテストファイル (`**/*.test.ts` に一致するファイルなど) が対象になります。
10. このプロジェクトで単体テストを作成するための固有の指示を確認します。
11. 最後に `.github/instructions/drizzle.instructions.md` を開き、末尾まで移動します。ほかの指示ファイル (`unit-tests.instructions.md` など) と、プロジェクト内の既存ファイルへのリンクに注目してください。これにより、大きな指示セットを小さく再利用可能なファイルに分割し、コード生成時に参照する例を Copilot に提示できます。そこに記載されたパスは、リポジトリのルートではなく指示ファイルを基準とします。

## チームのガイダンスに合わせて指示ファイルを更新する

既存のファイルはよい出発点ですが、まだ不足している部分があります。新しく生成される TypeScript ファイルに [TSDoc コメント][tsdoc]を追加するため、中心となる `copilot-instructions.md` ファイルを変更します。

> [!NOTE]
> 指示ファイルは Copilot が生成するコードに大きな影響を与えるため、Copilot を明確にガイドする内容になっていることを慎重に確認してください。Copilot で最初のバージョンを作成した後、自分でレビューして更新内容が要件を満たすことを確認できます。また、出発点として役立つ[指示ファイルのコレクションを Awesome Copilot で][awesome-copilot]確認できます。

1. 同じファイルキャンバスで `.github/copilot-instructions.md` に移動します。
2. ファイルの中ほどにある **Code formatting requirements** 見出しを見つけます。
3. その見出しの下にある最後の箇条書きとして、次の内容を追加します。

   ```plaintext
   All new TypeScript should contain TSDocs comments for documentation purposes.
   ```

ファイルは自動的に保存され、使用できる状態になります。

## 更新したガイダンスを使用する

指示ファイルを更新したので、更新内容をレビューして必要な変更を加えるよう Copilot に依頼し、生成されるコードへの影響を確認します。

> [!NOTE]
> ここでは指示ファイルを変更した直後なので、使用するよう Copilot に明示的に伝えます。コード作成時に指示ファイルがすでに存在する場合、Copilot は明示しなくても自動的に指示ファイルを使用します。

1. 指示ファイルを使用し、新しく追加した要件に合わせてコードを更新するよう Copilot に依頼します。

   ```plaintext
   We just updated our instructions and code guidance. Can you please update the code you generated to match that guidance?
   ```

2. 右上の **Changes** を選択してコードの変更を開きます。

   ![GitHub Copilot app のセッションパネルにあるタブで、Changes タブを矢印で示した画面](/images/learning-hub/copilot-workshops/app-select-changes.png)

3. TypeScript ファイルを確認します。新しく生成された TSDoc コメントに注目してください。

## まとめと次のステップ

アプリが指示ファイルからコンテキストを取得する仕組みを確認し、新しい標準を機能に適用しました。具体的には、次の作業を行いました。

- リポジトリの `copilot-instructions.md` とパス固有の `*.instructions.md` ファイルを確認した。
- コーディング標準に従うよう指示ファイルを更新した。
- 指示ファイルが生成されたコードに与える影響を確認した。

次は、lint とテストを一貫して実行するために、[再利用可能な quality-checks スキルをカスタマイズして実行します][next-lesson]。

## リソース

- [GitHub Copilot をカスタマイズするための指示ファイル][instruction-files]
- [GitHub Copilot app のカスタマイズ][customize-app]
- [カスタム指示を作成するためのベストプラクティス][instructions-best-practices]
- [Awesome Copilot - 指示ファイルなどのリソース集][awesome-copilot]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/5-agent-skills/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/copilot/concepts/prompting/response-customization#writing-effective-custom-instructions
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[tsdoc]: https://tsdoc.org/
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests