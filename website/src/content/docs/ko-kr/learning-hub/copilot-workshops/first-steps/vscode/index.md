---
title: "Visual Studio Code 첫걸음"
description: "Space Quiz를 만들고 테스트하고 출시하면서 Visual Studio Code의 GitHub Copilot을 단계별로 살펴봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

초보자도 쉽게 따라 할 수 있는 실습으로 Visual Studio Code의 GitHub Copilot을 살펴봅니다. 빈 폴더에서 다채로운 Space Quiz를 만들고 편집기 중심의 작업 사이클을 익힙니다. 워크스페이스에서 빌드하고, 컨텍스트를 살펴보고, Git에 기록하기 전에 테스트하고, 편집 전에 계획을 세우고, VS Code를 벗어나지 않고 GitHub 도구로 이슈와 풀 리퀘스트(Pull request)를 처리합니다.

워크숍에는 약 60~90분이 걸립니다. 프로젝트는 런타임 의존성이 없는 단일 HTML 파일을 사용하므로 편집기에서 Copilot을 익히는 데 집중할 수 있습니다.

> [!NOTE]
> 이 워크숍은 [James Montemagno][james]가 만들었으며 [First Steps with GitHub Copilot][source-lab]을 바탕으로 구성했습니다. 원본 콘텐츠는 [MIT License][source-license]로 제공됩니다.

## 레슨

| 레슨 | 주제 | 수행할 작업 |
| ------ | ----- | ---------------- |
| [0. 사전 준비 및 설정][lesson-0] | 설정 | 사전 준비 사항을 확인하고, GitHub 확장을 추가하고, 폴더를 열고, 모델을 선택합니다 |
| [1. 워크스페이스에서 만들기][lesson-1] | 빌드 | 퀴즈를 만들고, 통합 브라우저에서 미리 보고, 선택한 요소를 다듬습니다 |
| [2. 프로젝트 지침 작성][lesson-2] | 지침 | `/init`으로 `.github/copilot-instructions.md`를 생성하고 맞춤 설정합니다 |
| [3. 컨텍스트 확인 및 테스트][lesson-3] | 테스트 | 채팅 컨텍스트를 살펴보고 Git에 기록하기 전에 스모크 테스트(Smoke test)를 실행합니다 |
| [4. 프로젝트 게시][lesson-4] | 게시 | Source Control로 초기화, 커밋, 게시를 수행합니다 |
| [5. 편집 전에 계획하기][lesson-5] | 계획 | Plan 모드로 다음 기능의 접근 방식에 합의합니다 |
| [6. Copilot에 GitHub 연동 도구 제공][lesson-6] | 도구 | GitHub MCP 서버를 활성화하고 검토합니다 |
| [7. 이슈 계획 및 구현][lesson-7] | 구현 | GitHub 도구로 이슈를 만들고 새 세션에서 하나를 구현합니다 |
| [8. 검토 및 병합][lesson-8] | 검토 | Source Control에서 풀 리퀘스트를 만들고, 검토를 요청하고, 병합합니다 |
| [9. 클라우드 세션에 작업 넘기기][lesson-9] | 위임 | 하네스(Harness)를 Cloud로 전환하고 새 기능을 위임합니다 |
| [10. 복습 및 다음 단계][lesson-10] | 복습 | 워크플로를 돌아보고 학습을 이어갑니다 |

## 시작하기

[레슨 0: 사전 준비 및 설정부터 시작합니다][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/0-prerequisites/
[lesson-1]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
[lesson-2]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/2-project-instructions/
[lesson-3]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/3-inspect-and-test/
[lesson-4]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/4-publish/
[lesson-5]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
[lesson-6]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/6-github-mcp/
[lesson-7]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/7-issues-and-sessions/
[lesson-8]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/8-review-and-merge/
[lesson-9]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/9-cloud-session/
[lesson-10]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/10-review/
