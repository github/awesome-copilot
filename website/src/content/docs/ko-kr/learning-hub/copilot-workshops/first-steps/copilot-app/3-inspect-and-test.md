---
title: "레슨 3 - 세션 살펴보기 및 퀴즈 테스트"
description: "세션의 프로젝트 및 사용량 세부 정보를 확인한 다음, Git에 기록하기 전에 브라우저 수준의 스모크 테스트를 실행합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

이제 세션에서 실제 작업을 수행했으므로 살펴볼 내용이 있습니다. 에이전트의 작업 대상을 확인한 다음, 통합 브라우저에서 퀴즈를 조작하고 의도한 결과가 아니라 실제로 일어난 결과를 보고하게 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 제목 메뉴에서 프로젝트 및 세션 컨트롤을 검토합니다.
- 사용량 메뉴에서 플랜, 세션 사용량, 토큰 및 컨텍스트를 확인합니다.
- 브라우저 수준의 스모크 테스트(Smoke test)를 실행하고 실패한 부분을 수정합니다.

## 프로젝트 세부 정보 검토하기

제목 표시줄에서 **Build a space quiz**를 선택하여 프로젝트 및 세션 메뉴를 엽니다.

![Build a space quiz 제목 메뉴 일러스트레이션. space-quiz 프로젝트의 폴더 세션을 식별하고 경로, 원격 제어, 이름, 중첩 세션, 세션 ID, 공유, 보관 및 삭제 컨트롤을 제공합니다.](/images/learning-hub/copilot-workshops/first-steps-app-project-details.svg)

이 메뉴는 세션에서 작업 중인 프로젝트를 식별하고 세션 관리 컨트롤을 제공합니다.

1. 폴더 세션이 `space-quiz` 프로젝트용인지 확인합니다.
2. **Path**를 선택하여 세션이 예상한 폴더에서 작업 중인지 확인합니다.
3. 원격 제어, 이름 변경, 중첩 세션, 공유, 보관 및 삭제 컨트롤을 확인합니다.

## 사용량 세부 정보 검토하기

**Send** 옆의 사용량 컨트롤을 선택하여 플랜 및 세션 사용량 메뉴를 엽니다.

![Send 버튼 옆의 사용량 메뉴 일러스트레이션. GitHub Copilot Pro+ 플랜, 세션 AI 크레딧, 입력 및 출력 토큰 수, 40만 토큰 중 16%의 컨텍스트 사용량이 표시되어 있습니다.](/images/learning-hub/copilot-workshops/first-steps-app-usage-details.svg)

이 메뉴는 계정 및 세션 사용량을 프로젝트 컨트롤과 구분하여 표시합니다.

- **Plan**에는 해당 정보를 사용할 수 있는 경우 플랜 수준 사용량이 표시됩니다.
- **Session**에는 현재 세션에서 사용한 AI 크레딧이 표시됩니다.
- **Tokens**에는 입력, 캐시, 출력 및 추론 토큰 수가 표시됩니다.
- **Context**에는 세션에서 사용한 컨텍스트 윈도우의 양이 표시됩니다.

세션이 진행되는 동안 **Context**를 확인합니다. 컨텍스트가 채워질수록 에이전트가 실제 작업에 활용할 공간이 줄어듭니다. 이때 새 세션을 시작합니다.

> [!TIP]
> **잘못된 결과는 대부분 컨텍스트 문제에서 비롯됩니다**
>
> 잘못된 폴더나 거의 가득 찬 컨텍스트 윈도우가 부정확한 프롬프트보다 훨씬 더 자주 예상 밖 결과의 원인이 됩니다.

## Git에 기록하기 전에 테스트하기

통합 브라우저는 실제 브라우저이므로 에이전트가 퀴즈를 조작하고 동작을 검증할 수 있습니다. 다음 프롬프트를 보냅니다.

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 에이전트가 문제를 풀어 가는 동안 통합 브라우저를 지켜봅니다.
2. 실패한 부분이 있으면 에이전트가 수정하고 모든 항목이 통과할 때까지 테스트를 다시 실행하게 합니다.
3. 빌드와 테스트가 모두 통과한 뒤에만 다음 단계로 진행합니다.

아직 Git에 기록한 내용은 없습니다. 다음 레슨에서는 `/init create simple rules for the project`를 실행합니다. 현재 상태의 프로젝트를 읽으므로, 먼저 프로젝트가 정상적으로 작동하는지 확인하는 것이 좋습니다.

## 요약 및 다음 단계

세션의 프로젝트 및 사용량 세부 정보를 확인하고 브라우저 수준의 스모크 테스트로 퀴즈를 검증했습니다. [레슨 4: 프로젝트 지침 작성][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
