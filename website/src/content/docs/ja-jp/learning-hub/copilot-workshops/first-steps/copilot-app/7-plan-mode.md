---
title: "レッスン 7 - 編集前の計画"
description: "2 つ目の Issue で Plan モードを使い、ファイルを変更する前にエージェントにプロジェクトを調査し、アプローチを提案してもらいます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

どの Issue でも編集から始めるべきとは限りません。Plan モードは、プロジェクトを調査してアプローチを提案し、コードを変更する前に承認を待ちます。

このレッスンでは、次の内容を学習します。

- 2 つ目の Issue 用に Plan モードでセッションを開始する。
- エージェントが提案した計画をレビューして改善する。
- 計画を承認し、セッションをどのように続けるかを選ぶ。

## コードを変更する前にアプローチに合意する

1. **Issues** から **2 つ目の Issue** を開き、**New session** を選択します。
2. セッションの設定で、**Interactive** や **Autopilot** ではなく **Plan** を選びます。
3. 次のプロンプトを送信し、ファイルを変更せずにエージェントに調査してもらいます。

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 提案された計画を読み、不足があれば変更を依頼します。
5. 計画を承認します。
6. 確認を求められたら、セッションを **Interactive** と **Autopilot** のどちらのモードで続けるかを選びます。

> [!TIP]
> **Plan モードが役立つ場面**
>
> 曖昧な作業、複数箇所にまたがる作業、元に戻すコストが高い作業には Plan モードを使います。不適切なアプローチを最も低いコストで修正できるのは、最初の編集を行う前です。

## まとめと次のステップ

エージェントがコードを書く前に、アプローチに合意しました。[レッスン 8: Copilot のレビューの流れの完了][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
