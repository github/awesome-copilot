---
title: "Lesson 7 - 캔버스로 계획 수립"
description: "GitHub Copilot app에서 공유 에이전트 기반 캔버스를 만들어 에이전트와 함께 작업을 계획하고 추적합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

지금까지 채팅을 통해 에이전트를 지시했습니다. 하지만 많은 작업은 대화가 아니라 보드, 문서, 검사 목록에서 이루어집니다. **캔버스**는 바로 이러한 작업을 위해 앱 안에서 사용자와 에이전트가 함께 사용하는 화면을 제공합니다. 이 레슨에서는 지금까지 처리한 백로그를 계획하고 추적하는 간단한 캔버스를 만듭니다.

이 레슨에서는 다음 작업을 수행합니다.

- 캔버스의 개념과 사용 시점을 이해합니다.
- 백로그를 분류하는 공유 Kanban 보드 캔버스를 만듭니다.
- 캔버스를 리포지토리에 저장하고 팀에서 사용할 수 있도록 병합합니다.
- 새 세션에서 캔버스를 열고 캔버스에서 작업을 시작합니다.

## 시나리오

이슈 목록은 아무리 좋은 상황에서도 부담스러울 수 있습니다. Tailspin Toys 개발자는 이슈를 빠르게 분류하고 Copilot app에서 작업을 시작할 수 있는 도구를 찾고 있습니다.

## 캔버스란?

[캔버스][canvas-docs]는 계획, 분류 보드, 릴리스 검사 목록, 대시보드, 문서 같은 작업 산출물을 위한 공유 대화형 화면입니다. 채팅은 의도를 설명하고 모호한 부분을 함께 추론하는 데 유용하지만 대부분의 작업은 *화면*에서 이루어집니다. 캔버스를 사용하면 해당 화면에서 에이전트와 직접 협업할 수 있습니다.

캔버스는 **양방향**입니다. 에이전트가 작업하면서 캔버스를 업데이트할 수 있고 사용자도 동일한 화면을 편집할 수 있습니다. 캔버스를 만들면 에이전트가 프롬프트와 워크플로를 바탕으로 구축하며, 진행하면서 기능을 추가하거나 제거하거나 수정하도록 요청할 수 있습니다. 캔버스를 만들면 앱의 오른쪽 패널에서 열립니다.

일반적인 예는 다음과 같습니다.

- 하루를 계획하고 이슈와 끌어오기 요청의 우선순위를 정하는 **Markdown 캔버스**
- 사용자와 에이전트가 카드를 추가하고 열 사이에서 작업을 이동하는 **에이전트 Kanban 보드**
- 리포지토리의 주요 이슈와 반복되는 주제를 요약하는 **이슈 분류 보드**

## 캔버스를 사용하는 이유

작업에 구조화, 반복, 검증이 필요하고 채팅만으로 충분하지 않다면 캔버스를 사용합니다. 캔버스로 다음 작업을 수행할 수 있습니다.

- 워크플로에 맞는 실제 산출물을 기반으로 에이전트가 작업하게 합니다.
- 공유 화면에서 작업을 직접 안내하거나 수정한 다음 에이전트가 변경 내용에서 계속 작업하게 합니다.
- 채팅 응답만 보는 대신 산출물의 눈에 보이는 변경으로 진행 상황을 확인합니다.

## 작업 추적 캔버스 만들기

별점, 문서화 표준, 필터링 기능을 모두 병합하여 많은 작업을 제공했습니다. 하지만 백로그에는 아직 항목이 남아 있습니다. 작업을 빠르게 분류하는 데 도움이 되는 캔버스를 만듭니다.

1. GitHub Copilot app으로 돌아가거나 앱을 엽니다.
2. **Home screen**을 선택합니다.
3. 리포지토리로 `tailspin-toys`가 선택되어 있는지 확인합니다.
4. 프롬프트 상자에서 다음 프롬프트를 사용하여 요구 사항을 충족하는 캔버스를 만듭니다.

   ```plaintext
   Create a basic Kanban board canvas that allows me to quickly triage work. Highlight the three issues which are most likely to need attention right now, with the remainder in a second section down below. The top three cards should include a description of the issue's content and a justification of why they're at the top of the list. Each issue should have a button that allows me to add it to the current context for the current session so I can get to work on it straightaway.
   ```

Copilot이 캔버스를 만들기 시작합니다.

