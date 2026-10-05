---
title: "레슨 0 - 사전 준비 및 설정"
description: "워크숍의 사전 준비 사항을 확인하고, GitHub Copilot CLI를 설치하고, 로그인하고, 빈 프로젝트 폴더에서 모델을 선택합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

터미널에서 에이전트를 사용합니다. 필요한 사항을 확인하고, GitHub Copilot CLI를 설치하고, 로그인하고, 빈 폴더에서 첫 요청을 보낼 준비를 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 워크숍의 사전 준비 사항을 확인합니다.
- GitHub Copilot CLI를 설치하고 로그인합니다.
- 프로젝트 폴더를 만들고 신뢰하도록 설정합니다.
- 세션에서 사용할 모델을 선택합니다.

## 사전 준비

다음 사항이 필요합니다.

- GitHub 계정. [GitHub 계정을 만들거나][github-signup] 기존 계정을 사용합니다.
- 활성 Copilot 플랜. [Copilot Free 또는 유료 Copilot 플랜을 활성화합니다][copilot-plans]. 조직에서 이미 Copilot 액세스를 제공한다면 해당 계정을 사용합니다.
- 설치된 [Git][git]. `git --version`을 실행하여 확인합니다.
- macOS, Windows 또는 Linux를 실행하는 컴퓨터.

[GitHub CLI][gh-cli](`gh`)는 선택 사항이지만 권장합니다. 에이전트가 대신 리포지토리와 풀 리퀘스트(Pull request)를 만들 수 있게 해 주기 때문입니다.

> [!NOTE]
> Copilot Business 또는 Copilot Enterprise를 사용하는 경우, 관리자가 **Copilot CLI** 정책을 활성화해야 에이전트 세션이 작동합니다.

## CLI 설정

1. 플랫폼에 맞는 [GitHub Copilot CLI][install-cli]를 설치합니다.
2. 프로젝트 폴더를 만들고 해당 폴더로 이동합니다.

   ```bash
   mkdir space-quiz && cd space-quiz
   ```

3. `copilot`을 실행하고 로그인한 다음 메시지가 표시되면 폴더를 신뢰하도록 설정합니다.
4. `/model`을 실행하고 다음 섹션의 우선순위에 따라 모델을 선택합니다.
5. 아직 설치하지 않았다면 선택적으로 [GitHub CLI][gh-cli]를 설치합니다.

![space-quiz라는 제목의 터미널 창에 표시된 Copilot CLI 일러스트레이션. 이 폴더의 파일을 신뢰할지 묻고 Yes, proceed가 선택되어 있으며, 세션의 모델을 선택하는 /model 명령과 모든 슬래시 명령을 나열하는 /help 명령을 제안합니다. 프롬프트 줄에는 Create a space exploration quiz가 표시되어 있습니다.](/images/learning-hub/copilot-workshops/first-steps-cli-welcome.svg)

CLI는 신뢰 여부를 묻는 메시지와 `/model` 등 몇 가지 시작 명령을 표시합니다.

> [!TIP]
> 언제든 `/`를 입력하여 사용 가능한 모든 명령을 살펴보거나, `/help`를 실행하여 전체 참조 정보를 확인합니다.

## 모델 선택

`/model`을 실행할 때 다음 우선순위에 따라 사용 가능한 첫 번째 옵션을 선택합니다.

1. **GPT-6-Luna**(권장).
2. 균형 잡힌 대안인 **Auto**.
3. [활성 모델 목록][active-models]의 모델 중 하나.

사용할 수 있는 모델은 플랜, 조직 정책, 제품 버전에 따라 달라집니다.

## 요약 및 다음 단계

Copilot CLI를 설치하고 로그인했으며, 빈 `space-quiz` 폴더에서 실행 중입니다. [레슨 1: 터미널에서 퀴즈 만들기][next-lesson]를 계속 진행합니다.

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[git]: https://git-scm.com/downloads
[gh-cli]: https://cli.github.com/
[install-cli]: https://docs.github.com/copilot/how-tos/set-up/install-copilot-cli
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/1-build/
