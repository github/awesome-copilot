---
title: "レッスン 2 - プロジェクトの指示の記録"
description: "Copilot Chat で /init を実行して Space Quiz 用の .github/copilot-instructions.md を生成し、調整します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

ワークスペースに動作するクイズができたので、実際のプロジェクトを説明するリポジトリのカスタム指示を生成します。Copilot は、チャットのリクエストごとにこれらの指示を読みます。

このレッスンでは、次の内容を学習します。

- `/init` でリポジトリのカスタム指示を生成する。
- `.github/copilot-instructions.md` を保存する前にレビューする。
- 指示を整理し、自分に合わせて調整する。

## `/init` でルールを記録する

1. Copilot Chat で `/init` を実行します。
2. 生成された `.github/copilot-instructions.md` ファイルを保存する前にレビューします。
3. このプロジェクトに合う指示だけを残します。単一ファイルであること、依存関係がないこと、アクセシブルであること、ブラウザーでテストすることが該当します。

![VS Code のエディターで .github/copilot-instructions.md を開き、Explorer で index.html の隣にある同ファイルを選択した図。Space Quiz というタイトルのファイルには、依存関係もビルド手順もない単一の index.html、すべての回答にキーボードで到達できること、両方のテーマで prefers-color-scheme を尊重することがルールとして記載されています。How I like code written セクションでは、小さな関数、早期リターン、技巧的なワンライナーを使わないこと、本当に意外な点にだけコメントを書くことを求めています。](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

リポジトリのカスタム指示は `.github/copilot-instructions.md` に保存され、チャットのすべてのリクエストに適用されます。

> [!IMPORTANT]
> **順序が重要です**
>
> `/init` は、現時点のワークスペースを読み取ります。クイズを構築した後に実行すると、実際のコードに基づく指示が生成されます。

## 自分の作業方法に合わせる

指示ファイルには、プロジェクトに関する事実だけでなく、毎回プロンプトで繰り返すような具体的な方針も追加します。たとえば、好みのコードの書き方、命名規則、避けたいライブラリ、コメントをどの程度書いてほしいかなどです。今後のすべてのセッションは、プロンプトを読む前にこのファイルを読みます。

## まとめと次のステップ

ワークスペースに、実際のコードに基づくカスタム指示が加わりました。[レッスン 3: コンテキストの確認とテスト][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
