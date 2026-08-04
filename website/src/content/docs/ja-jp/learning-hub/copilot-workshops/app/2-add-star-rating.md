---
title: "レッスン 2 - 最初のエージェントセッションの実行"
description: "GitHub Copilot app で最初のエージェントセッションを開始し、ゲームカードに小さな変更を加えて、最初の pull request としてマージします。"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

前のレッスンでは、ワークスペースを確認し、クイックチャットを使いました。ここでは、**エージェントセッション**を開始し、プロジェクトに最初の変更を加えます。変更は小規模なものにします。ゲームのデータにはすでに星評価が含まれていますが、ホームページのゲームカードにはまだ表示されていません。エージェントに表示を依頼し、変更をレビューして、最初の pull request としてマージします。

このレッスンでは、次の内容を学習します。

- エージェントセッションを開始し、セッションの構成を理解する。
- プロジェクトに小規模で対象を絞った変更を加えるようエージェントに依頼する。
- ワークスペースの差分ビューで変更をレビューする。
- アプリをローカルで実行し、ブラウザーで変更を確認する。
- 最初の pull request を作成してマージする。

## シナリオ

Tailspin Toys の各ゲームには星評価を設定でき、ゲーム詳細ページにはすでに表示されています。一方、ホームページのゲームカードには、タイトル、カテゴリー、パブリッシャー、説明だけが表示されています。最初のセッションの準備運動として、各カードに既存の評価を表示するようエージェントに依頼します。小規模で自己完結した、最初のセッションに最適な変更です。

## セッションの構造

**セッション**とは、分離された独自のワークスペースで実行されるエージェントとの会話です。すべてのセッションに**専用の git worktree とブランチ**が割り当てられます。そのため、一方では機能を追加し、もう一方ではバグを修正するなど、変更を競合させずに複数のセッションを同時に実行できます。セッションはリポジトリごとにグループ化されてサイドバーに表示され、選択すると切り替えられます。

セッション内には、エージェントとの**会話**、ファイルを調査および編集するときのエージェントの**ツールアクティビティ**、差分付きの**変更済みファイル**一覧という3つの要素が表示されます。

## セッションを開始して変更を依頼する

新しいセッションを開始し、プロジェクトの調査と機能の実装に取りかかります。[前のレッスン][prior-lesson]では、GitHub リポジトリからプロジェクトを追加しました。そのリポジトリ用の新しいセッションを作成し、変更を依頼します。

1. GitHub Copilot app に戻ります。アプリを閉じている場合は開きます。
2. **Home screen** を選択します。
3. リポジトリに `tailspin-toys` が選択されていることを確認します。

   ![リポジトリセレクターに tailspin-toys が設定され、プロンプトの下にモデルセレクターが表示された GitHub Copilot app のプロンプトボックス](/images/learning-hub/copilot-workshops/app-2-start-session.png)

4. 次のプロンプトを使って変更を依頼します。

   ```plaintext
   On the game cards, show each game's star rating. The Game type already includes a starRating field — it's a number out of 5, or null when a game hasn't been rated yet. Display it on each card in src/components/GameCard.astro, and when starRating is null show "No rating yet" instead. Keep the change small and don't restructure the card layout.
   ```

> [!NOTE]
> プロンプトに、Copilot が更新するファイル名が含まれていることに注目してください。Copilot が作業に含めるファイルを指定する必要はありませんが、方向性を示すことで、コードをすばやく生成し、トークン使用量を削減できます。

5. <kbd>Enter</kbd> を選択して、プロンプトを Copilot に送信します。

Copilot app は、最初にプロジェクトの分離されたコピーである新しい worktree を作成して作業を開始します。次にプロジェクトを調査し、新機能の追加に必要な更新対象ファイルを見つけて、必要なコードを作成します。これで Copilot app を使って新機能を追加できました。

## 差分をレビューする

AI が生成したすべての変更は、どれほど小さくてもマージ前にレビューする必要があります。Copilot app 内で変更を確認します。

