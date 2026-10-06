---
title: "레슨 4 - 이슈를 병렬로 작업하기"
description: "백로그를 만들고, 사이드 패널에서 채팅에 이슈를 추가하고, /diff로 변경 사항을 검토하고, 별도의 워크트리에서 두 번째 세션을 시작합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

터미널에서 백로그와 구현 사이클을 관리하고, 독립적인 작업을 위해 별도의 세션을 엽니다.

이 레슨에서는 다음 작업을 수행합니다.

- 범위가 명확한 GitHub 이슈 3개를 만듭니다.
- 사이드 패널에서 채팅에 이슈를 추가하고 구현합니다.
- `/diff`로 변경 사항을 검토합니다.
- 격리된 워크트리(Worktree)에서 두 번째 세션을 시작합니다.

## 백로그 만들기

다음 프롬프트를 보냅니다.

```plaintext
Review the space quiz and create three focused GitHub issues with clear titles, user-focused descriptions, and acceptance criteria. Do not implement them yet.
```

## 현재 세션에서 첫 번째 이슈 작업하기

1. <kbd>Left arrow</kbd> 키를 눌러 사이드 패널을 연 다음 <kbd>Tab</kbd>을 눌러 **Issues** 탭으로 이동합니다.
2. 첫 번째 이슈를 강조 표시하고 <kbd>c</kbd>를 눌러 채팅에 컨텍스트로 추가합니다. 먼저 전체 이슈를 읽으려면 대신 <kbd>Enter</kbd>를 누릅니다.
3. 에이전트에 이슈 구현을 요청합니다.

![터미널에 표시된 Copilot CLI 사이드 패널 일러스트레이션. Current, Sessions, Issues, Pull requests, Gists 탭 중 Issues 탭이 선택되어 있습니다. space-quiz 리포지토리의 열린 이슈 검색 필터에 Add a score screen at the end of the quiz라는 이슈 하나가 표시됩니다. 안내에는 Left arrow 키로 패널을 열고 Tab으로 탭 사이를 이동한다고 설명되어 있으며, 맨 아래에는 검색용 슬래시, 세부 정보용 Enter, 열기용 o, 워크트리용 w, 채팅용 c, 전체 보기용 a 키가 나열되어 있습니다.](/images/learning-hub/copilot-workshops/first-steps-cli-side-panel.svg)

사이드 패널의 맨 위에는 모든 탭이 나열되어 있으며, 맨 아래의 안내에는 강조 표시된 항목에 작업을 수행하는 키가 표시됩니다.

## `/diff`로 변경 사항 검토하기

프로젝트를 게시했으므로 정상 동작이 확인된 버전을 비교 기준으로 사용할 수 있습니다. `/diff`는 그 버전에서 이 이슈로 인해 달라진 내용을 정확히 보여 줍니다. 바로 이 내용을 다른 사람에게 검토하도록 요청하게 됩니다.

1. `/diff`를 실행하고 변경된 모든 파일을 읽습니다.
2. 잘못된 부분이 있으면 수정을 요청한 다음 `/diff`를 다시 실행합니다.
3. Git을 직접 살펴보고 싶을 때마다 `!git status` 또는 `!git diff`를 실행합니다.

## 두 번째 이슈를 병렬로 작업하기

1. 사이드 패널을 다시 열고 **Sessions** 탭으로 전환합니다.
2. 첫 번째 세션을 유지하면서 두 번째 이슈를 위한 다른 세션을 시작합니다.
3. 새 세션에서 `/worktree`를 실행하여 현재 위치에서 브랜치를 만드는 대신 격리된 워크트리를 사용하게 합니다. 이제 두 세션이 서로 간섭하지 않고 동시에 실행될 수 있습니다.
4. <kbd>c</kbd>로 해당 세션에 두 번째 이슈를 추가합니다.
5. 지금은 세션을 이 상태로 둡니다. 다음 레슨에서는 코드를 작성하기 전에 이 이슈의 계획을 세웁니다.

![Copilot CLI에서 /worktree를 실행한 뒤의 출력 일러스트레이션. issue-13-review-screen 브랜치에 ../space-quiz-13 워크트리를 만들었으며, main은 변경하지 않고 현재 세션이 그곳에서 작업한다고 보고합니다.](/images/learning-hub/copilot-workshops/first-steps-cli-worktree.svg)

`/worktree`는 세션을 별도 브랜치의 별도 체크아웃으로 옮기므로 첫 번째 세션은 방해받지 않고 계속 작업합니다.

## 요약 및 다음 단계

첫 번째 이슈를 구현하고, `/diff`로 검토하고, 별도의 워크트리에서 두 번째 세션을 시작했습니다. [레슨 5: 편집 전에 계획하기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
