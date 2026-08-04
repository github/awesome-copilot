---
title: "Lesson 5 - Playwright MCP 서버로 테스트"
description: "GitHub Copilot app에 Playwright MCP 서버를 추가하고 에이전트에게 실제 브라우저에서 필터링 기능을 수동으로 테스트하도록 요청합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

이전 레슨에서는 프로젝트의 자동화된 테스트 도구 모음으로 필터링 기능을 만들고 검증했습니다. 테스트는 코드 검증을 자동화하지만 에이전트가 동작을 직접 확인하게 하는 것도 강력합니다. 에이전트는 자신이 만드는 실제 UI에서 발견한 문제에 대응할 수 있습니다. MCP가 AI 에이전트에 외부 기능을 제공하는 방식을 살펴보고, Copilot이 구축 중인 사이트와 직접 상호 작용할 수 있도록 Playwright MCP 서버를 추가합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Model Context Protocol (MCP)의 개념과 GitHub Copilot app에서 사용하는 방식을 이해합니다.
- 앱 설정에서 Playwright MCP 서버를 추가합니다.
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

앱 설정에서 MCP 서버를 추가하고 관리합니다. 앱에는 인기 서버 카탈로그가 포함되어 있으므로 몇 번의 선택만으로 [Playwright MCP 서버][playwright-mcp-server]를 추가할 수 있습니다.

1. <kbd>Ctrl</kbd>+<kbd>,</kbd>를 선택하여 Copilot app 설정 페이지를 엽니다.
2. **MCP servers**를 선택합니다.
3. 검색 대화 상자에 `Playwright`를 입력합니다.
4. **Popular MCP servers** 목록에서 **Playwright**를 선택합니다.
5. **Add server**를 선택하여 사용 가능한 MCP 서버 목록에 추가합니다.
6. <kbd>Esc</kbd>를 선택하여 설정 대화 상자를 닫습니다.

이제 Playwright MCP 서버를 추가했습니다.

## Copilot에 Playwright로 기능 탐색 요청

Copilot에 Playwright MCP 서버를 사용하여 기능을 수동으로 테스트하도록 요청합니다.

1. 다음 프롬프트를 사용하여 새 기능을 검증하도록 Copilot에 요청합니다.

   ```plaintext
   Start the dev server then use the Playwright MCP server to validate the functionality you just added exists. Use the details in the issue to ensure the newly added behavior matches the specs.
   ```

Copilot은 Playwright MCP 서버를 통해 브라우저를 시작하고 각 단계를 수행한 다음 발견한 내용을 보고합니다. 작업을 수행하기 위해 시스템에서 브라우저가 실제로 열리는 것을 볼 수 있습니다.

2. 이슈의 승인 조건과 비교하여 요약을 읽습니다. 올바르지 않은 부분이 있으면 후속 질문을 하거나 끌어오기 요청을 열기 전에 코드를 수정하도록 요청합니다.
3. 다음 레슨에서 이 세션을 마무리하므로 세션을 열어 둡니다.

이제 Copilot은 사용자처럼 기능을 살펴보며 브라우저에서도 기능을 검증했습니다.

## 요약 및 다음 단계

GitHub Copilot app에서 Playwright MCP 서버를 사용하여 실제 브라우저로 기능을 살펴봤습니다. 요약하면 다음 작업을 수행했습니다.

- Model Context Protocol (MCP)의 개념과 앱에서 MCP 도구를 제공하는 방식을 배웠습니다.
- 앱 설정에서 Playwright MCP 서버를 추가했습니다.
- 에이전트에게 브라우저를 조작하여 필터링 기능을 살펴보도록 요청했습니다.

기능을 구축하고 검증하고 작동하는 모습까지 확인했습니다. 이제 **Agent Merge**를 사용하여 끌어오기 요청을 열고 병합하도록 합니다. [레슨 6 - Agent Merge로 병합][next-lesson]을 계속 진행합니다.

## 리소스

- [MCP란 무엇이며 왜 모두가 이야기할까요?][mcp-blog-post]
- [Microsoft Playwright MCP Server][playwright-mcp-server]
- [GitHub Copilot app에서 MCP 서버 구성][customize-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/6-agent-merge/
[mcp-blog-post]: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
[playwright-mcp-server]: https://github.com/microsoft/playwright-mcp
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app