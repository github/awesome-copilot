---
title: "레슨 2 - 퀴즈 만들고 다듬기"
description: "단일 파일로 Space Quiz를 만들고 통합 브라우저와 요소 선택 도구로 다듬습니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

하나의 상세한 프롬프트로 Space Quiz를 만들고, 통합 브라우저에서 동작을 확인하고, 요소 선택 도구로 시각적인 부분을 개선합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 의존성이 없는 퀴즈를 `index.html`에 만듭니다.
- 통합 브라우저에서 퀴즈를 테스트합니다.
- 생성된 코드를 살펴봅니다.
- 접근성을 유지하면서 선택한 요소를 다듬습니다.

## 퀴즈 만들기

`space-quiz` 세션에서 다음 프롬프트를 보냅니다.

```plaintext
Create a space exploration quiz with 10 questions, a progress bar, score counter, and colorful animated feedback (green for correct, red shake for wrong). Show a results screen with emoji reaction at the end. Center in a narrow column. Single index.html, no server/dependencies. Polished, sans-serif, 14–16px body, prefers-color-scheme. Open in the integrated browser.
```

에이전트가 작업을 마치면 여러 문제를 풀어 보고 다음 사항을 확인합니다.

- 진행률 표시줄의 진행률이 올라갑니다.
- 점수가 업데이트됩니다.
- 정답을 선택하면 초록색 상태가 표시됩니다.
- 오답을 선택하면 빨간색 흔들림 애니메이션이 나타납니다.
- 마지막 문제를 푼 뒤 결과 화면이 나타납니다.

## 생성된 코드 살펴보기

왼쪽 사이드바와 오른쪽 브라우저 패널을 접은 다음, 넓어진 코드 영역에서 `index.html`을 검토합니다. HTML, CSS, JavaScript가 하나의 파일에서 함께 작동하는 방식을 살펴봅니다. 검토를 마치면 두 패널을 모두 복원합니다.

## 요소 선택 도구로 다듬기

1. 브라우저 도구 모음에서 요소 선택 도구를 선택합니다.
2. 퀴즈 제목이나 답변 영역을 선택합니다.
3. 다음 프롬프트를 보냅니다.

   ```plaintext
   Make the selected element feel more like a mission-control display. Keep it accessible and preserve the existing light and dark themes.
   ```

4. 통합 브라우저가 새로 고쳐지는 모습을 보고 변경 사항을 확인합니다.

## 추가 개선 사항(선택)

계속 실험하고 싶다면 에이전트에 다음 작업을 요청합니다.

- `prefers-reduced-motion`을 준수하는 은은한 별 배경을 추가합니다.
- 점수가 8점 이상일 때 결과 화면의 축하 분위기를 더합니다.
- 키보드 포커스 상태를 개선한 다음 마우스 없이 퀴즈를 확인합니다.

## 요약 및 다음 단계

Space Quiz를 만들고, 코드를 살펴보고, 다듬었습니다. [레슨 3: 세션 살펴보기 및 퀴즈 테스트][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
