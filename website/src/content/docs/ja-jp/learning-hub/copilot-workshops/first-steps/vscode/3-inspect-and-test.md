---
title: "レッスン 3 - コンテキストの確認とテスト"
description: "Copilot Chat のリクエストに添付されたコンテキストを確認し、Git に変更を記録する前にブラウザーレベルのスモークテストを実行します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

公開する前に、Copilot が参照できる情報を確認し、クイズが動作することを確かめます。

このレッスンでは、次の内容を学習します。

- チャットのリクエストに含まれるコンテキストを確認する。
- ブラウザーレベルのスモークテストを実行する。
- Git の操作に進む前に、問題を修正する。

## 右下からコンテキストを確認する

VS Code は、Copilot Chat の入力欄の右下に、現在のコンテキストを表示します。

1. チャット入力欄の**右下**にあるコンテキストインジケーターを開きます。
2. リクエストに含まれるファイル、カスタム指示、シンボルを確認します。
3. 続ける前に、無関係なコンテキストを削除するか、クイズのファイルを添付します。

## Git に変更を記録する前に構築してテストする

リポジトリを初期化したり、何かをコミットしたりする前に、統合ブラウザーとスモークテスト用のプロンプトを使います。

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. スモークテストを実行し、統合ブラウザーを確認します。
2. 問題があれば修正し、すべて合格するまでテストを再実行します。
3. ビルドとテストが成功してから、Git の操作に進みます。

## まとめと次のステップ

Copilot が参照できる情報を確認し、公開前にクイズをテストしました。[レッスン 4: プロジェクトの公開][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
