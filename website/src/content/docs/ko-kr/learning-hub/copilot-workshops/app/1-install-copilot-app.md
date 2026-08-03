---
title: "Lesson 1 - GitHub Copilot app 설치"
description: "GitHub Copilot app을 설치하고, 템플릿에서 만든 리포지토리를 연결하고, 워크스페이스를 살펴보고, 빠른 채팅을 사용해 봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

[**GitHub Copilot app**][about-copilot-app]은 에이전트 기반 개발을 위한 데스크톱 애플리케이션입니다. GitHub Copilot CLI를 기반으로 하며 GitHub와 기본적으로 통합되어 리포지토리, 브랜치, CI 파이프라인을 바로 사용할 수 있습니다. 모든 작업을 직접 수행하고 반복 작업을 자동화하는 방식 대신, 각자 격리된 워크스페이스에서 여러 에이전트를 병렬로 지시하는 워크플로를 위해 설계되었습니다. Node.js를 설치하고 프로젝트 복사본을 준비했으므로 이제 앱을 설치하고 해당 리포지토리를 연결합니다.

이 레슨에서는 다음 작업을 수행합니다.

- GitHub Copilot app을 설치하고 로그인합니다.
- GitHub 리포지토리에서 프로젝트를 앱에 추가합니다.
- 템플릿에서 미리 생성한 백로그를 포함하여 워크스페이스를 살펴봅니다.
- 빠른 채팅을 사용하여 앱 자체에 관해 알아봅니다.

## 시나리오

팀에서 늘어나는 백로그를 처리하기 위해 AI 에이전트를 도입하고 있습니다. Copilot app에서는 이슈 선택, 에이전트 실행, 변경 내용 검토, 끌어오기 요청 병합을 한곳에서 지시할 수 있습니다. 이 레슨에서는 앱을 설치하고 연결한 다음 프로젝트에 관한 대화를 시작하는 방법을 익힙니다.

> [!NOTE]
> 적격 Copilot 플랜인 Copilot Student 또는 유료 플랜(Pro, Pro+, Business, Enterprise)이 필요합니다. Copilot Business 또는 Copilot Enterprise를 사용하는 경우 앱을 사용하려면 관리자가 **Copilot CLI** 정책을 활성화해야 합니다.

## GitHub Copilot app 설치 및 구성

GitHub Copilot app을 사용하려면 먼저 앱을 설치해야 합니다. Windows, macOS, Linux용 버전이 제공됩니다. 앱을 설치하고 인증한 다음 Tailspin Toys 리포지토리를 앱에 추가합니다.

1. 브라우저에서 [GitHub Copilot app 랜딩 페이지][download-app]를 엽니다.
2. 플랫폼에 맞는 앱을 다운로드하고 랜딩 페이지의 지침에 따라 설치합니다.
3. 설치가 끝나면 앱을 엽니다.
4. **Sign in to GitHub**을 선택하고 안내에 따라 인증합니다. GitHub Enterprise Server를 사용하는 경우 **Use GitHub Enterprise**를 선택하고 메시지가 표시되면 서버 주소를 입력합니다.
5. 인증한 후 리포지토리를 연결하라는 메시지가 표시되면 방금 만든 `<YOUR_GITHUB_HANDLE>/tailspin-toys`라는 이름의 Tailspin Toys 리포지토리를 선택합니다.
6. **Continue**를 선택하여 온보딩을 계속합니다.
7. 테마를 선택하라는 메시지가 표시되면 가장 마음에 드는 테마를 선택한 다음 **Finish**를 선택합니다.

> [!NOTE]
> Tailspin Toys 복사본이 목록에 자동으로 나타나지 않으면 앱에서 온보딩을 완료한 후 추가할 수 있습니다. 온보딩이 끝나면 Copilot app에 홈 화면이 표시됩니다. 여기에서 **Choose from GitHub**을 선택하고 리포지토리 이름(\<YOUR_GITHUB_HANDLE\>/tailspin-toys)을 검색한 다음 해당 리포지토리를 선택합니다. 이제 리포지토리가 Copilot app에 추가됩니다.

## 워크스페이스 살펴보기

프로젝트를 연결했으므로 잠시 워크스페이스의 구성을 살펴봅니다. 앱의 사이드바는 몇 가지 영역으로 구성됩니다.

