---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[**GitHub Copilot app**](https://docs.github.com/copilot/concepts/agents/github-copilot-app)은 Copilot CLI를 기반으로 구축된 데스크톱 애플리케이션으로, 에이전트 기반 개발을 하나의 집중된 워크스페이스에서 수행할 수 있게 해 줍니다. 병렬 에이전트 세션, 전환 가능한 세션 모드, 공유 캔버스, GitHub 이슈 및 끌어오기 요청 기본 관리 기능을 제공합니다. 여기에는 끌어오기 요청의 리베이스, 검토 피드백, CI 수정, 병합 과정을 관리하는 **Agent Merge**도 포함됩니다.

이 레슨에서는 앱을 설치하고 프로젝트를 설정한 다음, 앱 워크스페이스와 템플릿에서 미리 생성한 백로그를 살펴봅니다. 별점을 추가하는 작은 변경으로 시작한 뒤, 이슈를 바탕으로 사용자 지정 지침 표준을 추가하고, 격리된 에이전트 세션에서 필터링 기능을 구축하고, 재사용 가능한 스킬로 검증합니다. Playwright MCP 서버를 추가하여 실제 브라우저에서 기능을 살펴본 다음, **Agent Merge**가 끌어오기 요청을 병합하는 단계까지 병합 자동화 수준을 높입니다. 마지막으로 공유 캔버스에서 협업하고 반복 작업을 자동화하여 아이디어를 병합된 기능으로 완성하는 전체 과정을 경험합니다.

## 레슨

| 레슨 | 주제 | 설명 |
|--------|-------|-------------|
| [0. 필수 조건][ex0] | 설정 | Node.js를 설치하고 Tailspin Toys 프로젝트의 복사본 만들기 |
| [1. Copilot app 설치][ex1] | 설정 | 앱을 설치하고 프로젝트를 연결한 다음 워크스페이스 살펴보기 |
| [2. 첫 번째 에이전트 세션 실행][ex2] | 첫 번째 변경 | 세션을 시작하고 작은 변경을 첫 번째 끌어오기 요청으로 제공하기 |
| [3. 사용자 지정 지침으로 Copilot 안내][ex3] | 컨텍스트 | 이슈를 바탕으로 문서화 표준을 추가하고 병합하기 |
| [4. Autopilot으로 기능 구축][ex4] | 핵심 기능 | Plan과 Autopilot으로 필터링 기능을 구축한 다음 스킬로 검증하기 |
| [5. Playwright MCP로 테스트][ex5] | 외부 도구 | Playwright MCP 서버를 추가하고 브라우저에서 기능 살펴보기 |
| [6. Agent Merge로 병합][ex6] | 병합 | Agent Merge가 필터링 끌어오기 요청을 수정하고 병합하도록 하기 |
| [7. 캔버스로 계획 수립][ex7] | 협업 | 작업을 계획하고 추적하는 공유 캔버스 만들기 |
| [8. 검토 및 다음 단계][ex8] | 요약 | 반복 작업을 자동화하고 다음에 살펴볼 내용 알아보기 |

## 필수 조건

워크숍에 참여하기 전에 다음 항목을 준비했는지 확인합니다.

- [ ] 활성 **Copilot Student, Pro, Pro+, Business, or Enterprise** 플랜이 있는 GitHub 계정
- [ ] **macOS, Linux, or Windows**를 실행하는 컴퓨터
- [ ] 컴퓨터에 [Git 설치][install-git]

> [!TIP]
> 유료 플랜이 없습니까? 인증된 학생은 [GitHub Education][callout-student-plan-education]을 통해 GitHub Copilot을 무료로 사용할 수 있습니다. **Copilot Student** 플랜에는 이 워크숍에서 사용하는 에이전트, MCP, 코드 검토, Copilot CLI 기능이 포함되어 있으므로 모든 실습 과정을 완료할 수 있습니다.

> [!NOTE]
> Copilot app은 codespace가 아니라 사용자의 컴퓨터에서 실행되므로, [레슨 0][ex0]에서는 앱을 설치하기 전에 Node.js를 설치하고 프로젝트 복사본을 만드는 방법을 안내합니다.

> [!NOTE]
> Copilot Business 또는 Copilot Enterprise를 사용하는 경우 앱을 사용하려면 관리자가 **Copilot CLI** 정책을 활성화해야 합니다.

## 시작하기

[**레슨 0: 필수 조건부터 시작 →**][ex0]

[ex0]: /ko-kr/learning-hub/copilot-workshops/app/0-prerequisites/
[ex1]: /ko-kr/learning-hub/copilot-workshops/app/1-install-copilot-app/
[ex2]: /ko-kr/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /ko-kr/learning-hub/copilot-workshops/app/3-custom-instructions/
[ex4]: /ko-kr/learning-hub/copilot-workshops/app/4-build-filtering/
[ex5]: /ko-kr/learning-hub/copilot-workshops/app/5-mcp-playwright/
[ex6]: /ko-kr/learning-hub/copilot-workshops/app/6-agent-merge/
[ex7]: /ko-kr/learning-hub/copilot-workshops/app/7-canvases/
[ex8]: /ko-kr/learning-hub/copilot-workshops/app/8-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students