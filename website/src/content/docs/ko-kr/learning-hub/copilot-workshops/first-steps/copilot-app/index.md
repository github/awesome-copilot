---
title: "GitHub Copilot app 둘러보기"
description: "Space Quiz를 만들고 출시하면서 GitHub Copilot app을 단계별로 살펴봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

초보자도 쉽게 따라 할 수 있는 실습으로 GitHub Copilot app을 살펴봅니다. 빈 폴더에서 다채로운 Space Quiz를 만들고, 첫 프롬프트부터 검토를 마친 풀 리퀘스트(Pull request)까지 전체 개발 사이클을 진행합니다.

워크숍에는 약 60~90분이 걸립니다. 프로젝트는 런타임 의존성이 없는 단일 HTML 파일을 사용하므로 앱과 에이전트 기반 워크플로를 익히는 데 집중할 수 있습니다.

> [!NOTE]
> 이 워크숍은 [James Montemagno][james]가 만들었으며 [First Steps with GitHub Copilot][source-lab]을 바탕으로 구성했습니다. 원본 콘텐츠는 [MIT License][source-license]로 제공됩니다.

## 레슨

| 레슨 | 주제 | 수행할 작업 |
| ------ | ----- | ---------------- |
| [0. 사전 준비 및 설정][lesson-0] | 설정 | 사전 준비 사항을 확인하고, 앱을 설치하고, 모델을 선택하고, 워크스페이스를 살펴봅니다 |
| [1. 워크스페이스 만들기][lesson-1] | 생성 | 빈 로컬 폴더에서 Interactive 세션을 시작합니다 |
| [2. 만들고 다듬기][lesson-2] | 빌드 | 퀴즈를 만들고 통합 브라우저에서 다듬습니다 |
| [3. 살펴보고 테스트하기][lesson-3] | 컨텍스트 및 테스트 | 세션 세부 정보를 읽고 브라우저 수준의 스모크 테스트(Smoke test)를 실행합니다 |
| [4. 프로젝트 지침 작성][lesson-4] | 지침 | `/init`으로 에이전트 지침을 생성하고 맞춤 설정합니다 |
| [5. 프로젝트 게시][lesson-5] | 게시 | 로컬 프로젝트에서 공개 GitHub 리포지토리를 만듭니다 |
| [6. 이슈 및 세션으로 작업하기][lesson-6] | 구현 | 백로그를 만들고, 격리된 워크트리(Worktree)에서 이슈 하나를 구현하고, 변경 사항을 검토합니다 |
| [7. 편집 전에 계획하기][lesson-7] | 계획 | Plan 모드로 두 번째 이슈의 접근 방식에 합의합니다 |
| [8. 검토 사이클 완료][lesson-8] | 검토 | 풀 리퀘스트를 만들고, Copilot 검토 피드백을 반영하고, Agent Merge를 사용합니다 |
| [9. 이슈 분류 자동화][lesson-9] | 자동화 | 주간 이슈 분류 자동화를 예약하고 실행합니다 |
| [10. 원격으로 세션 이어가기][lesson-10] | 원격(선택 사항) | `/remote`로 진행 중인 로컬 세션을 웹이나 모바일에서 확인합니다 |
| [11. Canvas 살펴보기][lesson-11] | Canvas | Repository Issues Kanban Canvas에서 작업을 시작합니다 |
| [12. 복습 및 다음 단계][lesson-12] | 복습 | 워크플로를 돌아보고 학습을 이어갑니다 |

## 시작하기

[레슨 0: 사전 준비 및 설정부터 시작합니다][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/0-prerequisites/
[lesson-1]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
[lesson-2]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/2-build-and-polish/
[lesson-3]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/3-inspect-and-test/
[lesson-4]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/4-project-instructions/
[lesson-5]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/5-publish/
[lesson-6]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
[lesson-7]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
[lesson-8]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/8-review-loop/
[lesson-9]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/9-automations/
[lesson-10]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
[lesson-11]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/11-canvas/
[lesson-12]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/12-review/
