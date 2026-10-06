---
title: "레슨 6 - Playwright MCP로 기능 검증"
description: "Customize에서 Playwright MCP를 구성하고 기존 기능 워크트리의 필터링을 브라우저에서 관찰합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

앞서 강조했듯이 코드 작성에는 코드 자체를 작성하는 것보다 더 많은 작업이 필요합니다. 데이터와 외부 서비스를 사용하고 Copilot에 추가 자동화 기능을 제공해야 합니다. 이때 MCP 서버를 사용합니다. MCP 서버는 Copilot이 앱에 기본 제공된 기능을 넘어 더 많은 도구와 서비스를 사용하도록 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Model Context Protocol (MCP)의 개념과 GitHub Copilot app에서 사용하는 방식을 이해합니다.
- **Customize**에서 Playwright MCP 서버를 추가합니다.
- 에이전트에게 브라우저를 조작하여 필터링 기능을 살펴보도록 요청합니다.

## 시나리오

단위 테스트와 엔드투엔드 테스트도 중요하지만 UI 업데이트를 검증하려면 실제로 UI와 상호 작용해야 합니다. Copilot이 사용자처럼 작업 중인 웹사이트를 사용하도록 하여 변경 작업을 더 자동화하고, 업데이트가 예상대로 작동한다는 확신을 높이려고 합니다.

## Model Context Protocol (MCP)이란?

[Model Context Protocol (MCP)][mcp-blog-post]은 AI 에이전트가 외부 도구 및 서비스와 통신하는 방법을 제공합니다. MCP를 사용하면 AI 에이전트가 외부 도구 및 서비스와 실시간으로 통신할 수 있습니다. 따라서 리소스를 사용하여 최신 정보에 접근하고 도구를 사용하여 사용자를 대신해 작업을 수행할 수 있습니다.

이러한 도구와 리소스에는 AI 에이전트와 외부 도구 및 서비스를 연결하는 MCP 서버를 통해 접근합니다. MCP 서버는 AI 에이전트와 외부 도구(예: 기존 API 또는 NPM 패키지 같은 로컬 도구) 간의 통신을 관리합니다. 각 MCP 서버는 AI 에이전트가 접근할 수 있는 서로 다른 도구 및 리소스 집합을 나타냅니다.

널리 사용되는 기존 MCP 서버의 예는 다음과 같습니다.

- [**GitHub MCP Server**](https://github.com/github/github-mcp-server): GitHub 리포지토리 관리를 위한 API 집합에 접근할 수 있게 합니다. AI 에이전트가 새 리포지토리 만들기, 기존 리포지토리 업데이트, 이슈 및 끌어오기 요청 관리 같은 작업을 수행할 수 있습니다.
- [**Playwright MCP Server**][playwright-mcp-server]: Playwright를 사용하는 브라우저 자동화 기능을 제공합니다. AI 에이전트가 웹페이지 이동, 양식 작성, 버튼 선택 같은 작업을 수행할 수 있습니다.

다양한 도구와 리소스에 접근할 수 있는 다른 MCP 서버도 많습니다. GitHub는 MCP 서버를 쉽게 찾고 생태계에 기여할 수 있도록 [MCP registry](https://github.com/mcp)를 호스팅합니다.

> [!CAUTION]
> MCP 서버를 프로젝트의 다른 종속성과 동일하게 취급합니다. MCP 서버를 사용하기 전에 소스 코드를 주의 깊게 검토하고, 게시자를 확인하고, 보안 영향을 고려합니다. 신뢰하는 MCP 서버만 사용하고 중요한 리소스나 작업에 대한 접근 권한을 부여할 때 주의합니다.

## Playwright MCP 서버 추가

사이드바의 **Customize**에서 MCP 서버를 관리합니다. 리포지토리나 Copilot CLI에 구성한 서버를 App에서 이미 사용할 수도 있으므로 중복 추가 전에 확인합니다. [App 사용자 지정 문서][customize-app]에서 사용 가능한 옵션을 설명합니다.

1. 사이드바에서 **Customize**를 선택합니다.
2. **MCP**를 선택한 다음 **Installed**에서 기존 Playwright 서버를 확인합니다.
3. 필요하면 사용 가능한 서버에서 **Playwright**를 찾거나 게시자가 문서화한 사용자 지정 서버 추가 절차를 사용합니다.
4. 게시자, 구성, 설치 요청을 검토한 후 승인합니다. 안내에 따라 서버를 추가합니다. 조직 정책이나 누락된 필수 조건으로 설정이 차단될 수 있습니다.
5. **Interactive** 모드의 필터링 세션으로 돌아가 Playwright MCP 도구를 사용할 수 있는지 확인합니다.

설정이 실패하면 계속하기 전에 구성이나 권한 문제를 해결합니다.

## Copilot에 Playwright로 기능 탐색 요청

필터링을 계획하고 구현한 세션에서 계속합니다. 이슈와 합의한 결정이 이미 컨텍스트에 있습니다. Copilot에 서버 시작을 요청하기 전에 앞서 직접 시작한 개발 서버를 중지합니다.

1. 다음 프롬프트를 사용하여 새 기능을 검증하도록 Copilot에 요청합니다.

    ```plaintext
    Start the app and use Playwright MCP to check filtering against the issue and our plan. Tell me what works and what doesn't, without making changes. Stop the server you started when you're done.
    ```

> [!NOTE]
> Copilot에 특정 MCP 서버를 사용하도록 지시할 필요는 없습니다. 일반적으로 현재 컨텍스트를 바탕으로 올바른 서버를 찾습니다. 하지만 중요하다고 생각하는 내용을 Copilot에 알려도 좋습니다.

  2. 작업 과정을 지켜봅니다.

  Copilot은 서버를 시작하고 브라우저를 열어 웹사이트와 상호 작용합니다. 완료되면 서버를 중지하고 보고서를 제공합니다.

## 요약 및 다음 단계

GitHub Copilot app에서 Playwright MCP 서버를 사용하여 실제 브라우저로 기능을 살펴봤습니다. 요약하면 다음 작업을 수행했습니다.

- Model Context Protocol (MCP)의 개념과 앱에서 MCP 도구를 제공하는 방식을 배웠습니다.
- **Customize**에서 Playwright MCP 서버를 구성했습니다.
- 에이전트에게 브라우저를 조작하여 필터링 기능을 살펴보도록 요청했습니다.

다음으로 [레슨 7 - QA 에이전트 만들기 및 사용][next-lesson]에서 전문가 역할을 통해 스킬과 브라우저 도구를 결합합니다.

## 리소스

- [MCP란 무엇이며 왜 모두가 이야기할까요?][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [GitHub Copilot app에서 MCP 서버 구성][customize-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/7-qa-agent/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app