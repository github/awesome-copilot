---
title: "레슨 2 - 별점 추가로 작은 성과 얻기"
description: "GitHub Copilot app에서 첫 번째 에이전트 세션을 시작하고 게임 카드를 조금 변경한 다음 첫 번째 끌어오기 요청으로 병합합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
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
2. **Projects** 옆의 **+**를 선택합니다.
3. 리포지토리로 `tailspin-toys`를 선택합니다.
4. 프롬프트 상자 아래에서 **new working tree**와 **Interactive** 모드를 선택합니다. 다음 프롬프트로 변경을 요청합니다.

    ```plaintext
    Show each game's starRating out of 5 in the game cards on the list page. If the rating is null, show "No rating yet". Keep the card layout as it is, add tests, and run the relevant checks.
    ```

5. <kbd>Enter</kbd>를 눌러 Copilot에 프롬프트를 보냅니다.

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

브라우저를 열기 전에 에이전트의 자동 검사 결과를 검토합니다. 숫자 `starRating`과 `null` 대체 표시를 테스트하는지 확인합니다. 누락된 필수 조건이나 건너뛴 검사는 통과가 아닙니다. 설치 요청이 있으면 검토한 후 승인합니다.

물론 코드만 읽고 작동한다고 가정해서는 안 됩니다. 업데이트된 UI를 살펴볼 수 있도록 Copilot에 웹사이트를 열어 달라고 요청합니다. 웹사이트를 시작하고 브라우저 캔버스에서 열도록 하면 됩니다.

> [!TIP]
> 캔버스는 Copilot app 안에서 바로 사용할 수 있는 대화형 위젯입니다. 이후 사용자 지정 캔버스를 살펴보고 직접 만들어 보겠지만, 지금은 기본 제공 브라우저 캔버스를 사용합니다.

1. 다음 프롬프트로 Copilot에 앱을 시작하고 브라우저 캔버스에서 페이지를 열도록 요청합니다.

    ```plaintext
    Start the app and open it in the browser canvas.
    ```

2. 잠시 후 앱이 시작되고 Copilot app 안에 브라우저 창이 열립니다.
3. 별점이 있는 게임 카드에 5점 만점의 값이 표시되는지 확인합니다.
4. 완료하면 다음 프롬프트로 이 세션에서 시작한 개발 서버를 중지하도록 Copilot에 요청합니다.

    ```plaintext
    Stop the dev server and close the browser canvas.
    ```

## 첫 번째 끌어오기 요청 열기 및 병합

이제 기능을 만들었습니다. 새 코드를 기존 코드베이스에 병합할 끌어오기 요청(PR)을 만듭니다.

1. 오른쪽 위의 **Create PR**을 선택합니다.
2. 메시지가 표시되면 **Sign in with your browser**를 선택하고 안내에 따라 인증합니다.
3. Copilot이 PR을 만들기 시작합니다.
4. 채팅 바로 위의 **PR** 버블을 선택하여 검토 창에서 PR을 열고 끌어오기 요청을 확인합니다. 필요에 따라 여기에서 PR을 검토할 수 있습니다.
5. 준비가 되면 **Ready to merge**를 선택합니다.
6. 새 대화 상자에서 **Merge pull request**를 선택하여 끌어오기 요청을 병합합니다.

## 요약 및 다음 단계

첫 번째 에이전트 세션을 시작하고 첫 번째 변경을 제공했습니다. 구체적으로 다음 작업을 수행했습니다.

- 에이전트 세션을 시작하고 세션의 구조를 알아봤습니다.
- 에이전트에게 게임 카드를 작고 구체적으로 변경하도록 지시했습니다.
- 워크스페이스의 diff 보기에서 변경 내용을 검토했습니다.
- 앱을 로컬에서 실행하여 브라우저에서 별점을 확인했습니다.
- PR 1을 만들고 검사를 검토한 다음 명시적으로 병합했습니다.

다음으로 [필터링 이슈에서 시작하여 Plan 및 Autopilot 모드][next-lesson]로 더 큰 기능을 구축합니다.

## 리소스

- [GitHub Copilot app에서 에이전트 세션 사용][agent-sessions]
- [GitHub Copilot app 정보][about-copilot-app]
- [GitHub Copilot app으로 이슈 및 끌어오기 요청 관리][managing-issues-prs]

[prior-lesson]: /ko-kr/learning-hub/copilot-workshops/app/1-install-copilot-app/#github-copilot-app-%EC%84%A4%EC%B9%98-%EB%B0%8F-%EA%B5%AC%EC%84%B1
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/3-agent-modes/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests