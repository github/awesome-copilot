---
title: "레슨 7 - QA 에이전트 만들기 및 사용"
description: "테스트 커버리지, quality-checks 스킬, 직접 관찰한 브라우저 근거를 통합하는 요구 사항 우선 QA 프로필을 만듭니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

`quality-checks` 스킬로 자동 검사를 실행하고 Playwright MCP로 브라우저에서 필터링 환경을 관찰했습니다. 이제 명확하게 정의된 QA 프로세스를 가진 사용자 지정 에이전트에서 이러한 기능을 함께 사용합니다.

이 레슨에서는 다음을 수행합니다.

- 사용자 지정 에이전트가 지침, 스킬, MCP 도구와 함께 작동하는 방식을 이해합니다.
- 재사용 가능한 QA 프로필을 만들고 검토합니다.
- QA 에이전트를 선택하고 필터링 이슈와 비교해 결과를 검토합니다.

## 시나리오

Tailspin Toys는 끌어오기 요청(PR)을 열기 전에 요구 사항, 코드 품질, 자동 검사, 테스트 커버리지, 브라우저 동작을 일관되게 검토하려고 합니다. 사용자 지정 에이전트가 이 QA 프로세스를 조정하고 재사용 가능한 보고서를 제공할 수 있습니다.

## 사용자 지정 에이전트란?

사용자 지정 에이전트는 Markdown 프로필로 정의하는 특수한 Copilot입니다. 프로필은 에이전트의 목적, 지침, 사용 가능한 도구를 설명합니다. 이 워크숍에서는 `.github/agents/qa.agent.md`에 QA 역할을 정의하고 앱에서 선택합니다.

지금까지 만든 사용자 지정 요소는 서로 다른 역할을 합니다. 리포지토리 지침은 팀 표준을 설명합니다. quality-checks 스킬은 반복 가능한 검사를 묶습니다. Playwright MCP는 브라우저 도구를 제공합니다. QA 프로필은 이러한 기능을 사용해 요구 사항을 평가하고 결과를 보고하는 방법을 Copilot에 지시합니다. 기존 기능을 대체하거나 별도 에이전트 세션을 요구하지 않습니다.

## QA 프로필 만들기

기능 PR을 열기 전에 Copilot에 재사용 가능한 QA 프로필을 만들도록 요청합니다. 프로필에는 QA가 수행하는 검사와 따라야 할 경계를 모두 정의합니다.

1. 세션이 **Interactive** 모드인지 확인합니다.
2. 다음 프롬프트를 Copilot에 보내 새 사용자 지정 에이전트를 만듭니다.

    ```plaintext
    Create a custom agent named QA in .github/agents/qa.agent.md. It should check features against their issues and agreed requirements, follow the repository instructions, run the quality-checks skill, use Playwright MCP to verify behavior, and add tests when coverage is missing.

    Have it report each requirement as pass, fail, or blocked with supporting evidence. It must ask before changing implementation code, and it must not commit changes or open pull requests. Use the current model and available tools. Just create the profile for now so I can review it.
    ```

## 프로필 검토

1. **Changes**를 열고 `.github/agents/qa.agent.md`를 선택합니다.
2. 프런트매터를 읽습니다. `description`은 필수이며 `name`은 선택 사항이지만, 포함하면 에이전트에 명확한 표시 이름이 생깁니다.
3. 프로필 지침을 읽고 QA가 요구 사항에서 시작하고, 리포지토리 지침을 따르고, `quality-checks` 스킬을 실행하고, Playwright MCP를 사용하는지 확인합니다.
4. QA가 근거를 보고하고, 구현 코드를 변경하기 전에 확인을 요청하고, 커밋하거나 끌어오기 요청을 열지 않는지 확인합니다.
5. 생성된 프로필에 이러한 책임이나 경계가 빠져 있으면 계속하기 전에 일반 Copilot 에이전트에 수정을 요청합니다.

## 이슈에 대한 QA 실행

프로필을 검토했으므로 현재 세션에서 QA를 선택합니다. 그러면 이미 컨텍스트에 있는 필터링 이슈와 계획 결정을 사용할 수 있습니다. 검토를 요청하기 전에 활성 에이전트를 확인합니다.

1. 현재 세션의 프롬프트 상자에서 에이전트 선택기를 엽니다.
2. **QA**를 선택하고 실행 프롬프트를 보내기 전에 앱이 **QA**를 활성 에이전트로 명확히 표시하는지 확인합니다.
3. 다음 프롬프트로 QA에 기능 검토를 요청합니다.

    ```plaintext
    Review the filtering feature against the issue and the decisions in our plan. Is it ready for a PR?
    ```

4. QA가 올바른 이슈와 계획 결정을 사용하는지 확인합니다. 요청하면 이슈 URL이나 누락된 컨텍스트를 제공합니다.
5. 작업이 끝나면 제공된 보고서를 읽습니다.

## 요약 및 다음 단계

워크플로에 재사용 가능한 전문가 역할을 추가하고 그 작업을 검토했습니다. 이 레슨에서는 다음을 수행했습니다.

- 사용자 지정 에이전트가 지침, 스킬, MCP 도구와 함께 작동하는 방식을 살펴봤습니다.
- 요구 사항에서 시작하는 재사용 가능한 QA 프로필을 만들고 검토했습니다.
- QA 에이전트를 선택하고 필터링 이슈와 비교하여 결과를 검토했습니다.

이제 검토에 필요한 구현, 스킬 업데이트, QA 프로필, 테스트, 검증 보고서를 갖췄습니다. [레슨 8 - 기능 PR 생성 및 병합][next-lesson]에서 이를 함께 검토하고 Agent Merge를 사용합니다.

## 리소스

- [사용자 지정 에이전트 선택을 포함한 GitHub Copilot App 사용자 지정][customize-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/8-create-pull-request/
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
