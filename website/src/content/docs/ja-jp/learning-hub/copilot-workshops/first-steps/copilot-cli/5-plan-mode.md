---
title: "レッスン 5 - 編集前の計画"
description: "/plan で 2 つ目のセッションを計画モードに切り替え、ファイルを編集する前にエージェントにアプローチを提案してもらいます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

すでに専用の worktree で 2 つ目のセッションが動作しています。そのセッションでは、いきなりコードを書かないようにします。計画モードは、ファイルを変更せずにプロジェクトを調査し、アプローチを提案します。

このレッスンでは、次の内容を学習します。

- 2 つ目のセッションを計画モードに切り替える。
- エージェントが提案した計画をレビューして改善する。
- 計画を承認し、セッションに実装してもらう。

## 編集前にアプローチに合意する

1. 前のレッスンで開いた **2 つ目のセッション**に切り替えます。
2. `/plan` を実行して、そのセッションを計画モードに切り替えます。
3. 次のプロンプトを送信し、何も編集せずにエージェントに調査してもらいます。

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 計画を読み、不足している点があれば修正を求め、その後で承認します。
5. セッションは、承認された計画を作業指示として実装に進みます。

> [!TIP]
> **計画モードが役立つ場面**
>
> 曖昧な作業、複数箇所にまたがる作業、元に戻すコストが高い作業には計画モードを使います。不適切なアプローチを最も低いコストで修正できるのは、最初の編集を行う前です。

## まとめと次のステップ

エージェントがコードを書く前に、アプローチに合意しました。[レッスン 6: エージェントが参照できる情報の把握][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
