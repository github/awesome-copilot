---
title: "프로젝트와 모델 준비"
description: "Tailspin 카탈로그를 내보내고, Foundry 프로젝트와 모델 배포를 만든 다음 Canvas에서 검증합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/
  label: "선택 사항: Foundry 통합"
next:
  link: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: 에이전트 빌드 및 배포
---

첫 번째 모듈에서는 Backer Concierge에 필요한 데이터와 Azure 리소스를 준비합니다. 아직 에이전트 코드나 호스팅 배포는 필요하지 않습니다.

이 모듈을 마치면 다음을 갖추게 됩니다.

- 그라운딩(Grounding)에 사용할 수 있는 정보의 한계를 명시한 카탈로그 내보내기 파일
- 기능 요구 사항에 맞게 선택한 Foundry 프로젝트와 모델 배포
- Canvas에서 검증한 배포와 카탈로그 범위 내에서 수행한 간단한 모델 스모크 테스트(Smoke test) 결과

## 시나리오

Tailspin Toys 후원자는 카테고리와 퍼블리셔로 게임을 필터링할 수 있지만, *Git 말장난을 좋아하는 사람에게는 어떤 게임이 어울립니까?* 같은 질문에는 드롭다운만으로 답할 수 없습니다. Backer Concierge는 Tailspin 카탈로그에 있는 게임만 추천해야 하며 게임, 퍼블리셔, 평점, 펀딩 총액, 후원자 수, 가격, 플레이어 수, 플레이 시간, 출시일을 지어내서는 안 됩니다. 신뢰할 수 있는 카탈로그와 적합한 모델이 이러한 답변의 기반이 됩니다.

## 도구와 이슈 세션 준비

모든 기능 작업을 한곳에서 진행할 수 있도록 GitHub Copilot app을 Azure에 연결합니다.

1. Azure 구독이 있는지 확인합니다. 구독이 필요하다면 [$200 크레딧이 제공되는 무료 Azure 구독][azure-free] 또는 [$100 크레딧이 제공되는 Azure for Students][azure-students]를 사용할 수 있습니다.
2. 운영 체제에 맞는 [Azure CLI][install-azure-cli]를 설치한 다음 `az version`으로 설치를 확인합니다.
3. [Azure Developer CLI][install-azd]를 설치한 다음 `azd version`으로 1.27.1 이상 버전이 설치되었는지 확인합니다.
4. GitHub Copilot app에서 **Customize**를 연 다음 **Plugins**를 선택합니다. `microsoft-foundry`를 검색하고 Canvas와 Foundry 스킬이 포함된 Microsoft Foundry 플러그인의 **Install**을 선택합니다.

   ![Microsoft Foundry 플러그인 설치](/images/learning-hub/copilot-workshops/app-8-install-foundry-plugin.png)

5. **Customize**에서 **Plugins**를 선택하고 `azure`를 검색하거나 **Featured** 목록에서 선택한 다음, Azure 플러그인의 **Install**을 선택합니다.
6. 사이드바에서 **Issues**를 선택한 다음 Tailspin Toys 리포지토리의 **Add a Backer Concierge assistant for catalog questions** 이슈를 찾아 엽니다. **New session**을 선택하여 새 워크트리(Worktree)에서 이슈에 연결된 세션을 시작합니다. 세 모듈 모두에서 이 리포지토리, 워크트리 브랜치, 이슈 세션을 유지합니다.
7. `/microsoft-foundry`를 입력한 다음 `/azure`를 입력하여 두 스킬이 모두 설치되어 사용할 수 있는지 확인합니다. 아직 프롬프트를 보내지는 않습니다. 플러그인이 바로 나타나지 않으면 앱을 다시 시작하고 동일한 이슈 세션으로 돌아와 다시 확인합니다.

## 카탈로그 내보내기 파일 생성

샘플 리포지토리에는 에이전트가 읽을 수 있는 파일을 생성하는 내보내기 스크립트가 포함되어 있습니다.

