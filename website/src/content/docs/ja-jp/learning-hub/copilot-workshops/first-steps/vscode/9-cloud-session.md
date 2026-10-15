---
title: "レッスン 9 - 次のアイデアをクラウドセッションに任せる"
description: "Copilot Chat のハーネスを Local から Cloud に切り替え、単独で完結する機能の作成を委任して、プルリクエストとして受け取ります。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

ローカルで開発の流れをひととおり体験したので、望ましい成果物がどのようなものかを把握できました。今が、作業を任せて自分が付き添わずに進めてもらうよいタイミングです。Copilot Chat は、実行するハーネスを自分のコンピューターから GitHub に切り替えられます。

このレッスンでは、次の内容を学習します。

- Copilot Chat のハーネスを **Local** から **Cloud** に切り替える。
- 明確な受け入れ条件を持つ、単独で完結する機能の作成を委任する。
- 作成されたプルリクエストをレビューする。

> [!NOTE]
> クラウドセッションには、対象となる有料の Copilot プランが必要です。Business と Enterprise では、管理者によるアクセスの有効化も必要な場合があります。

## クラウドに委任する

![VS Code の Copilot Chat で Harness ピッカーを開いた図。Copilot の下で Local ではなく Cloud が選択され、Claude や Codex などのほかのハーネスも並んでいます。上部には、3 つの新しいカラーテーマを追加するリクエストと Working in the cloud が表示され、GitHub でセッションの進行を確認するリンクがあります。](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

**Harness** ピッカーには、ほかのハーネスとともに、Copilot を **Local** または **Cloud** で実行する選択肢が表示されます。**Cloud** に切り替えると、次のリクエストは自分のコンピューターではなく GitHub で実行されます。

1. Copilot Chat で **Harness** ピッカーを開き、Copilot を **Local** から **Cloud** に切り替えます。
2. 新しいセッションを開始し、明確な受け入れ条件を持つ、単独で完結する機能を依頼します。

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. ノートパソコンを閉じます。作業は GitHub で続き、プルリクエストとして届きます。
4. 自分で作成したプルリクエストとまったく同じように、注意深くレビューします。

> [!TIP]
> **説明できる作業を委任する**
>
> クラウドセッションでは、正確な作業指示がよい結果につながります。受け入れ条件を書けないなら、そのタスクはまだ自分のコンピューターの外に任せる準備ができていません。

## まとめと次のステップ

クラウドセッションに機能の作成を委任し、結果をレビューしました。[レッスン 10: 振り返りと次のステップ][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/10-review/