- **Sessions** — 에이전트가 작업하는 곳입니다. 각 세션은 격리된 워크스페이스에서 실행되므로 변경 내용이 충돌하지 않게 여러 세션을 동시에 실행할 수 있습니다. 다음 레슨에서 첫 번째 세션을 시작합니다.
- **Quick chats** — 별도의 브랜치나 워크스페이스가 필요하지 않은 질문과 브레인스토밍을 위한 가벼운 대화입니다. 이 레슨의 마지막에서 사용해 봅니다.
- **My work** — 앱의 **GitHub 기본 통합**을 통해 이슈와 끌어오기 요청을 표시합니다. 앱을 벗어나지 않고 이슈와 끌어오기 요청을 찾아 필터링하고, CI 상태를 확인하고, 이슈에서 세션을 시작하고, 끌어오기 요청을 검토할 수 있습니다.
- **Automations** — 일정에 따라 또는 요청 시 실행되는 저장된 에이전트 작업입니다. 이 실습 과정의 끝부분에서 하나를 만듭니다.

### 미리 생성된 백로그 찾기

앱은 GitHub와 기본적으로 통합되므로 리포지토리에서 대기 중인 작업을 앱 안에서 바로 볼 수 있습니다. 템플릿에서 리포지토리를 만들 때 이슈 백로그가 생성되었습니다. 백로그가 있는지 확인합니다.

1. 사이드바에서 **My work**를 선택합니다.
2. 템플릿은 백로그에 여덟 개의 이슈를 생성했습니다. 이 하네스에서는 다음 세 이슈에 집중합니다. 표시되는지 확인합니다.

   - Allow users to filter games by category and publisher
   - Update our repository coding standards
   - Implement pagination on the game list page

3. 이슈를 선택하여 세부 정보를 읽습니다. 각 이슈는 에이전트 세션을 시작하는 지점이기도 합니다. 이 실습 과정의 뒷부분에서 이 이슈를 바탕으로 작업을 시작합니다.

> [!NOTE]
> My work의 항목 목록은 Copilot app에 추가한 리포지토리의 항목만 표시하도록 자동으로 필터링됩니다. 다른 리포지토리의 작업 항목을 보려면 해당 리포지토리를 앱에 추가합니다.

## 빠른 채팅 사용해 보기

앱에 익숙해지는 좋은 방법은 앱을 사용하여 *앱 자체*에 관해 알아보는 것입니다. 이때 **빠른 채팅**이 적합합니다. 빠른 채팅에서는 브랜치나 작업 트리를 만들지 않고 질문하거나 브레인스토밍할 수 있으므로, 세션이 필요 없는 일회성 질문에 알맞습니다.

1. 사이드바에서 **Quick chats** 옆의 **+**를 선택하여 새 채팅을 엽니다.
2. 앱의 세션이 어떻게 작동하는지 질문합니다.

   ```plaintext
   How does the GitHub Copilot app use worktrees?
   ```

3. 대화 보기에서 응답을 읽습니다. 각 세션이 격리된 git 작업 트리에서 실행되므로 변경 내용이 충돌하지 않게 여러 에이전트를 병렬로 실행할 수 있다는 점을 확인할 수 있습니다. 언제든지 대화를 계속하거나 새 채팅을 시작할 수 있습니다.

## 요약 및 다음 단계

GitHub Copilot app을 설치하고 프로젝트를 연결하고 워크스페이스를 살펴봤습니다. 다음 방법을 배웠습니다.

- 앱을 설치하고 GitHub에 로그인합니다.
- GitHub 리포지토리에서 프로젝트를 추가합니다.
- 워크스페이스를 살펴보고 **My work**에서 미리 생성된 백로그를 찾습니다.
- 빠른 채팅을 사용하여 일회성 질문을 합니다.

다음으로 첫 번째 에이전트 세션을 시작하고 프로젝트를 처음으로 변경하여 게임 카드에 별점을 표시합니다. [레슨 2 - 첫 번째 에이전트 세션 실행][next-lesson]을 계속 진행합니다.

## 리소스

- [GitHub Copilot app 정보][about-copilot-app]
- [GitHub Copilot app 시작하기][getting-started]
- [GitHub Copilot app에서 에이전트 세션 사용][agent-sessions]

[ex0]: /ko-kr/learning-hub/copilot-workshops/app/0-prerequisites/
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/2-add-star-rating/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app
[getting-started]: https://docs.github.com/copilot/how-tos/github-copilot-app/getting-started
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[download-app]: https://gh.io/app