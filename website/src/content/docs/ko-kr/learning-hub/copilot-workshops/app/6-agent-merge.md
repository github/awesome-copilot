---
title: "Lesson 6 - Agent Merge로 병합"
description: "필터링 끌어오기 요청을 열고 My work에서 검토한 다음, Agent Merge가 차단 요소를 수정하고 병합하도록 하여 병합 자동화의 최상위 단계를 경험합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

필터링 기능을 구축하고 검증하고 브라우저에서 작동하는 모습까지 확인했습니다. 마지막 단계는 병합입니다. 이 실습 과정에서 이미 두 번 병합했으며, 두 번 모두 끌어오기 요청을 열고 github.com에서 직접 병합했습니다. 이번에는 앱 안에서 끌어오기 요청의 전체 수명 주기를 관리하는 **Agent Merge**를 사용하여 앱이 번거로운 작업을 처리하게 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Agent Merge의 개념과 병합 수명 주기를 자동화하는 방식을 알아봅니다.
- 필터링 세션에서 Agent Merge를 활성화합니다.
- Agent Merge가 끌어오기 요청을 만들고 CI를 실행한 다음 모든 검사가 통과하면 병합하는 과정을 확인합니다.

## 시나리오

지난 몇 개 모듈에서 코드 생성부터 Copilot이 UI를 직접 검증하도록 하는 것까지 다양한 자동화 수준을 살펴봤습니다. Tailspin Toys는 개발 속도를 더욱 높이기 위해 검토와 검증을 마친 끌어오기 요청을 자동으로 병합할 방법이 있는지 알아보려고 합니다.

## Agent Merge 소개

**Agent Merge**는 Copilot app을 통해 끌어오기 요청을 병합하는 마지막 단계를 자동화합니다. 활성화하면 앱의 세션이 끌어오기 요청을 읽고, 실패한 CI 검사 수정, 검토 의견 대응, 필요할 때 리베이스 수행 등 병합을 차단하는 문제를 해결한 다음 GitHub에서 허용하는 즉시 병합합니다. 백그라운드에서 실행되고 앱을 다시 시작해도 계속 작동하며 끌어오기 요청이 병합되면 자동으로 꺼집니다.

지금까지는 github.com에서 직접 **Merge pull request**를 선택했습니다. Agent Merge는 해당 책임을 에이전트로 옮기므로, 에이전트가 PR 완료 과정을 관리하는 동안 다음 작업으로 넘어갈 수 있습니다. 작업을 검토하고 승인하는 책임은 여전히 사용자에게 있으며, 에이전트는 기계적인 마무리 작업만 처리합니다.

## Agent Merge로 PR 관리

코드를 직접 검토하고 테스트를 실행했으며 Copilot이 UI를 검증하도록 했습니다. 이제 새 코드를 코드베이스에 병합합니다. Agent Merge가 지속적 통합(CI)과 병합 과정을 관리하게 합니다.

1. 이전 모듈에서 필터링 기능을 추가하며 열어 둔 세션으로 돌아갑니다.
2. 오른쪽 위에서 **Create PR** 옆의 드롭다운을 선택합니다.
3. **Agent merge**를 선택하여 Agent Merge를 활성화합니다.

   ![Agent merge 옵션을 화살표로 가리키는 펼쳐진 GitHub Copilot app Create PR 드롭다운](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. 이제 버튼 텍스트가 **Agent merge**로 바뀝니다.
5. **Agent merge** 버튼을 선택하여 Agent Merge 프로세스를 시작합니다.

Copilot app이 PR을 만들고 관리하는 프로세스를 시작합니다. 먼저 프로젝트를 탐색하여 PR을 만드는 최적의 방법을 결정한 다음 새 PR을 만듭니다.

잠시 후 Copilot이 다시 작업을 시작하여 PR 조건, 즉 리포지토리의 모든 테스트를 실행하는 CI 프로세스를 확인합니다. 다른 팀 구성원이 남긴 검토, 실행해야 하는 검사(CI 프로세스), PR의 병합 가능 여부를 보고합니다.

6. **Agent merge** 옆의 드롭다운을 선택한 다음 **Merge pull request**를 선택하여 Agent Merge가 끌어오기 요청을 병합하도록 허용합니다.

   ![에이전트에 허용된 작업인 Address reviews, Fix CI failures, Resolve conflicts와 화살표로 강조된 Merge pull request를 보여 주는 Agent merge 드롭다운](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. 모든 CI 프로세스가 통과하면, 즉 테스트가 성공하면 Copilot이 끌어오기 요청을 병합합니다.

## 요약 및 다음 단계

코드 생성, 코드 테스트와 검증, 끌어오기 요청 프로세스를 포함한 개발 프로세스의 여러 부분을 자동화했습니다. 다음 작업을 수행했습니다.

- Agent Merge의 개념과 병합 수명 주기를 자동화하는 방식을 배웠습니다.
- 필터링 세션에서 Agent Merge를 활성화했습니다.
- Agent Merge가 끌어오기 요청을 만들고 CI를 실행한 다음 모든 검사가 통과했을 때 병합하는 과정을 확인했습니다.

다음으로 에이전트와 함께 작업을 계획하고 시각화하는 더 풍부한 방법인 **캔버스**를 살펴봅니다. [레슨 7 - 캔버스로 계획 수립][next-lesson]을 계속 진행합니다.

## 리소스

- [GitHub Copilot app으로 이슈 및 끌어오기 요청 관리][managing-issues-prs]
- [GitHub Copilot app 정보][about-copilot-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/7-canvases/
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app