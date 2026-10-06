---
title: "레슨 2 - 프로젝트 지침 작성"
description: "Copilot Chat에서 /init을 실행하여 Space Quiz의 .github/copilot-instructions.md를 생성한 다음 조정합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

워크스페이스에 정상적으로 작동하는 퀴즈가 있으므로 실제 프로젝트를 설명하는 리포지토리 커스텀 지침을 생성합니다. Copilot은 채팅 요청마다 이 지침을 읽습니다.

이 레슨에서는 다음 작업을 수행합니다.

- `/init`으로 리포지토리 커스텀 지침을 생성합니다.
- 저장하기 전에 `.github/copilot-instructions.md`를 검토합니다.
- 지침을 간결하게 정리하고 맞춤 설정합니다.

## `/init`으로 규칙 기록하기

1. Copilot Chat에서 `/init`을 실행합니다.
2. 생성된 `.github/copilot-instructions.md` 파일을 저장하기 전에 검토합니다.
3. 단일 파일, 의존성 없음, 접근성, 브라우저 테스트 등 이 프로젝트에 맞는 안내만 남깁니다.

![편집기에 .github/copilot-instructions.md를 열고 Explorer에서 index.html 옆의 해당 파일을 선택한 VS Code 일러스트레이션. 파일 제목은 Space Quiz이며, 의존성과 빌드 단계가 없는 단일 index.html, 키보드로 접근 가능한 모든 답변, 두 테마에서 prefers-color-scheme 준수라는 규칙이 나열되어 있습니다. How I like code written 섹션에는 작은 함수, 조기 반환, 이해하기 어려운 한 줄 코드 지양, 실제로 예상하기 어려운 부분에만 주석 작성이라는 요청이 있습니다.](/images/learning-hub/copilot-workshops/first-steps-vscode-instructions.svg)

리포지토리 커스텀 지침은 `.github/copilot-instructions.md`에 저장되며 모든 채팅 요청에 적용됩니다.

> [!IMPORTANT]
> **순서가 중요합니다**
>
> `/init`은 현재 상태의 워크스페이스를 읽습니다. 퀴즈를 만든 뒤 실행하면 실제 코드를 바탕으로 하는 지침을 생성합니다.

## 작업 방식에 맞게 조정하기

지침 파일에는 프로젝트에 관한 사실만 적는 것이 아닙니다. 선호하는 코드 작성 방식, 명명 규칙, 사용하지 않을 라이브러리, 원하는 주석의 양처럼 프롬프트마다 반복할 구체적인 사항을 추가합니다. 이후 모든 세션은 프롬프트를 읽기 전에 이 파일을 읽습니다.

## 요약 및 다음 단계

이제 워크스페이스에 실제 코드를 바탕으로 작성한 커스텀 지침이 있습니다. [레슨 3: 컨텍스트 확인 및 테스트][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