> [!NOTE]
> 이 작업에는 몇 분 정도 걸립니다. 복잡한 작업이므로 첫 번째 버전이 만족스럽지 않을 수 있습니다. 원하는 도구가 완성될 때까지 프롬프트로 계속 개선할 수 있습니다.

## 캔버스를 저장하고 리포지토리에 병합

캔버스는 지침 파일 및 스킬과 마찬가지로 리포지토리의 자산이 될 수 있습니다. Copilot에 캔버스를 리포지토리에 추가하고 병합하도록 요청하여 팀 전체에서 사용하게 합니다.

1. 같은 세션에서 다음 프롬프트를 사용하여 캔버스를 리포지토리에 저장하도록 Copilot에 요청합니다.

   ```plaintext
   Let's save this canvas definition to the repository so I can share it with my development team
   ```

2. Copilot이 캔버스 파일을 저장하면 오른쪽 위에서 **Create PR** 옆의 드롭다운을 선택합니다.
3. **Agent merge**를 선택하여 Agent Merge를 활성화합니다.

   ![Agent merge 옵션을 화살표로 가리키는 펼쳐진 GitHub Copilot app Create PR 드롭다운](/images/learning-hub/copilot-workshops/app-enable-agent-merge.png)

4. 이제 버튼 텍스트가 **Agent merge**로 바뀝니다.
5. **Agent merge** 버튼을 선택하여 Agent Merge 프로세스를 시작합니다.

Copilot app이 PR을 만들고 관리하는 프로세스를 시작합니다. 먼저 프로젝트를 탐색하여 PR을 만드는 최적의 방법을 결정한 다음 PR을 만듭니다.

잠시 후 Copilot이 다시 작업을 시작하여 PR 조건, 즉 리포지토리의 모든 테스트를 실행하는 CI 프로세스를 확인합니다. 다른 팀 구성원이 남긴 검토, 실행해야 하는 검사(CI 프로세스), PR의 병합 가능 여부를 보고합니다.

6. **Agent merge** 옆의 드롭다운을 선택한 다음 **Merge pull request**를 선택하여 Agent Merge가 끌어오기 요청을 병합하도록 허용합니다.

   ![에이전트에 허용된 작업인 Address reviews, Fix CI failures, Resolve conflicts와 화살표로 강조된 Merge pull request를 보여 주는 Agent merge 드롭다운](/images/learning-hub/copilot-workshops/app-agent-merge-merge.png)

7. 모든 CI 프로세스가 통과할 때까지 기다립니다. 모두 통과하면 Copilot이 끌어오기 요청을 자동으로 병합합니다.

이제 팀을 위한 새 공유 캔버스를 만들었습니다.

## 캔버스에서 작업

캔버스를 만들었으므로 새 세션을 시작하고 사용해 봅니다.

1. Copilot app에서 **tailspin-toys** 옆의 **New session**을 선택하여 새 세션을 시작합니다.
2. 다음 프롬프트를 사용하여 분류 캔버스를 열도록 Copilot에 요청합니다.

   ```plaintext
   Open the triage issues canvas
   ```

3. 이제 새 세션에서 만든 캔버스가 열리는 것을 확인합니다.
4. 가장 관심 있는 이슈 중 하나에서 **Add to current context**를 선택합니다.
5. Copilot이 이슈 작업을 시작합니다.

이제 직접 만든 캔버스를 사용하여 개발 프로세스를 간소화했습니다.

## 요약 및 다음 단계

사용자와 에이전트가 협업하는 공유 화면을 만들었습니다. 다음 작업을 수행했습니다.

- 캔버스의 개념과 사용 시점을 배웠습니다.
- 에이전트와 공유 Kanban 분류 보드 캔버스를 만들었습니다.
- Agent Merge를 사용하여 캔버스를 리포지토리에 저장하고 병합했습니다.
- 새 세션에서 캔버스를 열고 캔버스를 사용하여 작업을 시작했습니다.

백로그를 추적하도록 설정했으므로 지금까지 구축한 항목과 다음 단계를 돌아봅니다. [레슨 8 - 검토 및 다음 단계][next-lesson]를 계속 진행합니다.

## 리소스

- [GitHub Copilot app에서 캔버스 확장 사용][canvas-docs]
- [Awesome Copilot의 캔버스][awesome-copilot-canvases]
- [GitHub Copilot app 정보][about-copilot-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/8-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app