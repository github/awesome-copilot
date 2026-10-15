---
title: "레슨 7 - 이슈 계획 및 구현"
description: "GitHub 도구를 사용하여 Copilot Chat에서 이슈를 만든 다음, 새 채팅 세션에서 하나를 구현합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

GitHub MCP를 활성화하면 Copilot이 채팅에서 직접 이슈를 만들고 읽을 수 있습니다.

이 레슨에서는 다음 작업을 수행합니다.

- Copilot Chat에서 범위가 명확한 GitHub 이슈 3개를 만듭니다.
- 이슈 하나를 위한 새 채팅 세션을 시작합니다.
- 이슈를 구현하고 검증합니다.

## 이슈 만들기

다음 프롬프트를 보냅니다.

```plaintext
Review the space quiz and suggest three focused feature ideas. Use the GitHub tools to create a separate issue for each with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

## 이슈 하나 구현하기

1. Activity Bar에서 **GitHub** 보기를 열고 새 이슈를 살펴봅니다.
2. 이슈 하나를 선택한 다음 Copilot Chat의 **+** 버튼을 선택하여 해당 이슈의 새 세션을 시작합니다.
3. 비교를 위해 원래 세션을 유지하면서 Agent 모드로 이슈를 구현합니다.
4. 풀 리퀘스트(Pull request)를 만들기 전에 [레슨 3][lesson-3]의 통합 브라우저 스모크 테스트(Smoke test)를 실행합니다.

## 요약 및 다음 단계

이슈를 만들고 별도의 세션에서 하나를 구현했습니다. [레슨 8: 검토 및 병합][next-lesson]을 계속 진행합니다.

[lesson-3]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/8-review-and-merge/