1. アプリの右上隅にある **Toggle review panel** を選択します。Copilot が行った未処理の変更がすべて表示される差分画面が開きます。

   ![Create PR の右側にある Toggle review panel ボタンを矢印で示した GitHub Copilot app の上部ツールバー](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. ゲームの詳細表示に使用される中心的なファイル `GameCard.astro` にコードが追加されていることを確認します。次のような小さなブロックが追加されているはずです。評価がある場合は表示し、`starRating` が `null` の場合は "No rating yet" を表示します。

   ```astro
   {game.starRating !== null ? (
       <span class="text-xs font-medium px-2.5 py-0.5 rounded bg-amber-900/60 text-amber-300" data-testid="game-rating">
           ★ {game.starRating} / 5
       </span>
   ) : (
       <span class="text-xs font-medium text-slate-500" data-testid="game-rating-empty">
           No rating yet
       </span>
   )}
   ```

> [!NOTE]
> Copilot は、すべての生成 AI ツールと同様に決定論的ではなく確率的に動作するため、実際のコードは上記と異なる場合があります。ただし、比較的よく似たものになります。

## 変更を確認する

コードを読むだけで動作すると判断せず、視覚的にもテストします。そのためには、ターミナルからアプリを起動して、すべてが動作することを確認する必要があります。Copilot app にはターミナルが組み込まれています。

1. Copilot app の右側にあるレビューパネルで **Terminal** を選択します。**Terminal** ボタンがない場合は、**+** (**Open in panel** というラベルが付いています) を選択してから **Terminal** を選択します。

   ![GitHub Copilot app のレビューパネルにある Terminal ボタン](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

2. ターミナルウィンドウに次のコマンドを入力し、Web アプリの開発サーバーを起動します。

   ```shell
   npm run dev
   ```

3. サーバーが起動したら、ブラウザーウィンドウを開きます。起動には少し時間がかかります。
4. http://localhost:4321 に移動します。
5. ランディングページのすべてのゲームに星評価が表示されていることを確認します。
6. ターミナルウィンドウに戻ります。
7. <kbd>Ctrl</kbd>+<kbd>C</kbd> を選択して開発サーバーを停止します。

## 最初の pull request を作成してマージする

変更に問題がないことを確認できたので、リリースします。エージェントに pull request の作成を依頼し、github.com で自分でレビューしてマージします。今回は手動で管理します。後のレッスンでは、Copilot でこの作業の一部を自動的に処理する方法を確認します。

1. 右上隅にある **Create PR** を選択します。
2. 求められた場合は **Sign in with your browser** を選択し、画面の指示に従って認証します。
3. Copilot が PR の作成を開始します。

PR が作成されると、Copilot はリポジトリで実行する必要があるワークフローを監視します。しばらくすると、右上のボタンが **Ready to merge** に変わります。これは PR をマージする準備が整ったことを示します。

4. チャットのすぐ上にある **PR** バブルを選択し、レビューペインで PR を開いて pull request を確認します。必要に応じて、ここで PR をレビューできます。
5. 準備ができたら **Ready to merge** を選択します。
6. 新しいダイアログウィンドウで **Merge pull request** を選択し、pull request をマージします。

これで Web サイトに新機能を反映できました。

## まとめと次のステップ

最初のエージェントセッションを開始し、最初の変更をリリースしました。具体的には、次の作業を行いました。

- エージェントセッションを開始し、セッションの構成を学習した。
- ゲームカードに小規模で対象を絞った変更を加えるようエージェントに指示した。
- ワークスペースの差分ビューで変更をレビューした。
- アプリをローカルで実行し、ブラウザーで星評価を確認した。
- pull request を作成し、github.com で自分でマージした。

次は、アプリを使ってリポジトリにカスタム指示の標準を追加します。バックログ内の Issue の1つから作業を開始します。[レッスン 3「カスタム指示による Copilot のガイド」][next-lesson]に進んでください。

## リソース

- [GitHub Copilot app でのエージェントセッションの操作][agent-sessions]
- [GitHub Copilot app について][about-copilot-app]
- [GitHub Copilot app での Issue と pull request の管理][managing-issues-prs]

[prior-lesson]: /ja-jp/learning-hub/copilot-workshops/app/1-install-copilot-app/#github-copilot-app-をインストールして構成する
[next-lesson]: /ja-jp/learning-hub/copilot-workshops/app/3-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests