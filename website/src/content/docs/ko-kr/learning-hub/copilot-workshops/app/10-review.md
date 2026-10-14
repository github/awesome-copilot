---
title: "레슨 10 - 마무리 및 다음 단계"
description: "App 워크플로, 두 PR 마일스톤, 캔버스 실습, 재사용 가능한 품질 관행을 돌아보고 추가 리소스를 살펴봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

하나로 이어지는 Tailspin Toys 워크플로 전체에서 GitHub Copilot app을 사용했습니다. 다음 작업을 수행했습니다.

- 리포지토리를 연결하고 앱의 워크스페이스와 미리 생성된 백로그를 살펴보고 빠른 채팅을 사용했습니다.
- 별점에 초점을 맞춘 세션을 시작하고 브라우저 캔버스에서 결과를 검토한 다음 첫 번째 끌어오기 요청(PR)을 직접 병합했습니다.
- 필터링 이슈에서 시작하여 **Plan** 모드에서 접근 방식을 정의하고, **Autopilot** 모드로 구축하고, **Interactive** 모드에서 검토했습니다.
- 사용자 지정 지침으로 에이전트를 안내한 다음 기존 `quality-checks` 스킬을 사용자 지정하고 단위 테스트, 린트, 타입 검사를 실행하는 데 사용했습니다.
- Playwright Model Context Protocol(MCP) 서버를 추가하고 실제 브라우저에서 필터링을 살펴보는 데 사용했습니다.
- 품질 보증(QA) 사용자 지정 에이전트를 만들고 선택하여 요구 사항, 커버리지, 스킬 결과, 브라우저 근거를 평가했습니다.
- 완성된 필터링 변경을 검토하고 두 번째 PR에 **Agent Merge**를 승인했습니다.
- 기존 Database Explorer 캔버스를 사용한 다음, 리포지토리에 저장되는 이슈 분류 캔버스를 만들고 테스트했습니다.

## 제공한 결과

워크숍에는 두 번의 PR 마일스톤이 있으며, 각각 업데이트된 `main`에서 시작한 자체 브랜치를 사용합니다.

1. **별점:** 게임 카드에 기존 `starRating`과 명시적인 미평가 상태를 표시합니다.
2. **필터링과 품질 워크플로:** 필터링을 구현하고, 지침을 업데이트하여 기능에 적용하고, `quality-checks` 보고서를 사용자 지정하고, QA 프로필을 만들고, 관련 테스트를 포함합니다.

필터링 계획부터 PR을 열 때까지 동일한 세션, 워크트리, 브랜치를 사용했습니다. 워크숍을 간소화하기 위해 이 작업을 하나의 PR로 결합했습니다. 이후 기존 Database Explorer를 사용하고 PR 워크플로를 반복하지 않은 채 리포지토리에 저장되는 이슈 분류 캔버스를 만들었습니다.

## 서로 다른 검증 방식

자동 테스트, 직접 수행한 브라우저 확인, MCP를 통한 Copilot의 브라우저 탐색 등 여러 방식으로 코드를 검사했습니다. `quality-checks` 스킬은 단위 테스트, 린트, 타입 검사를 실행하여 새로운 형식으로 결과를 보고했습니다. QA는 PR 전에 이 결과를 요구 사항 및 테스트 커버리지 검토와 결합했습니다.

추가한 테스트는 실제 커버리지 부족을 해결해야 합니다. 새 테스트가 필요 없는 QA 실행도 올바를 수 있습니다. 누락된 도구, 건너뛴 검사, 실패는 드러내야 할 차단 요인이지 통과가 아닙니다. 병합 승인 전에 코드와 근거를 검토하고 변경 후 관련 근거를 갱신합니다.

## 모범 사례

Copilot에 제공하는 컨텍스트와 도구는 작업 방식에 영향을 줍니다. 이 워크숍에서는 지침을 업데이트하고, 스킬을 사용자 지정하고, QA 프로필을 만들고, MCP 서버를 구성하고, 캔버스를 만들었습니다. 세션 간에 이러한 사용자 지정을 재사용하고 팀의 요구가 바뀌면 조정합니다. 지침은 표준을 정하고, 스킬은 반복 가능한 작업을 설명하며, 사용자 지정 에이전트는 전문가 역할을 정의하고, MCP 서버는 외부 도구를 연결하며, 캔버스는 공유 대화형 화면을 제공합니다. 에이전트의 요약뿐 아니라 실제 변경 내용과 도구 결과를 검토합니다.

작업에 맞는 **모드와 모델**을 선택합니다. 구축 전에 접근 방식을 검토하려면 **Plan**을 사용하고, 범위가 명확한 변경에서 계속 참여하려면 **Interactive**를 사용하며, 범위가 명확하고 격리된 작업에만 **Autopilot**을 사용합니다. 일상적인 편집에는 빠른 모델을 선택하고 복잡한 작업에는 추론 능력이 더 높은 모델을 선택합니다.

컨텍스트는 인프라만큼 중요합니다. 만들려는 *항목*, 그 *이유*, 원하는 *방식*을 명확하게 설명하면 출력이 크게 달라집니다. 빠른 채팅은 아이디어를 전체 세션에 적용하기 전에 범위를 정하기에 적합합니다.

## 더 살펴볼 내용

핵심 워크플로를 모두 살펴봤습니다. 다음 기능도 확인해 볼 만합니다.

- 최근 작업 요약 같은 반복 또는 요청 시 작업을 위한 [**Automations**][using-automations]. 도입 전에 일정, 권한, 범위를 검토합니다. 자동화 만들기는 다음 단계이며 이 워크숍에 포함되지 않습니다.
- 구축 전에 문제를 함께 검토하고 유용한 피드백을 받기 위한 **Rubber duck**
- 세션에서 일어난 일을 서술형으로 생성하는 [`/chronicle`][chronicle]
- Ollama, Foundry Local, LM Studio를 통한 로컬 모델을 포함하여 자체 공급자의 모델을 사용하는 [Bring your own key (BYOK)][byok]
- 리포지토리, 세션, 프롬프트에서 바로 앱을 여는 [Deep links][deep-links]

## 다음 단계

어떤 도구든 더 능숙하게 사용하려면 계속 사용해야 합니다. 프로덕션 코드, 취미 프로젝트, 오랫동안 생각만 하고 만들지 못했던 작은 앱에 사용해 봅니다. 배운 내용을 팀과 공유하고 팀의 경험에서도 배웁니다. 언제나 그렇듯 문서를 살펴봅니다.

GitHub Copilot 생태계를 더 살펴보려면 [VS Code 실습 과정][vscode-harness], [Copilot CLI 실습 과정][cli-harness], [Cloud agent 실습 과정][cloud-harness]을 확인합니다.

## 리소스

- [GitHub Copilot app 정보][about-copilot-app]
- [GitHub Copilot app 시작하기][getting-started]
- [GitHub Copilot app 사용자 지정][customize]
- [자동화 사용][using-automations]
- [캔버스 확장 사용][canvas-docs]

[vscode-harness]: /ko-kr/learning-hub/copilot-workshops/vscode/
[cli-harness]: /ko-kr/learning-hub/copilot-workshops/cli/
[cloud-harness]: /ko-kr/learning-hub/copilot-workshops/cloud/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[customize]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[using-automations]: https://docs.github.com/copilot/how-tos/github-copilot-app/using-automations
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[chronicle]: https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/chronicle
[byok]: https://docs.github.com/copilot/how-tos/github-copilot-app/use-byok-models
[deep-links]: https://docs.github.com/copilot/how-tos/github-copilot-app/open-with-deep-links