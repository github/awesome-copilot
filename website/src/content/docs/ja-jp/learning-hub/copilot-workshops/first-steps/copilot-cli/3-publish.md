---
title: "レッスン 3 - プロジェクトの公開"
description: "プロンプトまたは自分で実行するコマンドで、Space Quiz を初期化し、コミットして GitHub に公開します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

試作したプロジェクトを GitHub のパブリックリポジトリにします。1 つのプロンプトで依頼することも、自分でコマンドを実行することもできます。両方の方法を一度試すと、エージェントが代わりに何をしているかを正確に把握できます。

このレッスンでは、次の内容を学習します。

- Git リポジトリを初期化し、最初のコミットを作成する。
- GitHub のパブリックリポジトリを作成してプッシュする。
- コミットとファイルが反映されたことを確認する。

## 方法 A: エージェントに依頼する

次のプロンプトを送信します。

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

エージェントが確認を求めるたびに、Git と GitHub の各操作を承認します。

## 方法 B: 自分で実行する

各コマンドの先頭に `!` を付けてセッション内で実行するか、プレフィックスを付けずに自分のターミナルで実行します。

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

最後のコマンドは [GitHub CLI][gh-cli] を使用します。インストールしていない場合は GitHub でリポジトリを作成し、`!git remote add origin <url>` と `!git push -u origin main` を実行します。

## 結果を確認する

1. `!git log --oneline` を実行し、コミットが記録されたことを確認します。
2. GitHub でリポジトリを開き、`index.html` があることを確認します。

## まとめと次のステップ

プロジェクトが GitHub リポジトリになり、動作を確認済みのバージョンと比較できるようになりました。[レッスン 4: Issue の並行作業][next-lesson]に進みます。

[gh-cli]: https://cli.github.com/
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
