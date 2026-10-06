---
title: "레슨 1 - 터미널에서 퀴즈 만들기"
description: "하나의 상세한 요청으로 Copilot CLI에 전체 Space Quiz를 만들도록 한 다음, 범위를 한정하여 한 가지를 개선합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

하나의 상세한 요청으로 전체 프로젝트를 만들도록 하고, 승인 전에 에이전트의 제안을 검토한 다음 범위를 한정하여 작은 변경을 한 가지 적용합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 의존성이 없는 퀴즈를 `index.html`에 만듭니다.
- 세션에서 퀴즈를 브라우저로 엽니다.
- 범위를 한정하여 한 가지를 수정하고 검증합니다.

## 퀴즈 만들기

Copilot CLI 세션에서 다음 프롬프트를 보냅니다.

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with an emoji reaction at the end. Single index.html, no server or dependencies. Accessible, keyboard-navigable, and respects prefers-color-scheme.
```

1. 제안한 계획을 읽고 파일 변경을 승인합니다.
2. 브라우저에서 `index.html`을 열고 몇 문제를 풀어 봅니다. 세션에서 실행하려면 macOS에서는 `!open index.html`, Windows에서는 `!start index.html`, Linux에서는 `!xdg-open index.html`을 실행합니다.

## 작은 변경을 적용한 다음 확인하기

범위를 한정한 요청이 어떻게 작동하는지 확인하기 위해 한 가지에 집중한 개선을 요청합니다.

```plaintext
The results screen feels flat. Give it a stronger sense of arrival: animate the score counting up and make the emoji reaction larger. Change nothing else.
```

1. 브라우저에서 페이지를 새로 고침하고 끝까지 풀어 봅니다.
2. 아직 Git에 기록한 내용이 없어 변경 사항을 비교할 기준도 없다는 점을 확인합니다. 프로젝트를 게시하면 달라집니다.

## 요약 및 다음 단계

퀴즈를 만들고 범위를 한정한 요청으로 다듬었습니다. [레슨 2: 프로젝트 지침 작성][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
