---
title: "レッスン 9 - キャンバスの確認と作成"
description: "既存の Database Explorer キャンバスを使用してから、リポジトリに保存するトリアージキャンバスを作成してレビューします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

ここまでは、チャットを通じてエージェントを指示してきました。しかし、多くの作業は会話の中ではなく、ボード、ドキュメント、チェックリスト上で行われます。**キャンバス**は、まさにそのような作業のために、アプリ内でユーザーとエージェントが共有できる領域です。このレッスンでは、まず Tailspin Toys に含まれるキャンバスを使用し、次にこれまで取り組んできたバックログ用のキャンバスを作成します。

このレッスンでは、次の内容を学習します。

- キャンバスの概要と使用する場面を理解する。
- 既存の Database Explorer キャンバスを使用してプロジェクトデータを確認する。
- バックログをトリアージする共有 Kanban ボードのキャンバスを作成する。
- 別の機能を実装せずに新しいキャンバスを確認して操作する。

## シナリオ

Tailspin Toys には、データベースを確認するためのキャンバスがすでに含まれています。キャンバスがプロジェクトデータを対話型の領域に変換する仕組みを確認した後、別の機能に着手せず、次に取り組む作業を選ぶための再利用可能なボードを作成します。

## キャンバスとは

[キャンバス][canvas-docs]は、計画、トリアージボード、リリースチェックリスト、ダッシュボード、ドキュメントなどの作業成果物を扱う、共有の対話型領域です。チャットは意図の説明や曖昧さの検討に適していますが、多くの作業は具体的な*領域*上で行われます。キャンバスを使うと、その領域でエージェントと直接共同作業できます。

キャンバスは**双方向**です。エージェントが作業中にキャンバスを更新できる一方で、ユーザーも同じ領域を編集できます。キャンバスを作成すると、エージェントはプロンプトとワークフローに基づいて内容を構築します。その後も、機能の追加、削除、修正を依頼できます。作成したキャンバスは、アプリの右側のパネルに開きます。

一般的な例は次のとおりです。

- 1日の計画を立て、Issue と pull request に優先順位を付けるための **Markdown canvases**。
- ユーザーとエージェントがカードを追加し、作業を列間で移動する **Agentic kanban boards**。
- リポジトリの重要な Issue と繰り返し現れるテーマをまとめる **Issue triage boards**。

## キャンバスを使用する理由

タスクに構造、反復、検証が必要で、チャットだけでは不十分な場合はキャンバスを使用します。キャンバスでは次のことができます。

- ワークフローに合った実際の成果物に、エージェントの作業を結び付ける。
- 共有領域で作業を直接調整または修正し、その変更を基にエージェントに作業を続けさせる。
- チャットの応答だけでなく、成果物への目に見える変更として進捗を確認する。

## Database Explorer キャンバスを使用する

まず、プロジェクトに含まれる既存の Database Explorer キャンバスを使用します。実際に動作する例を使用すると、自分で作成する前に、リポジトリにスコープされたキャンバスの動作を確認できます。

1. フィルター機能の pull request (PR) がマージされたことを確認し、ローカルの `main` を更新します。
2. GitHub Copilot app に戻り、**Home screen** を選択します。
3. リポジトリに `tailspin-toys` が選択されていることを確認します。
4. 更新済みの `main` に基づく **new working tree** でセッションを作成し、**Interactive** モードを選択します。
5. 必要に応じてローカルデータベースを準備し、変更せずに既存のキャンバスを開くよう Copilot に依頼します。

    ```plaintext
    Set up the local database if needed, then open the repository's Database Explorer canvas. Do not change any files.
    ```

6. Database Explorer で利用可能なテーブルを確認し、`games` を選択します。
7. 高評価のゲームを5件表示する読み取り専用クエリを実行します。

    ```sql
    SELECT title, star_rating
    FROM games
    ORDER BY star_rating DESC
    LIMIT 5;
    ```

8. 結果が評価の降順で5件以内のゲームを含むことを確認します。
9. **Files** を開いて `.github/extensions/database-explorer/extension.mjs` を確認します。キャンバスがプロジェクトとともに保存され、クエリを読み取り専用の `SELECT` 文と `WITH` 文に制限していることに注目してください。
10. セッションにファイルの変更がないことを確認します。

## Issue をトリアージするキャンバスを作成する

次に、別の種類の共有領域を作成します。トリアージキャンバスをプロジェクトスコープで保存すると、チームがレビューして再利用できるリポジトリアセットになります。

1. 同じセッションで `/create-canvas` と入力し、作成するキャンバスについて説明します。

   ```plaintext
   Create a Kanban triage canvas for this repo's open issues and save it under .github/extensions/. Highlight the three issues you'd prioritize and explain why, with the rest below. Include summaries and links.

   Give each card an "Add to current context" action that adds the issue details without starting work or changing the issue. Make it keyboard-accessible and open it so I can try it.
   ```

Copilot は `.github/extensions` の下にキャンバス拡張機能を作成し、アプリの右側のパネルで共有領域を開きます。生成された拡張機能は単なる視覚的な成果物ではなく、実行可能なリポジトリコンテンツです。次に、そのファイルと動作を確認します。

## キャンバスを確認して操作する

キャンバスを共有する前に、リポジトリの実際の Issue と比較し、コントロールを操作します。これにより、内容が正確で操作がアクセシブルであり、Issue のアクションが作業を開始せずにコンテキストを追加することを確認できます。

1. **Changes** を開き、キャンバス定義がユーザーやセッション専用ではなく、リポジトリの `.github/extensions/` の下に保存されていることを確認します。既存の拡張機能とアプリケーションファイルが変更されていないことも確認します。
2. ボードを実際のオープンな Issue と比較し、順位の理由を評価します。
3. カードとコントロールが読みやすく、キーボードで利用できることを確認します。
4. Issue の **Add to current context** を選択し、詳細だけが会話に入ることを確認します。実装や Issue の状態変更が始まってはいけません。
5. 修正内容をレビューし、変更したファイルに適用できる既存の検証を実行するよう Copilot に依頼します。対話型の領域が開いたというだけで正しいと判断せず、結果と阻害要因を記録します。
6. キャンバスに変更が必要な場合は、トリアージの範囲内で対象を絞った改善を依頼し、該当するチェックを繰り返します。このキャンバス作業の一部として、バックログの Issue を実装しないでください。

ワークショップは別の PR を作成する前に終了します。手動のマージと Agent Merge の両方をすでに実践したためです。実際の開発では、他のメンバーがキャンバスを利用する前に、チームの通常のプロセスでレビューしてマージしてください。

## まとめと次のステップ

ユーザーとエージェントが共同作業できる共有領域を作成しました。具体的には、次の作業を行いました。

- キャンバスの概要と使用する場面を学習した。
- 既存の Database Explorer キャンバスを使用してプロジェクトデータを確認した。
- バックログをトリアージする共有 Kanban ボードのキャンバスを作成した。
- 別の機能を実装せずに新しいキャンバスを確認して操作した。

バックログを追跡できるようになったので、ここまで構築した内容と今後の進め方を振り返ります。[レッスン 10「振り返りと次のステップ」][next-lesson]に進んでください。

## リソース

- [GitHub Copilot app での canvas extension の操作][canvas-docs]
- [Awesome Copilot の Canvases][awesome-copilot-canvases]
- [GitHub Copilot app について][about-copilot-app]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/10-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app