---
title: "GitHub Copilot app"
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
tags:
  - workshop
---

[**GitHub Copilot app**](https://docs.github.com/copilot/concepts/agents/github-copilot-app)은 Copilot CLI를 기반으로 구축된 데스크톱 애플리케이션으로, 에이전트 기반 개발을 하나의 집중된 워크스페이스에서 수행할 수 있게 해 줍니다. 병렬 에이전트 세션, 전환 가능한 세션 모드, 공유 캔버스, GitHub 이슈 및 끌어오기 요청 기본 관리 기능을 제공합니다. 여기에는 끌어오기 요청의 리베이스, 검토 피드백, 지속적 통합(CI) 수정, 병합 과정을 관리하는 **Agent Merge**도 포함됩니다.

워크숍은 하나로 이어지는 Tailspin Toys 워크플로를 따릅니다.

1. 프로젝트를 준비하고, 앱을 설치하고, 리포지토리를 연결하고, 워크스페이스와 미리 생성된 백로그를 살펴봅니다.
2. 별점에 초점을 맞춘 변경을 수행하고 브라우저에서 검토한 다음 첫 번째 끌어오기 요청(PR)을 직접 병합합니다.
3. 필터링 이슈에서 시작하여 **Plan** 모드에서 접근 방식을 정의하고, **Autopilot** 모드로 구축한 다음, **Interactive** 모드에서 검토합니다.
4. 리포지토리 지침을 업데이트하고 필터링 작업에 적용합니다.
5. 기존 `quality-checks` 스킬을 사용자 지정하고 프로젝트 검사에 사용합니다.
6. Playwright Model Context Protocol(MCP) 서버를 추가하고 브라우저에서 필터링을 살펴보는 데 사용합니다.
7. 품질 보증(QA) 사용자 지정 에이전트를 만들고 요구 사항, 커버리지, 검증 근거를 검토하는 데 사용합니다.
8. 완성된 필터링 변경을 검토하고 두 번째 PR에 Agent Merge를 사용합니다.
9. 기존 Database Explorer 캔버스를 사용한 다음, 리포지토리에 저장되는 이슈 분류 캔버스를 만들고 테스트합니다.

워크숍에 집중할 수 있도록 별점 PR과 필터링 PR의 두 PR을 만듭니다. 필터링 PR에는 지침 업데이트, 스킬 업데이트, QA 프로필, 테스트도 포함됩니다. 각 PR은 업데이트된 `main`에서 시작합니다. 필터링과 품질 워크플로는 하나의 세션, 워크트리, 브랜치를 공유하므로 각 도구를 살펴보면서 앞선 작업을 이어 갈 수 있습니다. 마지막 캔버스 연습은 해당 세션에 유지되므로 PR 워크플로를 반복하지 않고 공유 화면을 만들고 테스트하는 데 집중할 수 있습니다.

## 레슨

| 레슨 | 주제 | 설명 |
|--------|-------|-------------|
| [0. 필수 조건][ex0] | 설정 | Node.js를 설치하고 Tailspin Toys 프로젝트의 복사본 만들기 |
| [1. Copilot app 설치][ex1] | 설정 | 앱을 설치하고 프로젝트를 연결한 다음 워크스페이스 살펴보기 |
| [2. 별점 추가로 작은 성과 얻기][ex2] | 첫 번째 변경 | 기존 별점과 null 대체 표시를 추가하고 PR 1 병합하기 |
| [3. 에이전트 모드: Plan 및 Autopilot][ex3] | 에이전트 모드 | 이슈를 바탕으로 기능을 계획하고 Autopilot으로 구축한 다음 Interactive 모드에서 검토하기 |
| [4. 사용자 지정 지침으로 Copilot 안내][ex4] | 컨텍스트 | 지침을 살펴보고 업데이트한 다음 필터링에 적용하기 |
| [5. quality-checks 스킬 사용자 지정 및 사용][ex5] | 반복 가능한 검사 | 기존 스킬을 살펴보고 보고서 형식을 변경한 다음 실행하기 |
| [6. Playwright MCP로 기능 검증][ex6] | 브라우저 관찰 | Customize에서 MCP를 구성하고 필터링 동작 살펴보기 |
| [7. QA 에이전트 만들기 및 사용][ex7] | 요구 사항과 커버리지 | 전문가 프로필을 선택하고 최종 검증 근거 수집하기 |
| [8. 기능 PR 만들기 및 병합][ex8] | 검토와 병합 | 필터링, 지침, 스킬, QA 프로필, 테스트를 검토한 다음 두 번째 PR에 Agent Merge 사용하기 |
| [9. 캔버스 살펴보기 및 만들기][ex9] | 협업 | Database Explorer를 사용한 다음 리포지토리에 저장되는 이슈 분류 캔버스를 만들고 테스트하기 |
| [10. 마무리 및 다음 단계][ex10] | 요약 | 워크플로, 산출물, 추가 리소스 돌아보기 |

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
[ex3]: /ko-kr/learning-hub/copilot-workshops/app/3-agent-modes/
[ex4]: /ko-kr/learning-hub/copilot-workshops/app/4-custom-instructions/
[ex5]: /ko-kr/learning-hub/copilot-workshops/app/5-agent-skills/
[ex6]: /ko-kr/learning-hub/copilot-workshops/app/6-mcp-playwright/
[ex7]: /ko-kr/learning-hub/copilot-workshops/app/7-qa-agent/
[ex8]: /ko-kr/learning-hub/copilot-workshops/app/8-create-pull-request/
[ex9]: /ko-kr/learning-hub/copilot-workshops/app/9-canvases/
[ex10]: /ko-kr/learning-hub/copilot-workshops/app/10-review/
[install-git]: https://github.com/git-guides/install-git
[callout-student-plan-education]: https://github.com/education/students