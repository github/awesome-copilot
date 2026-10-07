---
title: "선택 사항: Foundry 통합"
description: "Microsoft Foundry Canvas로 카탈로그에 근거한 Backer Concierge를 구축하고, 각 단계에서 안전하게 작업을 마치는 방법을 알아봅니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev: { link: /ko-kr/learning-hub/copilot-workshops/app/10-review/, label: 검토 및 다음 단계 }
next:
  link: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
  label: 프로젝트와 모델 준비
tags:
  - workshop
---

이 선택 실습 과정에서는 GitHub Copilot app의 Microsoft Foundry Canvas를 사용하여 Tailspin Toys에 **Backer Concierge**를 추가합니다. 카탈로그에 근거한 모델 실험으로 시작하여 호스팅 에이전트를 구축한 다음 로컬 웹사이트에 통합합니다.

## 실습 과정

각 모듈은 체크포인트와 안전하게 작업을 마칠 수 있는 지점으로 끝납니다. 전체 과정에서 동일한 Tailspin Toys 리포지토리, 워크트리(Worktree) 브랜치, 이슈에 연결된 세션, Foundry 프로젝트, 모델 배포를 계속 사용합니다.

- [프로젝트와 모델 준비][module-1]에서는 카탈로그 정보의 범위를 정하고, 프로젝트와 모델 배포를 만든 다음 Canvas에서 확인합니다.
- [에이전트 빌드 및 배포][module-2]에서는 Backer Concierge의 기본 구조를 생성하고 로컬에서 테스트한 다음, 호스팅 에이전트를 배포하고 다시 테스트합니다.
- [에이전트를 사이트에 연결][module-3]에서는 자격 증명을 안전하게 보호하는 로컬 프록시, 접근성을 갖춘 채팅 위젯, 엔드투엔드(End-to-end) 테스트를 추가합니다.

> [!IMPORTANT]
> Microsoft Foundry Canvas와 호스팅 에이전트는 공개 미리 보기 상태입니다.
>
> 이 과정에서는 모델 배포와 모듈 2부터 사용하는 호스팅 에이전트 등 요금이 발생하는 Azure 리소스를 만듭니다. 리소스를 만들기 전에 구독, 지역, 할당량, 예상 비용을 승인해야 합니다. 프로젝트와 모델까지만 준비하고 중단하더라도 리소스를 정리해야 합니다.

1. [프로젝트와 모델 준비][module-1]부터 시작합니다. 이 워크숍 콘텐츠 리포지토리가 아니라 Tailspin Toys 리포지토리에서 작업합니다.
2. 핵심 워크숍을 마치려면 [검토 및 다음 단계][core-review]로 이동합니다.

## 리소스 정리

어느 체크포인트에서 실험을 마치든 원치 않는 비용을 방지하려면 Azure 리소스를 삭제합니다. 정리하면 이후 모듈에 필요한 리소스도 삭제되므로 나중에 계속하려면 다시 만들어야 합니다.

> [!WARNING]
> `rg-tailspin-toys`가 이 실습 전용이고 유지해야 하는 리소스를 포함하지 않는 경우에만 삭제합니다. 공유 리소스 그룹을 삭제하면 관련 없는 리소스도 삭제됩니다.
>
> 모듈 1에서 다른 리소스 그룹 이름을 승인했다면 아래 모든 명령에서 `rg-tailspin-toys`를 해당 이름으로 바꿉니다.

1. 시작한 로컬 Agent Inspector, Azure Function 또는 Astro 개발 서버를 각각의 터미널에서 중지합니다.
2. 모듈 2 또는 3에서 호스팅 에이전트를 배포했다면 동일한 Tailspin Toys 워크트리에서 터미널을 열고 같은 `azd` 환경을 사용하여 다음 명령을 실행합니다.

   ```bash
   azd down --purge
   ```

3. 선택된 구독과 워크숍 리소스 그룹이 아직 존재하는지 확인합니다.

   ```bash
   az account show --output table
   az group exists --name rg-tailspin-toys
   ```

   명령이 `false`를 반환하면 정리가 완료된 것입니다. `true`를 반환하면 그룹의 리소스를 검사합니다.

   ```bash
   az resource list --resource-group rg-tailspin-toys --output table
   ```

   남아 있는 모든 리소스가 이 실습에 속하는지 확인합니다. 모듈 1 이후에 중단했다면 `azd` 서비스를 배포하지 않았더라도 Foundry 프로젝트와 모델을 정리해야 합니다.
4. 전용 워크숍 리소스 그룹이 남아 있고 삭제할 리소스만 포함되어 있다면 다음 명령을 실행합니다.

   ```bash
   az group delete --name rg-tailspin-toys --yes --no-wait
   ```

5. `--no-wait` 명령은 삭제가 완료되기 전에 반환되므로 다음 명령이 `false`를 반환할 때까지 다시 실행합니다.

   ```bash
   az group exists --name rg-tailspin-toys
   ```

## 리소스

Microsoft 문서에서는 Canvas, 호스팅 배포, 관련 권한을 설명합니다.

- [Microsoft Foundry Canvas란?][foundry-canvas]
- [Foundry Canvas로 첫 번째 호스팅 에이전트 배포][hosted-agent-quickstart]
- [호스팅 에이전트 권한][hosted-agent-permissions]

[module-1]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[module-2]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[module-3]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/3-connect-to-site/
[core-review]: /ko-kr/learning-hub/copilot-workshops/app/10-review/
[foundry-canvas]: https://learn.microsoft.com/azure/foundry/agents/concepts/foundry-canvas
[hosted-agent-quickstart]: https://learn.microsoft.com/azure/foundry/agents/quickstarts/quickstart-hosted-agent?pivots=canvas
[hosted-agent-permissions]: https://learn.microsoft.com/azure/foundry/agents/concepts/hosted-agent-permissions