8. 이슈에 연결된 이 워크트리 세션의 프롬프트 상자에서 기본 `/fix-issue` 프롬프트를 다음으로 바꿉니다.

   ```plaintext
   Install the project dependencies, seed the database, then run the existing db:export script. Show me the command output and summarize the shape and grounding limits of db/catalog.json.
   ```

9. 명령 출력을 검토합니다. Copilot은 다음과 같은 명령을 실행해야 합니다.

   ```bash
   npm install
   npm run db:setup
   npm run db:export
   ```

   ![카탈로그 내보내기 파일 생성](/images/learning-hub/copilot-workshops/app-8-generate-catalog-export.png)

10. `db/catalog.json`을 열고 제목, 설명, 카테고리, 퍼블리셔, 별점을 포함한 게임 21개가 있는지 확인합니다. `note` 필드를 확인합니다. 카탈로그에는 펀딩 총액, 후원자 수, 후원 등급, 출시일이 없습니다. 가격, 플레이어 수, 플레이 시간도 누락되어 있다면 외부 지식으로 채우지 말고 제공되지 않는 정보로 취급합니다. 내보내기가 실패하거나 내용이 다르면 계속하기 전에 Copilot에 원인을 조사하고 다시 실행하도록 요청합니다.

   ![Copilot app에서 연 카탈로그 내보내기 파일](/images/learning-hub/copilot-workshops/app-8-view-catalog.png)

## Foundry 프로젝트와 모델 설정

먼저 채팅에서 프로젝트와 배포를 만들면 Canvas는 이미 존재하는 리소스에만 연결합니다.

11. **+**를 선택하고 **Terminal**을 선택한 다음 Azure에 로그인합니다.

    ```bash
    az login
    ```

12. 선택한 구독을 확인하고 해당 리소스 그룹을 나열합니다.

    ```bash
    az account show --output table
    az group list --output table
    ```

    구독이 올바르지 않다면 `az account set --subscription <subscription-id>`를 실행한 다음 두 명령을 다시 실행합니다.

    `rg-tailspin-toys`가 표시되면 해당 리소스를 검사합니다.

    ```bash
    az resource list --resource-group rg-tailspin-toys --output table
    ```

    관련 없는 리소스나 공유 리소스가 포함되어 있다면 중단하고 전용 이름을 정한 후에 다음 프롬프트를 사용합니다. 이후 모든 프롬프트와 명령의 예시 이름을 승인한 이름으로 바꿉니다.
13. 동일한 이슈 세션에서 다음을 입력합니다.

    ```plaintext
    Use the Microsoft Foundry skill to create a resource group named rg-tailspin-toys and a Foundry project named tailspin-toys.
    ```

    ![Foundry 프로젝트 생성](/images/learning-hub/copilot-workshops/app-8-foundry-project-created.png)

14. Copilot에 모델을 추천하도록 요청합니다. 이슈에서 시작한 세션이므로 이슈의 승인 기준이 이미 컨텍스트에 포함되어 있습니다.

    ```plaintext
    Use the Microsoft Foundry skill to recommend two or three current chat models in the tailspin-toys project that meet this issue's acceptance criteria. Explain the tradeoffs and wait for me to choose.
    ```

15. Copilot이 `microsoft-foundry` 스킬을 로드하는지 확인한 다음, 장단점을 고려하여 사용 가능한 모델을 선택합니다. Microsoft Foundry 호스팅 에이전트 빠른 시작에서는 현재 `gpt-5.4-mini`를 사용하지만, 가용성과 할당량은 지역에 따라 다릅니다.

    ![모델 선택](/images/learning-hub/copilot-workshops/app-8-select-model.png)

16. Copilot에 선택한 모델을 배포하도록 요청하고, 승인하기 전에 대상 프로젝트와 비용을 검토합니다.

    ```plaintext
    Deploy the model I selected to the tailspin-toys Foundry project, using the model name as the deployment name.
    ```

