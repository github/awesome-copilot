---
title: "Lesson 2 - 첫 번째 에이전트 세션 실행"
description: "GitHub Copilot app에서 첫 번째 에이전트 세션을 시작하고 게임 카드를 조금 변경한 다음 첫 번째 끌어오기 요청으로 병합합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

이전 레슨에서는 워크스페이스를 살펴보고 빠른 채팅을 사용했습니다. 이제 **에이전트 세션**을 시작하고 프로젝트를 처음으로 변경합니다. 변경 범위는 작게 유지합니다. 게임 데이터에는 이미 별점이 있지만 홈페이지의 게임 카드에는 아직 표시되지 않습니다. 에이전트에게 별점을 표시하도록 요청하고, 변경 내용을 검토하고, 첫 번째 끌어오기 요청으로 병합합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 에이전트 세션을 시작하고 세션의 구조를 알아봅니다.
- 에이전트에게 프로젝트를 작고 구체적으로 변경하도록 요청합니다.
- 워크스페이스의 diff 보기에서 변경 내용을 검토합니다.
- 앱을 로컬에서 실행하여 브라우저에서 변경 내용을 확인합니다.
- 첫 번째 끌어오기 요청을 열고 병합합니다.

## 시나리오

Tailspin Toys의 각 게임에는 별점이 있을 수 있으며, 별점은 이미 게임 세부 정보 페이지에 표시됩니다. 하지만 홈페이지의 게임 카드에는 제목, 카테고리, 퍼블리셔, 설명만 표시됩니다. 첫 세션 연습으로 에이전트에게 각 카드에 기존 별점을 표시하도록 요청합니다. 첫 번째 세션에 적합한 작고 독립적인 변경입니다.

## 세션 구조

**세션**은 격리된 자체 워크스페이스에서 실행되는 에이전트와의 대화입니다. 모든 세션에는 **전용 git 작업 트리와 브랜치**가 제공됩니다. 따라서 변경 내용이 충돌하지 않게 한 세션에서는 기능을 추가하고 다른 세션에서는 버그를 수정하는 등 여러 세션을 동시에 실행할 수 있습니다. 세션은 사이드바에서 리포지토리별로 그룹화되며, 원하는 세션을 선택하여 전환할 수 있습니다.

세션 안에는 에이전트와의 **대화**, 에이전트가 파일을 탐색하고 편집할 때의 **도구 활동**, diff와 함께 표시되는 **변경된 파일** 목록이 있습니다.

## 세션을 시작하고 변경 요청하기

새 세션을 시작하여 프로젝트를 탐색하고 기능을 구현합니다. [이전 레슨][prior-lesson]에서 GitHub 리포지토리의 프로젝트를 추가했습니다. 해당 리포지토리에 새 세션을 만들고 변경을 요청합니다.

1. GitHub Copilot app으로 돌아가거나 앱을 엽니다.
2. **Home screen**을 선택합니다.
3. 리포지토리로 `tailspin-toys`가 선택되어 있는지 확인합니다.

   ![리포지토리 선택기가 tailspin-toys로 설정되고 프롬프트 아래에 모델 선택기가 표시된 GitHub Copilot app 프롬프트 상자](/images/learning-hub/copilot-workshops/app-2-start-session.png)

4. 다음 프롬프트를 사용하여 변경을 요청합니다.

   ```plaintext
   On the game cards, show each game's star rating. The Game type already includes a starRating field — it's a number out of 5, or null when a game hasn't been rated yet. Display it on each card in src/components/GameCard.astro, and when starRating is null show "No rating yet" instead. Keep the change small and don't restructure the card layout.
   ```

> [!NOTE]
> 프롬프트에 Copilot이 업데이트할 파일 이름을 포함했습니다. Copilot이 작업에 포함할 파일을 반드시 지정할 필요는 없지만, 방향을 제시하면 Copilot이 코드를 더 빠르게 생성하고 토큰 사용량을 줄이는 데 도움이 됩니다.

5. <kbd>Enter</kbd>를 선택하여 Copilot에 프롬프트를 보냅니다.

Copilot app은 먼저 프로젝트의 격리된 복사본인 새 작업 트리를 만들고 작업을 시작합니다. 그런 다음 프로젝트를 탐색하고 새 기능을 추가하기 위해 업데이트해야 할 파일을 찾은 후 필요한 코드를 만듭니다. 이제 Copilot app으로 새 기능을 추가했습니다.

## diff 검토

AI가 생성한 모든 변경 내용은 작더라도 병합하기 전에 검토해야 합니다. Copilot app에서 바로 변경 내용을 살펴봅니다.

