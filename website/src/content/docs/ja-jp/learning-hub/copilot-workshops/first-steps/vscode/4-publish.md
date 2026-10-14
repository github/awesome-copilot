---
title: "レッスン 4 - プロジェクトの公開"
description: "VS Code に組み込まれた Source Control の統合機能だけを使い、Space Quiz を初期化、コミット、公開します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

組み込みの Git 統合機能だけを使い、テスト済みのクイズを GitHub に公開します。実際の変更内容に基づいて、Copilot にコミットメッセージの下書きを作成してもらいます。

このレッスンでは、次の内容を学習します。

- **Source Control** からリポジトリを初期化する。
- ステージングされた差分からコミットメッセージを生成する。
- 新しい GitHub のパブリックリポジトリにブランチを公開する。

## 初期化、コミット、公開

1. **Source Control** を開き、**Initialize Repository** を選択します。
2. ファイルをステージングします。
3. コミットメッセージ欄の**きらめき付きの鉛筆**アイコンを選択し、ステージングされた差分から Copilot にメッセージを書いてもらいます。メッセージを読み、誤りがあれば編集してからコミットします。
4. **Publish Branch** を選択し、GitHub にパブリックの `space-quiz` リポジトリを作成します。
5. テスト済みのファイルが GitHub にあることを確認します。

![VS Code の Source Control ビューの図。Changes 一覧に index.html と .github/copilot-instructions.md が表示されています。コミットメッセージ欄のきらめきボタンを指す注記には Copilot wrote your message とあり、メッセージには Add per-question timer to the quiz と表示されています。Commit ボタンの下で Create Pull Request ボタンが強調され、Commit first, then this button appears right inside Source Control と注記されています。](/images/learning-hub/copilot-workshops/first-steps-vscode-commit.svg)

きらめきボタンは、ステージングされた差分からコミットメッセージの下書きを作成します。コミットすると、**Source Control** からプルリクエストの作成も提案されます。

## まとめと次のステップ

テスト済みのクイズを GitHub に公開しました。[レッスン 5: 編集前の計画][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
