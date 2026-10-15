---
title: "레슨 0 - 사전 준비 및 설정"
description: "워크숍의 사전 준비 사항을 확인하고, VS Code의 Copilot Chat을 확인하고, GitHub Pull Requests and Issues 확장을 추가하고, 모델을 선택합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

편집기에서 Copilot을 사용합니다. VS Code에는 Copilot이 포함되어 있으므로 채팅을 위해 따로 설치할 필요가 없습니다. GitHub 확장을 추가한 다음 빈 폴더를 엽니다.

이 레슨에서는 다음 작업을 수행합니다.

- 워크숍의 사전 준비 사항을 확인합니다.
- VS Code에서 Copilot Chat이 응답하는지 확인합니다.
- GitHub Pull Requests and Issues 확장을 설치합니다.
- 빈 프로젝트 폴더를 열고 모델을 선택합니다.

## 사전 준비

다음 사항이 필요합니다.

- GitHub 계정. [GitHub 계정을 만들거나][github-signup] 기존 계정을 사용합니다.
- 활성 Copilot 플랜. [Copilot Free 또는 유료 Copilot 플랜을 활성화합니다][copilot-plans]. 조직에서 이미 Copilot 액세스를 제공한다면 해당 계정을 사용합니다.
- [Visual Studio Code][vscode].
- 설치된 [Git][git]. 터미널에서 `git --version`을 실행하여 확인합니다.

## VS Code 설정

1. [VS Code][vscode]를 설치하고 GitHub에 로그인합니다. Copilot과 Copilot Chat은 기본 제공되므로 제목 표시줄에서 **Chat** 보기를 열고 응답하는지 확인합니다.
2. **Extensions** 보기를 열고 공식 [GitHub Pull Requests and Issues][pr-extension] 확장을 설치하여 사이드바에 이슈와 풀 리퀘스트(Pull request)가 표시되도록 합니다.
3. `space-quiz`라는 빈 폴더를 만든 다음 **File** > **Open Folder**를 선택하여 엽니다.
4. 다음 섹션의 우선순위에 따라 **Chat** 보기의 모델 선택 도구에서 모델을 선택합니다.

## 모델 선택

사용 가능한 첫 번째 옵션을 선택합니다.

1. **GPT-6-Luna**(권장).
2. 균형 잡힌 대안인 **Auto**.
3. [활성 모델 목록][active-models]의 모델 중 하나.

사용할 수 있는 모델은 플랜, 조직 정책, 제품 버전에 따라 달라집니다.

## 요약 및 다음 단계

VS Code에 Copilot Chat, GitHub 확장, 빈 `space-quiz` 폴더가 준비되었습니다. [레슨 1: 워크스페이스에서 만들기][next-lesson]를 계속 진행합니다.

[github-signup]: https://github.com/signup
[copilot-plans]: https://github.com/features/copilot/plans
[vscode]: https://code.visualstudio.com/
[git]: https://git-scm.com/downloads
[pr-extension]: https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github
[active-models]: https://docs.github.com/copilot/reference/copilot-billing/models-and-pricing
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/1-build-and-polish/