> [!TIP]
> 모델 가용성은 시간이 지나면서 달라집니다. 이 모듈에 고정된 모델보다는 Copilot이 프로젝트에서 사용할 수 있다고 확인한 모델을 선택하는 것이 적절합니다.

## Canvas에서 모델 검증 및 스모크 테스트

에이전트 코드를 작성하기 전에 프로젝트와 모델을 확인합니다. 모델 스모크 테스트는 모듈 2의 호스팅 에이전트 그라운딩 테스트를 대체하지 않습니다.

17. **+**, **Canvas**, **Microsoft Foundry (Preview)**를 차례로 선택합니다.
18. Canvas 오른쪽 위의 **More options** 메뉴를 연 다음 **Sign in**을 선택합니다.
19. **tailspin-toys** Foundry 프로젝트를 선택합니다. **Models**를 펼치고 배포가 예상한 이름과 상태로 표시되는지 확인합니다.

    ![Canvas에서 프로젝트와 모델 검증](/images/learning-hub/copilot-workshops/app-8-validate-project-model.png)

20. 동일한 세션에 다음 프롬프트를 입력합니다.

    ```plaintext
    Microsoft Foundry 스킬을 사용하여 에이전트를 만들지 않고 tailspin-toys 프로젝트에 배포한 모델을 직접 테스트합니다. @db/catalog.json의 콘텐츠를 근거로 "버그를 추적하는 퍼즐 게임을 좋아합니다. 어떤 게임을 후원해야 하며, 얼마나 많은 자금을 모았나요?"라고 질문합니다. 응답과 사용한 토큰 수, 응답 시간 등의 유용한 메타데이터를 확인할 수 있는 경우에만 표시합니다. 기존 Azure 로그인을 사용합니다. 자격 증명을 표시하거나 파일을 변경하거나 리소스를 만들지 않습니다.
    ```

21. 응답을 검토합니다. `db/catalog.json`에 실제로 있는 게임만 추천하고 올바른 제목, 퍼블리셔, 평점을 사용하며 자금 조달 정보가 없다고 설명해야 합니다. 모델이 게임, 카탈로그 세부 정보 또는 자금 조달 금액을 지어내면 계속하기 전에 다른 추천 모델과 비교합니다.

> [!NOTE]
> Canvas는 다시 열어도 선택한 프로젝트를 기억합니다. Canvas의 단계는 기본 구조를 생성하는 **Create new hosted agents**, 모델, 도구 상자, 스킬, 가드레일(Guardrail)을 연결하는 **Build current hosted agent**, 로컬 실행과 Microsoft Foundry 배포를 수행하는 **Deploy and test**로 구성됩니다.

## 체크포인트 및 다음 단계

Azure 도구를 준비하고 카탈로그를 내보낸 다음 배포된 모델이 Backer Concierge의 그라운딩 규칙을 따르는지 테스트했습니다. 이 모듈의 체크포인트는 누락된 정보를 지어내지 않고 실제 카탈로그 게임을 추천하는 모델입니다.

다음에는 동일한 Tailspin Toys 리포지토리, 워크트리 브랜치, 이슈에 연결된 세션, Foundry 프로젝트, 선택한 모델 배포를 사용하여 [에이전트를 빌드하고 배포합니다][next-module]. 여기서 중단한다면 지속적인 비용을 방지하도록 [Azure 리소스를 정리합니다][cleanup].

[azure-free]: https://azure.microsoft.com/pricing/purchase-options/azure-account
[azure-students]: https://azure.microsoft.com/free/students
[install-azure-cli]: https://learn.microsoft.com/cli/azure/install-azure-cli
[install-azd]: https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd
[next-module]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[cleanup]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/#%EB%A6%AC%EC%86%8C%EC%8A%A4-%EC%A0%95%EB%A6%AC
