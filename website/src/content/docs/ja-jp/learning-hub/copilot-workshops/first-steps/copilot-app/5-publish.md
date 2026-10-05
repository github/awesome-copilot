---
title: "レッスン 5 - プロジェクトの公開"
description: "ローカルで試作した Space Quiz を GitHub のパブリックリポジトリにします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Space Quiz を公開して、Issue を管理し、分離された worktree を使い、プルリクエストのワークフローを完了できるようにします。

このレッスンでは、次の内容を学習します。

- フォルダーを Git リポジトリとして初期化する。
- GitHub のパブリックリポジトリを作成してプッシュする。
- Copilot app でプロジェクトを GitHub にリンクする。

## リポジトリを公開する

次のプロンプトを送信します。

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch. Refresh the project within this app so the GitHub project is linked.
```

> [!WARNING]
> エージェントは、リポジトリの作成やコードのプッシュの前に確認を求めます。承認する前に、提案された操作とその対象をレビューしてください。

エージェントの作業が完了したら、次を行います。

1. GitHub で新しいリポジトリを開きます。
2. `index.html` があることを確認します。
3. Copilot app に戻り、プロジェクトがリポジトリにリンクされていることを確認します。

## まとめと次のステップ

プロジェクトが GitHub リポジトリになりました。[レッスン 6: Issue とセッションの活用][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
