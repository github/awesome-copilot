---
title: "레슨 5 - 편집 전에 계획하기"
description: "/plan으로 두 번째 세션을 계획 모드로 전환하여 에이전트가 파일을 편집하기 전에 접근 방식을 제안하게 합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

이미 별도의 워크트리(Worktree)에서 두 번째 세션이 실행 중입니다. 그 세션에서는 코드부터 작성하지 않습니다. 계획 모드는 파일을 변경하지 않고 프로젝트를 조사하여 접근 방식을 제안합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 두 번째 세션을 계획 모드로 전환합니다.
- 에이전트가 제안한 계획을 검토하고 다듬습니다.
- 계획을 승인하고 세션에서 구현하게 합니다.

## 편집하기 전에 접근 방식에 합의하기

1. 이전 레슨에서 연 **두 번째 세션**으로 전환합니다.
2. `/plan`을 실행하여 해당 세션을 계획 모드로 전환합니다.
3. 다음 프롬프트를 보내 에이전트가 아무것도 편집하지 않고 조사하게 합니다.

   ```plaintext
   Plan how to implement this issue. Investigate the existing quiz, list the files you would change, call out risks to accessibility and the single-file constraint, and stop before making any edits.
   ```

4. 계획을 읽고 빠진 내용은 보완하도록 요청한 다음 승인합니다.
5. 세션은 승인된 계획을 작업 지침으로 삼아 구현을 이어갑니다.

> [!TIP]
> **계획 모드가 도움이 되는 경우**
>
> 모호하거나 여러 영역에 걸쳐 있거나 되돌리는 비용이 큰 작업에 계획 모드를 사용합니다. 잘못된 접근 방식을 수정하는 데 드는 비용은 첫 편집 전에 가장 적습니다.

## 요약 및 다음 단계

에이전트가 코드를 작성하기 전에 접근 방식에 합의했습니다. [레슨 6: 에이전트가 볼 수 있는 내용 파악하기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
