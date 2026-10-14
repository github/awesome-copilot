---
title: "레슨 8 - 기능 PR 만들기 및 병합"
description: "필터링, 스킬 업데이트, QA 프로필, 테스트를 함께 검토하고 PR을 만든 다음 Agent Merge를 사용합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

필터링 구현, 지침 업데이트, 스킬 업데이트, 품질 보증(QA) 프로필, 테스트를 하나의 브랜치에 저장했습니다. 이제 함께 검토하고 끌어오기 요청을 엽니다. 별점 끌어오기 요청(PR)은 직접 병합했지만, 이번에는 **Agent Merge**가 프로세스를 관리하도록 합니다.

> [!NOTE]
> 일반적으로는 기능, 지침 업데이트, 스킬 업데이트, QA 에이전트를 몇 개의 별도 PR로 나눕니다. 워크숍을 간소화하기 위해 전체 필터링과 품질 워크플로를 하나의 세션과 브랜치에서 유지하고 이 PR에 모두 포함합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Agent Merge의 개념과 병합 수명 주기를 자동화하는 방식을 알아봅니다.
- 전체 기능 PR과 검증 근거를 살펴봅니다.
- 검토한 후에만 Agent Merge를 승인하고 PR 병합을 확인합니다.

## 시나리오

필터링 워크플로 전체에서 Copilot으로 기능을 계획하고 구현하고 검증했습니다. 이제 Tailspin Toys는 병합 권한을 개발자가 계속 제어하면서 남은 PR 작업을 자동화하려고 합니다.

## Agent Merge 소개

**Agent Merge**는 Copilot app을 통해 끌어오기 요청을 병합하는 마지막 단계를 자동화합니다. 활성화하면 앱의 세션이 끌어오기 요청을 읽고, 실패한 CI 검사 수정, 검토 의견 대응, 필요할 때 리베이스 수행 등 병합을 차단하는 문제를 해결한 다음 GitHub에서 허용하는 즉시 병합합니다. 백그라운드에서 실행되고 앱을 다시 시작해도 계속 작동하며 끌어오기 요청이 병합되면 자동으로 꺼집니다.

지금까지는 직접 **Merge pull request**를 선택했습니다. Agent Merge가 이 책임을 맡을 수 있지만 코드 편집과 병합에는 명시적 승인이 필요합니다. 병합 권한을 부여하기 전에 허용된 작업과 변경 내용을 검토합니다.

## Agent Merge로 PR 관리

코드 작성과 검토를 마쳤으므로 Agent Merge가 PR 프로세스를 관리하도록 합니다.

1. 에이전트 선택기에서 **Default agent**를 선택합니다.
2. **Create PR** 옆의 드롭다운을 선택합니다.
3. **Agent merge**를 선택합니다. 버튼이 **Agent merge**로 바뀝니다.
4. **Agent merge**를 선택하여 Agent Merge 프로세스를 시작합니다.

Agent Merge 프로세스가 시작되면 다음 작업을 수행합니다.

- 제목과 설명이 있는 끌어오기 요청을 만듭니다.
- 이슈에서 세션을 시작했다면 설명 본문에서 관련 이슈를 참조합니다.
- 대상 브랜치와의 잠재적 병합 충돌을 리베이스하거나 처리합니다.
- 모든 검사가 통과하도록 CI 프로세스를 모니터링합니다.
- 다른 개발자나 Copilot 코드 검토의 피드백이 있는지 PR을 모니터링하고 의견을 해결하도록 업데이트합니다.
- 선택적으로 모든 작업이 성공하면 PR을 자동으로 병합할 수 있습니다.

모든 검사가 통과하면 Agent Merge가 PR도 병합하도록 합니다.

5. **Agent merge** 옆의 드롭다운을 선택합니다.
6. **Merge pull request** 옆에 체크 표시가 있는지 확인합니다.

> [!IMPORTANT]
> Agent Merge는 리포지토리 보호나 누락된 권한을 우회하지 않습니다. 계속하기 전에 이러한 차단 요인을 해결합니다.

## 요약 및 다음 단계

코드 생성, 코드 테스트와 검증, 끌어오기 요청 프로세스를 포함한 개발 프로세스의 여러 부분을 자동화했습니다. 다음 작업을 수행했습니다.

- Agent Merge의 개념과 병합 수명 주기를 자동화하는 방식을 배웠습니다.
- 전체 기능 PR과 검증 근거를 살펴봤습니다.
- 검토한 후에만 Agent Merge를 승인하고 PR이 병합되었는지 확인했습니다.

다음으로 에이전트와 함께 작업을 계획하고 시각화하는 더 풍부한 방법인 **캔버스**를 살펴봅니다. [레슨 9 - 캔버스 살펴보기 및 만들기][next-lesson]를 계속 진행합니다.

## 리소스

- [GitHub Copilot app으로 이슈 및 끌어오기 요청 관리][managing-issues-prs]
- [GitHub Copilot app 정보][about-copilot-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/9-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app