1. 앱 오른쪽 위에서 **Toggle review panel**을 선택합니다. Copilot이 적용한 보류 중인 모든 변경 내용을 보여 주는 diff 화면이 열립니다.

   ![Create PR 오른쪽의 Toggle review panel 버튼을 화살표로 가리키는 GitHub Copilot app 위쪽 도구 모음](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. 게임 세부 정보를 표시하는 핵심 파일인 `GameCard.astro`에 코드가 추가된 것을 확인합니다. 다음 코드와 비슷해야 합니다. 별점이 있으면 표시하고 `starRating`이 `null`이면 "No rating yet"으로 대체하는 작은 블록입니다.

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
> 모든 생성형 AI 도구와 마찬가지로 Copilot은 결정론적이 아니라 확률적으로 작동하므로 정확한 코드는 위 예제와 다를 수 있지만 대체로 비슷해야 합니다.

## 변경 내용 확인

코드를 읽고 작동한다고 가정해서는 안 됩니다. 모든 내용을 시각적으로 테스트해야 합니다. 터미널에서 앱을 시작한 다음 모든 기능이 작동하는지 확인합니다. Copilot app에는 터미널이 기본 제공됩니다.

1. Copilot app 오른쪽의 검토 패널에서 **Terminal**을 선택합니다. **Terminal** 버튼이 없으면 **+**(**Open in panel** 레이블)를 선택한 다음 **Terminal**을 선택합니다.

   ![GitHub Copilot app 검토 패널의 Terminal 버튼](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

2. 터미널 창에 다음 명령을 입력하여 웹앱의 개발 서버를 시작합니다.

   ```shell
   npm run dev
   ```

3. 서버가 시작되면 브라우저 창을 엽니다. 잠시만 기다리면 됩니다.
4. [http://localhost:4321](http://localhost:4321)로 이동합니다.
5. 이제 랜딩 페이지의 모든 게임에 별점이 표시되어야 합니다.
6. 터미널 창으로 돌아갑니다.
7. <kbd>Ctrl</kbd>+<kbd>C</kbd>를 선택하여 개발 서버를 중지합니다.

## 첫 번째 끌어오기 요청 열기 및 병합

변경 내용이 올바르게 작동하므로 이제 제공할 차례입니다. 에이전트에게 끌어오기 요청을 열도록 요청한 다음 github.com에서 직접 검토하고 병합합니다. 지금은 이 과정을 수동으로 관리합니다. 이후 레슨에서는 Copilot이 일부 작업을 자동으로 처리하는 방법을 살펴봅니다.

1. 오른쪽 위에서 **Create PR**을 선택합니다.
2. 메시지가 표시되면 **Sign in with your browser**를 선택하고 안내에 따라 인증합니다.
3. Copilot이 PR을 만들기 시작합니다.

PR이 만들어지면 Copilot은 리포지토리에서 실행해야 하는 워크플로를 모니터링합니다. 잠시 후 오른쪽 위의 버튼이 **Ready to merge**로 바뀝니다. 이는 PR을 병합할 준비가 되었다는 표시입니다.

4. 채팅 바로 위의 **PR** 버블을 선택하여 검토 창에서 PR을 열고 끌어오기 요청을 확인합니다. 필요에 따라 여기에서 PR을 검토할 수 있습니다.
5. 준비가 되면 **Ready to merge**를 선택합니다.
6. 새 대화 상자에서 **Merge pull request**를 선택하여 끌어오기 요청을 병합합니다.

이제 웹사이트에 새 기능을 제공했습니다.

## 요약 및 다음 단계

첫 번째 에이전트 세션을 시작하고 첫 번째 변경을 제공했습니다. 구체적으로 다음 작업을 수행했습니다.

- 에이전트 세션을 시작하고 세션의 구조를 알아봤습니다.
- 에이전트에게 게임 카드를 작고 구체적으로 변경하도록 지시했습니다.
- 워크스페이스의 diff 보기에서 변경 내용을 검토했습니다.
- 앱을 로컬에서 실행하여 브라우저에서 별점을 확인했습니다.
- 끌어오기 요청을 열고 github.com에서 직접 병합했습니다.

다음으로 백로그의 이슈 중 하나에서 시작하여 앱으로 리포지토리에 사용자 지정 지침 표준을 추가합니다. [레슨 3 - 사용자 지정 지침으로 Copilot 안내][next-lesson]를 계속 진행합니다.

## 리소스

- [GitHub Copilot app에서 에이전트 세션 사용][agent-sessions]
- [GitHub Copilot app 정보][about-copilot-app]
- [GitHub Copilot app으로 이슈 및 끌어오기 요청 관리][managing-issues-prs]

[prior-lesson]: /ko-kr/learning-hub/copilot-workshops/app/1-install-copilot-app/#github-copilot-app-설치-및-구성
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/3-custom-instructions/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests