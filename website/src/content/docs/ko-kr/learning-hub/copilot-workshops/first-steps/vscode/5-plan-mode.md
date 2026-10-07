---
title: "레슨 5 - 편집 전에 계획하기"
description: "Copilot Chat을 Plan 모드로 전환하여 파일을 편집하기 전에 워크스페이스를 조사하고 접근 방식을 제안하게 합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Plan 모드는 파일을 변경하지 않고 워크스페이스를 조사하여 구현 계획을 작성합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Copilot Chat을 Agent에서 Plan으로 전환합니다.
- 제안한 계획을 검토하고 다듬습니다.
- Agent로 다시 전환하여 계획을 구현합니다.

## 편집하기 전에 접근 방식에 합의하기

1. Copilot Chat을 열고 입력란 위의 **mode dropdown**을 사용합니다.
2. **Agent**에서 **Plan**으로 전환합니다.
3. 다음 프롬프트로 다음 기능을 설명하고 Copilot이 워크스페이스를 조사하게 합니다.

   ```plaintext
   Plan how to add a review screen that shows every question with the answer I chose. Investigate the existing quiz, list the changes you would make, call out accessibility and single-file risks, and stop before editing.
   ```

4. 계획을 읽고 수정을 요청한 다음 **Agent**로 다시 전환하여 구현합니다.

> [!TIP]
> **계획 모드가 도움이 되는 경우**
>
> 모호하거나 여러 영역에 걸쳐 있거나 되돌리는 비용이 큰 작업에 Plan 모드를 사용합니다. 잘못된 접근 방식을 수정하는 데 드는 비용은 첫 편집 전에 가장 적습니다.

## 요약 및 다음 단계

Copilot이 코드를 작성하기 전에 접근 방식에 합의했습니다. [레슨 6: Copilot에 GitHub 연동 도구 제공][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
