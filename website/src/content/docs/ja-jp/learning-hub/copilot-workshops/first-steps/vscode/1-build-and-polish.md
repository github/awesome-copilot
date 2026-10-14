---
title: "レッスン 1 - ワークスペースでの構築"
description: "VS Code で Space Quiz を構築し、統合ブラウザーでプレビューして、選んだ要素を仕上げます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

エディター、チャット、ファイル、プレビューをまとめて使います。クイズを構築して統合ブラウザーで回答し、特定の要素を直接チャットに渡して、範囲を絞った変更を加えます。

このレッスンでは、次の内容を学習します。

- 単一の `index.html` にクイズを構築する。
- 統合ブラウザーでクイズをプレビューする。
- ブラウザーで要素を選択して仕上げる。

## クイズの構築

Copilot Chat で次のプロンプトを送信します。

```plaintext
Create a colorful, accessible space exploration quiz with 10 questions in a single index.html. Add a progress bar, score counter, animated correct and incorrect feedback, and a results screen. Use no server or dependencies. Open it in the VS Code integrated browser.
```

1. エディターで生成されたファイルをレビューします。
2. 統合ブラウザーを開き、数問に回答します。
3. 必要なときに **Source Control** を開き、変更されたファイルと差分を確認します。

## 要素を選んで仕上げる

統合ブラウザーは、特定の要素を直接チャットに渡せるため、どのボタンを指しているかを説明する必要がありません。

1. 統合ブラウザーでクイズを開いた状態で、ブラウザーのツールバーから要素の選択を開始します。
2. 回答ボタンを選択し、その要素を次のチャットメッセージに添付します。
3. 次のプロンプトを送信し、プレビューが再読み込みされる様子を確認します。

   ```plaintext
   Using the selected element, make the answer buttons feel more tactile: add a subtle press state, a clearer focus ring for keyboard users, and a smoother transition into the correct and incorrect colors. Change nothing else.
   ```

4. 変更を受け入れる前に、**Source Control** で差分を読みます。
5. <kbd>Tab</kbd> を押して回答間を移動し、フォーカスリングが見えることを確認します。

## まとめと次のステップ

エディターを離れずにクイズを構築し、プレビューして仕上げました。[レッスン 2: プロジェクトの指示の記録][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
