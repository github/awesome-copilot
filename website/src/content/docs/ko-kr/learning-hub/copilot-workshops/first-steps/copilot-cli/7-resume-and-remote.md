---
title: "레슨 7 - 세션 재개 및 원격 이용"
description: "Copilot CLI 세션을 나갔다가 나중에 copilot --resume 또는 /resume으로 돌아오고, 선택적으로 /remote로 다른 기기에서 확인합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

대화나 워크스페이스 컨텍스트를 잃지 않고 세션을 일시 중지할 수 있습니다. 세션을 나갔다가 나중에 돌아오고, 필요하다면 다른 기기에서도 이용할 수 있게 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 세션을 종료하고 터미널에서 재개합니다.
- CLI를 벗어나지 않고 세션 사이를 전환합니다.
- 선택적으로 세션을 원격으로 이용할 수 있게 합니다.

## 세션을 나갔다가 나중에 돌아오기

1. 다른 작업으로 전환할 준비가 되면 현재 Copilot CLI 세션을 종료합니다.
2. 터미널에서 `copilot --resume`을 실행하여 이전 세션을 선택합니다.
3. Copilot CLI 안에서 `/resume`을 사용하여 CLI를 벗어나지 않고 세션 사이를 전환합니다.
4. 복원된 세션에 예상한 파일, 이슈 컨텍스트, 모델이 그대로 있는지 확인합니다.

## 선택 사항: 원격으로 세션 이어가기

`/remote`를 실행하여 *동일한 세션*을 로컬에서 계속 실행하면서 웹과 GitHub Copilot mobile app에서도 이용할 수 있게 합니다. 컴퓨터를 켜 두어야 합니다. 반환된 링크를 브라우저에서 열거나 GitHub Copilot mobile app에서 세션에 액세스합니다.

> [!NOTE]
> `/remote`는 위임하는 기능이 아니며 실행을 클라우드로 옮기지 않습니다. 이 워크숍의 필수 과정이 아니므로 로컬 작업 사이클에 익숙해진 뒤 시도합니다.

## 요약 및 다음 단계

세션을 일시 중지하고 재개하며, 다른 기기에서 로컬 세션을 확인할 수 있습니다. [레슨 8: CLI에서 생성, 검토, 병합][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/8-pull-request/
