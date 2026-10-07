---
title: "레슨 0 - 사전 준비 및 설정"
description: "워크숍의 사전 준비 사항을 확인하고, GitHub Copilot app을 설치하고, 워크스페이스에 익숙해집니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Space Quiz를 만들기 전에 필요한 사항을 확인하고, GitHub Copilot app을 설치하고, 워크스페이스에 익숙해집니다.

이 레슨에서는 다음 작업을 수행합니다.

- 워크숍의 사전 준비 사항을 확인합니다.
- GitHub Copilot app을 설치하고 로그인합니다.
- 세션에서 사용할 모델을 선택합니다.
- 앱의 주요 작업 영역을 파악합니다.
- 간단한 채팅을 시도합니다.

## 사전 준비

다음 사항이 필요합니다.

- GitHub 계정. [GitHub 계정을 만들거나][github-signup] 기존 계정을 사용합니다.
- 활성 Copilot 플랜. [Copilot Free 또는 유료 Copilot 플랜을 활성화합니다][copilot-plans]. 조직에서 이미 Copilot 액세스를 제공한다면 해당 계정을 사용합니다.
- macOS, Windows 또는 Linux를 실행하는 컴퓨터.

앱에 Git이 포함되어 있으므로 다른 도구를 설치할 필요가 없습니다.

> [!NOTE]
> Copilot Business 또는 Copilot Enterprise를 사용하는 경우, 관리자가 **Copilot CLI** 정책을 활성화해야 에이전트 세션이 작동합니다.

## 앱 설치 및 구성

1. 운영 체제에 맞는 [GitHub Copilot app][download-app]을 다운로드하고 설치합니다.
2. 앱을 엽니다.
3. **Sign in to GitHub**를 선택하고 인증합니다.
4. 테마를 선택한 다음 **Finish**를 선택합니다.

## 모델 선택

모델을 선택할 때 다음 우선순위에 따라 사용 가능한 첫 번째 옵션을 선택합니다.

1. **GPT-6-Luna**(권장).
2. 균형 잡힌 대안인 **Auto**.
3. [활성 모델 목록][active-models]의 모델 중 하나.

사용할 수 있는 모델은 플랜, 조직 정책, 제품 버전에 따라 달라집니다.

## 주요 화면 살펴보기

앱은 개발 워크플로를 한곳에 모아 제공합니다.

- **New**: 프로젝트에서 세션을 시작하거나, 간단한 질문을 위해 **Chat**을 선택합니다.
- **Pull requests**: 모든 리포지토리의 풀 리퀘스트(Pull request)를 검토하고 추적합니다.
- **Issues**: 자신에게 할당된 이슈, 자신이 만든 이슈, 자신을 언급한 이슈를 찾습니다.
- **Automations**: 리포지토리에서 반복할 에이전트 작업을 예약합니다.
- **Customize**: 테마와 모델을 변경하고 Canvas 확장을 관리합니다.
- **Projects**: 리포지토리를 엽니다. 각 리포지토리의 세션은 그 아래에 나열됩니다.

## 간단한 채팅 시도

모든 질문에 워크스페이스가 필요한 것은 아닙니다. **New**에서 프로젝트 대신 **Chat**을 선택합니다. 채팅에는 리포지토리가 연결되어 있지 않고 파일을 편집할 수 없으므로, 실제 세션을 시작하기 전에 질문하거나 설명을 듣거나 접근 방식을 생각해 보는 가장 빠른 방법입니다.

채팅에서 다음 프롬프트를 보냅니다.

```plaintext
How does the GitHub Copilot app use worktrees?
```

## 요약 및 다음 단계

사전 준비 사항을 확인하고, 앱을 설치하고, 모델을 선택하고, 주요 작업 영역을 살펴봤습니다. [레슨 1: Space Quiz 워크스페이스 만들기][next-lesson]를 계속 진행합니다.

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[download-app]: https://gh.io/app
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/1-create-workspace/
