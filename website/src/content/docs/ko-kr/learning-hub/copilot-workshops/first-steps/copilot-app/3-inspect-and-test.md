---
title: "레슨 3 - 세션 살펴보기 및 퀴즈 테스트"
description: "세션 세부 정보에서 에이전트의 작업 대상을 확인한 다음, Git에 기록하기 전에 브라우저 수준의 스모크 테스트를 실행합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

이제 세션에서 실제 작업을 수행했으므로 살펴볼 내용이 있습니다. 에이전트의 작업 대상을 확인한 다음, 통합 브라우저에서 퀴즈를 조작하고 의도한 결과가 아니라 실제로 일어난 결과를 보고하게 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 세션 세부 정보 패널을 읽습니다.
- 세션의 프로젝트, 경로, 브랜치, 변경 사항, 컨텍스트 사용량을 확인합니다.
- 브라우저 수준의 스모크 테스트(Smoke test)를 실행하고 실패한 부분을 수정합니다.

## 세션 세부 정보 읽기

세션 세부 정보는 에이전트가 정확히 무엇을 작업하는지 알려 줍니다. 이 패널을 계속 지켜볼 필요는 없지만, 예상과 다른 결과가 나오면 패널의 모든 정보가 중요합니다.

![Space Quiz 빌드 세션의 Copilot app 세션 세부 정보 패널 일러스트레이션. origin/main에서 시작한 main 브랜치, 경로, 프로젝트, 세션 이름, 세션 ID 및 에이전트, 변경된 파일 1개, 토큰 수, 컨텍스트 사용량 27%, 세션 비용, 원격 제어 활성화, 이름 변경, 인사이트 보기, 비밀 gist로 공유, 세션 보관 옵션이 표시되어 있습니다.](/images/learning-hub/copilot-workshops/first-steps-app-session-details.svg)

패널에는 작업 위치, 변경 사항, 컨텍스트 윈도우(Context window)가 얼마나 찼는지가 표시됩니다. 요청마다 입력 영역에서 모델을 선택하므로 모델 행은 없습니다.

1. **project**, **path**, **branch**가 편집하려는 대상과 일치하는지 확인합니다.
2. **Changes**를 읽고 세션에서 변경한 내용이 있는지 확인합니다.
3. **context usage**를 확인합니다. 사용량이 늘어날수록 에이전트가 실제 작업에 활용할 여유 공간이 줄어듭니다. 이때 새 세션을 시작합니다.

> [!TIP]
> **잘못된 결과는 대부분 컨텍스트 문제에서 비롯됩니다**
>
> 잘못된 브랜치, 잘못된 폴더, 거의 가득 찬 컨텍스트 윈도우가 부정확한 프롬프트보다 훨씬 더 자주 예상 밖 결과의 원인이 됩니다.

## Git에 기록하기 전에 테스트하기

통합 브라우저는 실제 브라우저이므로 에이전트가 퀴즈를 조작하고 동작을 검증할 수 있습니다. 다음 프롬프트를 보냅니다.

```plaintext
Run a browser-level smoke test for the quiz in the integrated browser. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 에이전트가 문제를 풀어 가는 동안 통합 브라우저를 지켜봅니다.
2. 실패한 부분이 있으면 에이전트가 수정하고 모든 항목이 통과할 때까지 테스트를 다시 실행하게 합니다.
3. 빌드와 테스트가 모두 통과한 뒤에만 다음 단계로 진행합니다.

아직 Git에 기록한 내용은 없습니다. 다음 단계인 `/init`은 현재 상태의 프로젝트를 읽으므로, 먼저 프로젝트가 정상적으로 작동하는지 확인하는 것이 좋습니다.

## 요약 및 다음 단계

세션의 작업 대상을 확인하고 브라우저 수준의 스모크 테스트로 퀴즈를 검증했습니다. [레슨 4: 프로젝트 지침 작성][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
