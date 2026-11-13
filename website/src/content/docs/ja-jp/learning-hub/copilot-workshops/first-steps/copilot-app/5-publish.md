---
title: "レッスン 5 - プロジェクトの公開"
description: "ローカルで試作した Space Quiz を GitHub のパブリックリポジトリにします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-08
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
> 承認設定によって、リポジトリの作成やコードのプッシュの前にエージェントが確認を求める場合と、操作が自動で承認される場合があります。**Approve all** では、個別の確認プロンプトが表示されるとは限りません。公開用のプロンプトを送信する前に、設定、依頼する操作、その対象をレビューしてください。

エージェントの作業が完了したら、次を行います。

1. GitHub で新しいリポジトリを開きます。
2. `index.html` があることを確認します。
3. Copilot app に戻り、プロジェクトがリポジトリにリンクされていることを確認します。

## まとめと次のステップ

プロジェクトが GitHub リポジトリになりました。[レッスン 6: Issue とセッションの活用][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
