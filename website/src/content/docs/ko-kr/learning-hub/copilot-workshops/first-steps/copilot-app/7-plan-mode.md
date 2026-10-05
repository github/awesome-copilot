---
title: "레슨 7 - 편집 전에 계획하기"
description: "두 번째 이슈에 Plan 모드를 사용하여 에이전트가 파일을 변경하기 전에 프로젝트를 조사하고 접근 방식을 제안하게 합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

모든 이슈를 편집부터 시작해야 하는 것은 아닙니다. Plan 모드는 프로젝트를 조사하고 접근 방식을 제안한 다음, 코드를 변경하기 전에 승인을 기다립니다.

이 레슨에서는 다음 작업을 수행합니다.

- 두 번째 이슈의 세션을 Plan 모드로 시작합니다.
- 에이전트가 제안한 계획을 검토하고 다듬습니다.
- 계획을 승인하고 세션을 이어갈 방식을 선택합니다.

## 코드를 변경하기 전에 접근 방식에 합의하기

1. **Issues**에서 **두 번째 이슈**를 열고 **New session**을 선택합니다.
2. 세션 구성에서 **Interactive**나 **Autopilot** 대신 **Plan**을 선택합니다.
3. 다음 프롬프트를 보내 에이전트가 파일을 변경하지 않고 조사하게 합니다.

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 제안한 계획을 읽고 빠진 내용이 있으면 수정을 요청합니다.
5. 계획을 승인합니다.
6. 메시지가 표시되면 세션을 **Interactive** 또는 **Autopilot** 중 어떤 모드로 이어갈지 선택합니다.

> [!TIP]
> **Plan 모드가 도움이 되는 경우**
>
> 모호하거나 여러 영역에 걸쳐 있거나 되돌리는 비용이 큰 작업에 Plan 모드를 사용합니다. 잘못된 접근 방식을 수정하는 데 드는 비용은 첫 편집 전에 가장 적습니다.

## 요약 및 다음 단계

에이전트가 코드를 작성하기 전에 접근 방식에 합의했습니다. [레슨 8: Copilot 검토 사이클 완료][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
