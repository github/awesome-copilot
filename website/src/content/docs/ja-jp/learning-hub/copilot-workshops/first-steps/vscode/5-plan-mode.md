---
title: "レッスン 5 - 編集前の計画"
description: "Copilot Chat を Plan モードに切り替え、ファイルを編集する前にワークスペースを調査してアプローチを提案してもらいます。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Plan モードは、ファイルを変更せずにワークスペースを調査し、実装計画を書きます。

このレッスンでは、次の内容を学習します。

- Copilot Chat を Agent から Plan に切り替える。
- 提案された計画をレビューして改善する。
- Agent に戻して計画を実装する。

## 編集前にアプローチに合意する

1. Copilot Chat を開き、入力欄の上にある**モードのドロップダウン**を使います。
2. **Agent** から **Plan** に切り替えます。
3. 次のプロンプトで次の機能を説明し、Copilot にワークスペースを調査してもらいます。

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. 計画を読み、変更を依頼してから、**Agent** に戻して実装します。

> [!TIP]
> **計画モードが役立つ場面**
>
> 曖昧な作業、複数箇所にまたがる作業、元に戻すコストが高い作業には Plan モードを使います。不適切なアプローチを最も低いコストで修正できるのは、最初の編集を行う前です。

## まとめと次のステップ

Copilot がコードを書く前に、アプローチに合意しました。[レッスン 6: Copilot に GitHub を扱うツールを提供する][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
