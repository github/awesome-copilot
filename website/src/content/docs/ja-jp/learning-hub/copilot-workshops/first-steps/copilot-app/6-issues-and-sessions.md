---
title: "レッスン 6 - Issue とセッションの活用"
description: "範囲を絞ったバックログを作成し、Issue を選んで分離された worktree で実装し、自分で差分をレビューします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

エージェントに、範囲を絞った製品の改善案を提案してもらいます。そのアイデアを GitHub Issue にし、分離されたセッションで 1 つの Issue を実装します。

このレッスンでは、次の内容を学習します。

- Space Quiz 用に、範囲を絞った Issue を 3 つ作成する。
- **Issues** でバックログを確認する。
- Issue から新しい worktree のセッションを開始する。
- **Changes** タブで差分をレビューし、機能を確認する。

## Issues でバックログを作成する

次のプロンプトを送信します。

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

**Issues** を開いて 3 つの Issue をレビューし、価値が明確で、無理なく取り組める範囲のものを 1 つ選びます。

![Copilot app の Issues ビューの図。サイドバーには New、Pull requests、Issues、Automations、Customize、More、space-quiz プロジェクトが並んでいます。メイン領域には Assigned to me、Created by me、Mentioning me、Done のタブ、検索ボックス、State と Assignee のフィルター、space-quiz リポジトリの未解決 Issue 3 件の一覧があります。](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues** は、すべてのリポジトリの GitHub Issue をアプリに集め、**Assigned to me**、**Created by me**、**Mentioning me**、**Done** で絞り込みます。

## Issue を実装する

1. **Issues** から、選んだ Issue を開きます。
2. **New session** を選択します。
3. 確認を求められたら **new worktree** を選びます。
4. **Interactive** モードと、使用したいモデルを使います。
5. 次のプロンプトを送信します。

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

新しい worktree は、レビューしてマージする準備が整うまで、この機能をデフォルトブランチから分離します。

## 自分で差分をレビューする

エージェントから報告があっても、その内容をそのまま信じるのではなく確認します。

1. 右側のフライアウトを開き、**Changes** タブを選択します。
2. セッションが変更したすべてのファイルの差分を読みます。
3. 統合ブラウザーで機能をテストし、Issue の受け入れ条件を満たしていることを確認します。

![右側のフライアウトで Changes タブを開いた Copilot app セッションの図。index.html の 1 ファイルが変更され、142 行の追加と 8 行の削除が表示されています。セッションの会話の横に差分がインラインで表示されています。](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

**Changes** タブは、セッションが変更したすべてのファイルを一覧にし、差分をインラインで表示します。

## まとめと次のステップ

バックログを作成し、分離されたセッションで 1 つの Issue を実装して、差分をレビューしました。[レッスン 7: 編集前の計画][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
