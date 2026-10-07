---
title: "레슨 1 - 워크스페이스에서 만들기"
description: "VS Code에서 Space Quiz를 만들고, 통합 브라우저에서 미리 보고, 선택한 요소를 다듬습니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

편집기, 채팅, 파일, 미리 보기를 한곳에서 사용합니다. 퀴즈를 만들고 통합 브라우저에서 풀어 본 다음, 특정 요소를 채팅에 바로 전달하여 범위를 한정한 변경을 적용합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 단일 `index.html`에 퀴즈를 만듭니다.
- 통합 브라우저에서 퀴즈를 미리 봅니다.
- 브라우저에서 요소를 선택하고 다듬습니다.

## 퀴즈 만들기

Copilot Chat에서 다음 프롬프트를 보냅니다.

```plaintext
Create a colorful, accessible space exploration quiz with 10 questions in a single index.html. Add a progress bar, score counter, animated correct and incorrect feedback, and a results screen. Use no server or dependencies. Open it in the VS Code integrated browser.
```

1. 편집기에서 생성된 파일을 검토합니다.
2. 통합 브라우저를 열고 여러 문제를 풀어 봅니다.
3. 언제든 **Source Control**을 열어 변경된 파일과 변경 사항을 확인합니다.

## 요소를 선택하고 다듬기

통합 브라우저는 특정 요소를 채팅에 바로 전달할 수 있으므로 어떤 버튼을 가리키는지 설명할 필요가 없습니다.

1. 통합 브라우저에서 퀴즈를 연 상태로 브라우저 도구 모음에서 요소 선택을 시작합니다.
2. 답변 버튼을 선택하여 해당 요소를 다음 채팅 메시지에 첨부합니다.
3. 다음 프롬프트를 보내고 미리 보기가 새로 고쳐지는 모습을 지켜봅니다.

   ```plaintext
   Using the selected element, make the answer buttons feel more tactile: add a subtle press state, a clearer focus ring for keyboard users, and a smoother transition into the correct and incorrect colors. Change nothing else.
   ```

4. 변경 사항을 유지하기 전에 **Source Control**에서 변경 사항을 읽습니다.
5. <kbd>Tab</kbd>을 눌러 답변 사이를 이동하고 포커스 링이 보이는지 확인합니다.

## 요약 및 다음 단계

편집기를 벗어나지 않고 퀴즈를 만들고 미리 보고 다듬었습니다. [레슨 2: 프로젝트 지침 작성][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
