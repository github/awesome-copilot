---
title: "レッスン 2 - クイズの構築と仕上げ"
description: "単一ファイルの Space Quiz を構築し、統合ブラウザーと要素ピッカーで改善します。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

1 つの詳細なプロンプトで Space Quiz を構築し、統合ブラウザーで動作を確認して、要素ピッカーで見た目を改善します。

このレッスンでは、次の内容を学習します。

- 依存関係のないクイズを `index.html` に作成する。
- 統合ブラウザーでクイズをテストする。
- 生成されたコードを確認する。
- アクセシビリティを維持しながら、選択した要素を改善する。

## クイズの構築

`space-quiz` セッションで次のプロンプトを送信します。

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

エージェントの作業が完了したら、数問に回答し、次を確認します。

- 進行状況バーが進む。
- スコアが更新される。
- 正解すると緑色の状態が表示される。
- 不正解では赤色で揺れるアニメーションが表示される。
- 最後の質問の後に結果画面が表示される。

## 生成されたコードを確認する

左側のサイドバーと右側のブラウザーパネルを折りたたみ、広がったコード領域で `index.html` をレビューします。HTML、CSS、JavaScript が 1 つのファイル内でどのように連携しているかを確認します。完了したら、両方のパネルを元に戻します。

## 要素ピッカーで仕上げる

1. ブラウザーのツールバーで要素ピッカーを選択します。
2. クイズの見出しまたは回答領域を選択します。
3. 次のプロンプトを送信します。

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. 統合ブラウザーが更新される様子を見て、変更を確認します。

## オプションの改善

さらに試したい場合は、エージェントに次を依頼します。

- `prefers-reduced-motion` に対応した、控えめな星空の背景を追加する。
- スコアが 8 以上の場合、結果画面をより祝福感のあるものにする。
- キーボードのフォーカス状態を改善し、その後マウスを使わずにクイズを確認する。

## まとめと次のステップ

Space Quiz を構築し、コードを確認して改善しました。[レッスン 3: セッションの確認とクイズのテスト][next-lesson]に進みます。

[next-lesson]: /ja-jp/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
