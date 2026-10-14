---
title: "GitHub Copilot CLI 첫걸음"
description: "Space Quiz를 만들고 출시하면서 터미널 중심으로 GitHub Copilot CLI를 단계별로 살펴봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
  - cli
---

초보자도 쉽게 따라 할 수 있는 실습으로 GitHub Copilot CLI를 살펴봅니다. 빈 폴더에서 다채로운 Space Quiz를 만들고 터미널 중심의 작업 사이클을 익힙니다. Git에 기록하기 전에 빌드하고 변경 사항을 검토하며, 세션을 나란히 실행하고, 편집 전에 계획을 세운 다음 셸을 벗어나지 않고 풀 리퀘스트(Pull request)를 만들고 병합합니다.

워크숍에는 약 60~90분이 걸립니다. 프로젝트는 런타임 의존성이 없는 단일 HTML 파일을 사용하므로 CLI와 에이전트 기반 워크플로를 익히는 데 집중할 수 있습니다.

> [!NOTE]
> 이 워크숍은 [James Montemagno][james]가 만들었으며 [First Steps with GitHub Copilot][source-lab]을 바탕으로 구성했습니다. 원본 콘텐츠는 [MIT License][source-license]로 제공됩니다.

## 레슨

| 레슨 | 주제 | 수행할 작업 |
| ------ | ----- | ---------------- |
| [0. 사전 준비 및 설정][lesson-0] | 설정 | 사전 준비 사항을 확인하고, Copilot CLI를 설치하고, 로그인하고, 모델을 선택합니다 |
| [1. 퀴즈 만들기][lesson-1] | 빌드 | 터미널에서 퀴즈를 만들고 범위를 한정하여 한 가지를 수정합니다 |
| [2. 프로젝트 지침 작성][lesson-2] | 지침 | `/init`으로 에이전트 지침을 생성하고 맞춤 설정합니다 |
| [3. 프로젝트 게시][lesson-3] | 게시 | 프롬프트로 요청하거나 직접 초기화, 커밋, 게시를 수행합니다 |
| [4. 이슈를 병렬로 작업하기][lesson-4] | 구현 | 백로그를 만들고, 채팅에 이슈를 추가하고, `/diff`로 검토하고, 워크트리(Worktree)에서 두 번째 세션을 시작합니다 |
| [5. 편집 전에 계획하기][lesson-5] | 계획 | `/plan`으로 두 번째 이슈의 접근 방식에 합의합니다 |
| [6. 에이전트가 볼 수 있는 내용 파악하기][lesson-6] | 컨텍스트 | `/context`와 `/clear`로 컨텍스트를 살펴보고 초기화합니다 |
| [7. 세션 재개 및 원격 이용][lesson-7] | 재개 | `/resume`으로 세션을 나갔다가 돌아오고, 선택적으로 `/remote`로 다른 기기에서 로컬 세션을 확인합니다 |
| [8. 생성, 검토, 병합][lesson-8] | 검토 | `/pr create`와 `/pr agentmerge`로 풀 리퀘스트를 만들고 병합합니다 |
| [9. 작업 위임][lesson-9] | 위임 | 새 기능을 `/delegate`에 맡기고 클라우드 세션을 확인합니다 |
| [10. 복습 및 다음 단계][lesson-10] | 복습 | 워크플로를 돌아보고 학습을 이어갑니다 |

## 시작하기

[레슨 0: 사전 준비 및 설정부터 시작합니다][lesson-0].

[james]: https://github.com/jamesmontemagno
[source-lab]: https://github.com/jamesmontemagno/first-steps-with-github-copilot
[source-license]: https://github.com/jamesmontemagno/first-steps-with-github-copilot/blob/main/LICENSE
[lesson-0]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/0-prerequisites/
[lesson-1]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
[lesson-2]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/2-project-instructions/
[lesson-3]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/3-publish/
[lesson-4]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
[lesson-5]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/5-plan-mode/
[lesson-6]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/6-context/
[lesson-7]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
[lesson-8]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
[lesson-9]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/9-delegate/
[lesson-10]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
