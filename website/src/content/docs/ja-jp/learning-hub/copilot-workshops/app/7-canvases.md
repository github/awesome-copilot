---
title: "レッスン 7 - キャンバスを使った計画"
description: "GitHub Copilot app でエージェント主導の共有キャンバスを作成し、エージェントと一緒に作業を計画して追跡します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

ここまでは、チャットを通じてエージェントを指示してきました。しかし、多くの作業は会話の中ではなく、ボード、ドキュメント、チェックリスト上で行われます。**キャンバス**は、まさにそのような作業のために、アプリ内でユーザーとエージェントが共有できる領域です。このレッスンでは、ここまで取り組んできたバックログの計画と追跡に使用する、シンプルなキャンバスを作成します。

このレッスンでは、次の内容を学習します。

- キャンバスの概要と使用する場面を理解する。
- バックログをトリアージする共有 Kanban ボードのキャンバスを作成する。
- キャンバスをリポジトリに保存し、チーム向けにマージする。
- 新しいセッションでキャンバスを開き、そこから作業を開始する。

## シナリオ

Issue の一覧は、どのような状況でも負担に感じることがあります。Tailspin Toys の開発者は、Issue をすばやくトリアージし、Copilot app で作業を開始できるツールを探しています。

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

## 作業を追跡するキャンバスを作成する

星評価、ドキュメント標準、フィルター機能をすべてマージし、多くの成果をリリースしました。しかし、バックログにはまだ項目が残っています。作業をすばやくトリアージするためのキャンバスを作成します。

1. GitHub Copilot app に戻ります。アプリを閉じている場合は開きます。
2. **Home screen** を選択します。
3. リポジトリに `tailspin-toys` が選択されていることを確認します。
4. プロンプトボックスで次のプロンプトを使用し、要件を満たすキャンバスを作成します。

   ```plaintext
   Create a basic Kanban board canvas that allows me to quickly triage work. Highlight the three issues which are most likely to need attention right now, with the remainder in a second section down below. The top three cards should include a description of the issue's content and a justification of why they're at the top of the list. Each issue should have a button that allows me to add it to the current context for the current session so I can get to work on it straightaway.
   ```

Copilot がキャンバスの作成を開始します。

> [!NOTE]
> 作成には数分かかります。複雑なタスクであるため、最初のバージョンでは満足できない場合があります。理想のツールになるまで、プロンプトで構築を続けるよう依頼できます。

## キャンバスを保存してリポジトリにマージする

キャンバスは、指示ファイルやスキルと同様に、リポジトリのアセットにできます。Copilot にリポジトリへの追加とマージを依頼し、チーム全体で使用できるようにします。

1. 同じセッションで、次のプロンプトを使ってキャンバスをリポジトリに保存するよう Copilot に依頼します。

   ```plaintext
   Let's save this canvas definition to the repository so I can share it with my development team
   ```

2. Copilot がキャンバスファイルを保存したら、右上隅にある **Create PR** の横のドロップダウンを選択します。
3. **Agent merge** を選択して Agent Merge を有効にします。

   ![GitHub Copilot app で展開された Create PR ドロップダウンの Agent merge オプションを矢印で示した画面](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. ボタンのテキストが **Agent merge** に変わります。
5. **Agent merge** ボタンを選択し、Agent Merge のプロセスを開始します。

Copilot app が PR の作成と管理を開始します。最初にプロジェクトを調査して PR の最適な作成方法を判断し、PR を作成します。

しばらくすると、Copilot が再び作業を開始し、リポジトリ上ですべてのテストを実行する CI プロセスなど、PR の条件を確認します。ほかのチームメンバーによるレビュー、実行が必要なチェック (CI プロセス)、PR をマージできるかどうかのステータスを報告します。

6. **Agent merge** の横にあるドロップダウンを選択してから **Merge pull request** を選択し、Agent Merge に pull request のマージを許可します。

   ![Agent merge ドロップダウンで、エージェントに許可された Address reviews、Fix CI failures、Resolve conflicts の操作と、矢印で示された Merge pull request](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. すべての CI プロセスが成功するまで待ちます。成功すると、Copilot が pull request を自動的にマージします。

これでチーム用の新しい共有キャンバスを作成できました。

## キャンバスで作業する

キャンバスを作成できたので、新しいセッションを開始して使用します。

1. Copilot app で **tailspin-toys** の横にある **New session** を選択し、新しいセッションを開始します。
2. 次のプロンプトを使い、トリアージ用キャンバスを開くよう Copilot に依頼します。

   ```plaintext
   Open the triage issues canvas
   ```

3. 作成したキャンバスが新しいセッションで開いたことを確認します。
4. 最も関心のある Issue の1つで **Add to current context** を選択します。
5. Copilot が Issue の作業を開始します。

これで、作成したキャンバスを使って開発プロセスを効率化できました。

## まとめと次のステップ

ユーザーとエージェントが共同作業できる共有領域を作成しました。具体的には、次の作業を行いました。

- キャンバスの概要と使用する場面を学習した。
- エージェントと共有の Kanban トリアージボードのキャンバスを作成した。
- Agent Merge を使ってキャンバスをリポジトリに保存し、マージした。
- 新しいセッションでキャンバスを開き、そこから作業を開始した。

バックログを追跡できるようになったので、ここまで構築した内容と今後の進め方を振り返ります。[レッスン 8「振り返りと次のステップ」][next-lesson]に進んでください。

## リソース

- [GitHub Copilot app での canvas extension の操作][canvas-docs]
- [Awesome Copilot の Canvases][awesome-copilot-canvases]
- [GitHub Copilot app について][about-copilot-app]

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/8-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app