---
title: "레슨 3 - 컨텍스트 확인 및 테스트"
description: "Copilot Chat 요청에 첨부된 컨텍스트를 살펴본 다음, Git에 기록하기 전에 브라우저 수준의 스모크 테스트를 실행합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

게시하기 전에 Copilot이 볼 수 있는 내용을 확인하고 퀴즈가 작동하는지 검증합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 채팅 요청에 포함된 컨텍스트를 살펴봅니다.
- 브라우저 수준의 스모크 테스트(Smoke test)를 실행합니다.
- Git 작업으로 넘어가기 전에 실패한 부분을 수정합니다.

## 오른쪽 아래에서 컨텍스트 확인하기

VS Code는 Copilot Chat 입력란의 오른쪽 아래에 활성 컨텍스트를 표시합니다.

1. 채팅 입력란의 **오른쪽 아래**에 있는 컨텍스트 표시기를 엽니다.
2. 요청에 포함된 파일, 커스텀 지침, 심볼을 살펴봅니다.
3. 계속하기 전에 관련 없는 컨텍스트를 제거하거나 퀴즈 파일을 첨부합니다.

## Git에 기록하기 전에 빌드하고 테스트하기

리포지토리를 초기화하거나 커밋하기 전에 통합 브라우저와 스모크 테스트 프롬프트를 사용합니다.

```plaintext
Run a browser-level smoke test for the quiz. Check keyboard navigation, score updates, correct and incorrect feedback, and the results screen. Fix any failures, then report what passed.
```

1. 스모크 테스트를 실행하고 통합 브라우저를 확인합니다.
2. 실패한 부분을 수정하고 모든 항목이 통과할 때까지 테스트를 다시 실행합니다.
3. 빌드와 테스트가 통과한 뒤에만 Git 작업으로 넘어갑니다.

## 요약 및 다음 단계

Copilot이 볼 수 있는 내용을 확인하고 게시 전에 퀴즈를 테스트했습니다. [레슨 4: 프로젝트 게시][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
