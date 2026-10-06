---
title: "レッスン 9 - Issue のトリアージの自動化"
description: "最近の未解決 Issue を要約する、毎週の自動化を作成して実行します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

自動化を使い、繰り返し行う Issue のトリアージを、スケジュールに従って実行するエージェントのワークフローにします。

このレッスンでは、次の内容を学習します。

- 毎週実行する自動化を作成する。
- 自動化を Space Quiz プロジェクトに接続する。
- 自動化をすぐに実行して結果をレビューする。

## 自動化を作成する

![Copilot app の Automations ビューの図。All、Local、Cloud のフィルター、検索ボックス、Templates と New automation のボタンがあり、space-quiz プロジェクトの毎週の自動化カードとして Issue triage と Accessibility audit の 2 つが表示されています。](/images/learning-hub/copilot-workshops/first-steps-app-automations.svg)

自動化は、スケジュールに従って同じプロンプトをそれぞれ専用のセッションで実行するため、作業を妨げません。**All**、**Local**、**Cloud** で絞り込め、どの自動化も必要なときに実行できます。

1. **Automations** を開きます。
2. 新しい毎週の自動化用のテンプレートを選びます。
3. 次のプロンプトを入力します。

   ```plaintext
   Review the latest GitHub issues created and still open in the last week, and provide a summary table ranked by severity and priority.
   ```

4. セッションモードを **Autopilot** に設定します。
5. モデルを **Auto** に設定します。
6. `space-quiz` プロジェクトを選択します。
7. **Create** ドロップダウンを開き、**Create and run** を選択します。

生成された要約をレビューし、リポジトリの最近の未解決 Issue が参照されていることを確認します。

## まとめと次のステップ

スケジュールに従って実行する、再利用可能なエージェントのワークフローを作成しました。[レッスン 10: リモートからセッションを続ける][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
