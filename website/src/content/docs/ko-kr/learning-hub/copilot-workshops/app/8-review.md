---
title: "Lesson 8 - 검토 및 다음 단계"
description: "GitHub Copilot app 실습 과정을 되짚어 보고, 반복 작업을 자동화하고, 다음에 살펴볼 내용을 알아봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

지난 여러 레슨에서 GitHub Copilot app으로 아이디어를 기능으로 만들고 병합하기까지 다음 작업을 수행했습니다.

- 리포지토리를 연결하고 앱의 워크스페이스와 미리 생성된 백로그를 살펴봤습니다.
- 직접 작업과 이슈에서 세션을 시작하고 Plan 및 Autopilot 모드로 에이전트의 작업 방식을 제어했습니다.
- 사용자 지정 지침과 재사용 가능한 스킬로 에이전트를 안내했습니다.
- Playwright MCP 서버를 사용하여 실제 브라우저에서 작업을 테스트했습니다.
- 공유 캔버스에서 에이전트와 협업했습니다.
- github.com에서 직접 병합하는 단계부터 **Agent Merge**가 끌어오기 요청을 병합하는 단계까지 병합 자동화 수준을 높여 변경 내용을 제공했습니다.

이제 반복 작업을 자동화하고 모범 사례를 살펴본 다음 앞으로 진행할 방향을 알아봅니다.

## 반복 작업 자동화

앱은 **자동화**를 통해 일정에 따라 또는 요청 시 에이전트를 실행할 수 있습니다. 새 이슈 분류나 최근 활동 요약 같은 일상적인 작업에 유용합니다. 간단하고 비파괴적인 자동화를 하나 만듭니다.

1. 사이드바에서 **Automations**를 선택한 다음 **New automation**을 선택합니다.
2. `Recap my recent work` 같은 이름을 지정합니다.
3. 트리거를 선택합니다. **Manual**은 요청 시 실행하고, **On a schedule**은 자동으로 실행하며, **When an issue is created**는 새 이슈에 반응합니다. 이 레슨에서는 **Manual**을 선택합니다.
4. 자동화가 내용을 변경할 수 없도록 다음과 같은 읽기 전용 프롬프트를 입력합니다.

   ```plaintext
   Summarize the pull requests merged in this repository over the last week, and list any issues still open in the backlog.
   ```

5. 프로젝트(Tailspin Toys 리포지토리)를 선택하고 자동화를 만듭니다.
6. 요청 시 실행하여 결과를 확인합니다.

> [!TIP]
> 자동화는 로컬 또는 클라우드에서 실행할 수 있습니다. 일정에 따라 사용자 없이 실행하려면 **Run in the cloud**를 활성화하고 자동화에서 사용할 수 있는 **Tools**를 선택합니다. 출력 결과를 신뢰할 수 있을 때까지 예약 자동화의 범위를 제한하고 비파괴적으로 유지합니다.

## 모범 사례

AI 도구를 사용할 때는 도구를 둘러싼 인프라가 결과의 품질을 좌우합니다. 이 워크숍에서는 지침 파일, 스킬, 사용자 지정 에이전트를 모두 사용했습니다. 이러한 항목에 투자하고 세션 간에 재사용합니다.

작업에 맞는 **모드와 모델**을 선택합니다. 구축 전에 접근 방식을 검토하려면 **Plan**을 사용하고, 범위가 명확한 변경에서 계속 참여하려면 **Interactive**를 사용하며, 범위가 명확하고 격리된 작업에만 **Autopilot**을 사용합니다. 일상적인 편집에는 빠른 모델을 선택하고 복잡한 작업에는 추론 능력이 더 높은 모델을 선택합니다.

컨텍스트는 인프라만큼 중요합니다. 만들려는 *항목*, 그 *이유*, 원하는 *방식*을 명확하게 설명하면 출력이 크게 달라집니다. 빠른 채팅은 아이디어를 전체 세션에 적용하기 전에 범위를 정하기에 적합합니다.

## 더 살펴볼 내용

핵심 워크플로를 모두 살펴봤습니다. 다음 기능도 확인해 볼 만합니다.

- 전체 세션이 필요 없는 빠른 일회성 질문을 위한 **Quick chats**
- 구축 전에 문제를 함께 검토하고 유용한 피드백을 받기 위한 **Rubber duck**
- 반복 가능한 전문 작업을 위해 역할, 도구, 지침을 패키지하는 [**Custom agents**][custom-agents]
- 세션에서 일어난 일을 서술형으로 생성하는 [`/chronicle`][chronicle]
- Ollama, Foundry Local, LM Studio를 통한 로컬 모델을 포함하여 자체 공급자의 모델을 사용하는 [Bring your own key (BYOK)][byok]
- GitHub에서 호스팅하는 격리된 환경에서 세션을 실행하는 [Cloud sandboxes][sandboxes]
- 리포지토리, 세션, 프롬프트에서 바로 앱을 여는 [Deep links][deep-links]

## 다음 단계

어떤 도구든 더 능숙하게 사용하려면 계속 사용해야 합니다. 프로덕션 코드, 취미 프로젝트, 오랫동안 생각만 하고 만들지 못했던 작은 앱에 사용해 봅니다. 배운 내용을 팀과 공유하고 팀의 경험에서도 배웁니다. 언제나 그렇듯 문서를 살펴봅니다.

GitHub Copilot 생태계를 더 살펴보려면 [VS Code 실습 과정](/ko-kr/learning-hub/copilot-workshops/vscode/), [Copilot CLI 실습 과정](/ko-kr/learning-hub/copilot-workshops/cli/), [Cloud agent 실습 과정](/ko-kr/learning-hub/copilot-workshops/cloud/)을 확인합니다.

## 리소스

- [GitHub Copilot app 정보][about-copilot-app]
- [GitHub Copilot app 시작하기][getting-started]
- [GitHub Copilot app 사용자 지정][customize]
- [자동화 사용][using-automations]
- [캔버스 확장 사용][canvas-docs]
- [클라우드 및 로컬 샌드박스 정보][sandboxes]

[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[custom-agents]: https://docs.github.com/copilot/concepts/agents/cloud-agent/about-custom-agents
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links