---
title: "Lesson 0 - 필수 조건"
description: "Tailspin Toys 프로젝트에 필요한 Node.js를 설치하고 템플릿에서 리포지토리 복사본을 만들어 GitHub Copilot app 레슨을 준비합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

GitHub Copilot app은 Copilot과 GitHub를 모두 사용하는 중앙 허브 역할을 하는 데스크톱 앱입니다. 이 앱에서 이슈와 끌어오기 요청에 빠르게 접근하고 GitHub Copilot을 사용해 빌드할 수 있습니다. 이 워크숍에서는 Astro로 구축된 Tailspin Toys 앱과 GitHub Copilot app을 모두 로컬에서 사용합니다. 시작하기 전에 Node.js가 로컬에 설치되어 있는지 확인한 다음 Copilot app을 설치합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 프로젝트 테스트를 컴퓨터에서 실행할 수 있도록 Node.js를 설치합니다.
- 템플릿에서 Tailspin Toys 프로젝트의 복사본을 만듭니다.

## Node.js 설치

여러 레슨에서 에이전트에게 기능을 구축하고 Tailspin Toys 테스트 도구 모음을 로컬에서 실행하도록 요청합니다. 이 작업에는 프로젝트에 필요한 유일한 런타임인 [**Node.js**][nodejs]가 필요합니다. **22 이상** 버전을 설치합니다. 현재 **LTS** 릴리스가 안전한 선택입니다.

모든 플랫폼에서 가장 간단한 방법은 공식 설치 프로그램을 사용하는 것입니다.

1. 운영 체제에서 Windows Terminal, macOS 터미널 또는 평소 사용하는 도구로 터미널 창을 엽니다.
2. 다음 명령을 실행하여 Node.js 22 이상이 설치되어 있는지 확인합니다.

    ```shell
    node --version
    ```

3. `v22` 이상의 숫자가 표시되면 다음 섹션으로 건너뛸 수 있습니다.

> [!TIP]
> Node가 설치되어 있지 않거나 업데이트해야 하는 경우에만 다음 단계를 수행하면 됩니다.

4. [Node.js 다운로드 페이지][node-download]를 엽니다.
5. 운영 체제에 맞는 **LTS** 빌드를 다운로드합니다.
6. 설치 프로그램을 실행하고 기본값을 적용합니다. Windows에서는 **Add to PATH** 옵션을 선택한 상태로 유지합니다.
7. 설치가 끝나면 새 터미널 창을 엽니다.
8. 새 터미널 창에서 다음 명령을 실행하여 설치를 확인합니다.

    ```bash
    node --version
    ```

9. `v22.x.x` 이상이 표시되어야 합니다.

> [!TIP]
> 컨테이너를 선호합니까? [**Docker**][docker]가 있다면 Node.js를 로컬에 설치하는 대신 리포지토리의 [dev container][dev-containers]를 사용할 수 있습니다. 이 컨테이너에는 Node가 포함되어 있으므로 두 가지가 모두 필요하지는 않습니다.

## 실습 리포지토리 설정

Tailspin Toys 프로젝트의 복사본에서 작업합니다. 지금 [템플릿 리포지토리][template-repository]에서 복사본을 만듭니다. 새 리포지토리에는 실습에 필요한 모든 파일이 들어 있으며, 다음 레슨에서 앱에 연결합니다.

1. 새 브라우저 창에서 이 실습의 GitHub 리포지토리인 `https://github.com/github-samples/tailspin-toys`로 이동합니다.
2. 실습 리포지토리 페이지에서 **Use this template** 버튼을 선택한 다음 **Create a new repository**를 선택하여 리포지토리 복사본을 만듭니다.

    ![드롭다운에서 Create a new repository가 선택된 Use this template 버튼](/images/learning-hub/copilot-workshops/app-0-use-template.png)

3. GitHub 또는 Microsoft가 진행하는 이벤트에서 워크숍을 수행하는 경우 멘토가 제공한 지침을 따릅니다. 그렇지 않으면 GitHub Copilot에 접근할 수 있는 조직에 새 리포지토리를 만들 수 있습니다.

    ![github-samples/tailspin-toys가 템플릿으로 설정되고 리포지토리 이름이 입력된 Create a new repository 양식](/images/learning-hub/copilot-workshops/app-0-create-repository.png)

4. 이 실습에서 나중에 참조할 수 있도록 만든 리포지토리 경로(**organization-or-user-name/repository-name**)를 기록합니다.

> [!NOTE]
> 템플릿에서 리포지토리를 만들면 GitHub 이슈 백로그가 자동으로 생성됩니다. 워크숍 전체에서 이 이슈를 사용하므로 직접 등록할 항목은 없습니다.

## 요약 및 다음 단계

설정이 완료되었습니다. 프로젝트를 컴퓨터에서 빌드하고 테스트할 수 있도록 Node.js를 설치하고, 템플릿에서 Tailspin Toys 리포지토리의 복사본을 만들었습니다.

다음으로 GitHub Copilot app을 설치하고, 방금 만든 리포지토리를 연결하고, 워크스페이스를 살펴봅니다. [레슨 1 - GitHub Copilot app 설치][next-lesson]를 계속 진행합니다.

## 리소스

- [Node.js 다운로드][node-download]
- [템플릿에서 리포지토리 만들기][template-repository]
- [GitHub Copilot app 정보][about-copilot-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/1-install-copilot-app/
[nodejs]: https://nodejs.org/
[node-download]: https://nodejs.org/en/download
[docker]: https://www.docker.com/products/docker-desktop/
[dev-containers]: https://code.visualstudio.com/docs/devcontainers/containers
[template-repository]: https://docs.github.com/repositories/creating-and-managing-repositories/creating-a-template-repository
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app