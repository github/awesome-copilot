---
title: "レッスン 8 - レビューとマージ"
description: "Source Control からプルリクエストを作成し、Copilot にコードレビューを依頼して GitHub のツールでフィードバックに対応し、マージします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

VS Code の GitHub ツールで、新しい作業を確認し、レビューしてマージします。

このレッスンでは、次の内容を学習します。

- 新しい作業をコミットし、**Source Control** からプルリクエストを作成する。
- Copilot にコードレビューを依頼する。
- GitHub MCP でフィードバックと失敗したチェックに対応する。
- プルリクエストをマージする。

## 確認、レビュー、マージ

1. 何かを作成する前に **Source Control** を開き、変更されたファイルと差分を確認します。
2. もう一度**きらめき**ボタンでメッセージを書いてもらい、新しい作業をコミットします。
3. **Source Control** に表示される **Create Pull Request** ボタンを選択します。Copilot がコミットに基づいてタイトルと説明の下書きを作成するため、何もない状態から依頼するよりもよいプルリクエストになります。
4. プルリクエストの作成時、VS Code の **GitHub** ビュー、または GitHub で、**Copilot code review** を依頼します。
5. GitHub MCP を使って、プルリクエストの確認、マージ競合の解決、レビューコメントへの対応、失敗した CI チェックの調査を Copilot に依頼します。
6. 統合ブラウザーで再テストし、提案されたすべての変更をレビューして、ブランチを更新します。
7. チェックとレビューが完了したら、エージェントにマージを依頼するか、GitHub の統合機能からマージします。

> [!NOTE]
> いつでも、代わりにチャットで Copilot にこれらの作業を依頼できます。まず **Source Control** の操作を学ぶ価値があるのは、実際の変更内容からコミットとプルリクエストの文章を書いてくれるためです。

## まとめと次のステップ

VS Code を離れずにプルリクエストをレビューしてマージしました。[レッスン 9: 次のアイデアをクラウドセッションに任せる][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/9-cloud-session/
