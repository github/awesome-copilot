---
title: "레슨 9 - 작업 사이클을 신뢰하게 된 뒤 위임하기"
description: "새 Space Quiz 기능을 /delegate에 맡기고, 실행되는 동안 계속 작업하고, CLI에서 클라우드 세션을 확인합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

기능 하나를 출시했습니다. 이제 좋은 결과가 어떤 모습인지 알게 되었으므로, 완전히 새로운 아이디어를 직접 지켜보며 진행하기보다 다른 작업과 나란히 실행해 볼 만합니다. 이 레슨에서는 완료한 퀴즈 결과를 플레이어가 게시할 수 있는 카드로 바꾸는 **공유 가능한 미션 보고서** 구현을 위임합니다.

이 레슨에서는 다음 작업을 수행합니다.

- `/delegate`로 새 기능을 위임합니다.
- 위임한 작업이 실행되는 동안 기본 세션에서 계속 작업합니다.
- 위임한 결과를 수락하기 전에 비교합니다.

> [!NOTE]
> `/delegate`와 클라우드 세션에는 이용 자격이 있는 유료 Copilot 플랜이 필요합니다. Business와 Enterprise의 액세스도 관리자가 활성화해야 할 수 있습니다.

## 새 기능 위임

`/delegate`를 실행하고 다음 작업을 맡깁니다.

```plaintext
Delegate this: add a shareable mission report to the space quiz. At the end of a run, generate a compact summary card with the score, a rank title based on the percentage, and the slowest question. Add a Copy result button that puts a short plain-text version on the clipboard. Keep it in the single index.html with no dependencies, keep it keyboard accessible, and report back with what changed.
```

1. 위임한 작업이 실행되는 동안 기본 세션에서 계속 작업합니다.
2. 위임한 결과를 수락하기 전에 현재 세션의 결과와 비교합니다.
3. 규모가 더 크고 요구 사항이 명확한 이슈라면 **클라우드 세션**을 시작하고 CLI에서 진행 상황을 확인합니다.

## 요약 및 다음 단계

하나의 완전한 기능을 위임하고 결과를 검토했습니다. [레슨 10: 복습 및 다음 단계][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/10-review/
